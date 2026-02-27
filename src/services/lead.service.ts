import { runStructuredPrompt } from '@/ai/ai-client';
import * as leadRepository from '@/repositories/lead.repository';
import * as appointmentService from '@/services/appointment.service';
import { computeIntelligenceTimestamps } from '@/services/intelligence.service';
import type { AppointmentType } from '@/types/appointments';

export type ProcessDiscordMessageResult = {
  reply: string | null;
};

/**
 * Entry point for every Discord message.
 * Routes to AppointmentService (booking) or lead creation based on AI intent.
 *
 * Hard rules enforced at logic level (regardless of AI output):
 *   1. Phone is mandatory — no lead or appointment without it.
 *   2. First message cannot trigger an appointment — at least one prior exchange required.
 */
export async function processDiscordMessage(params: {
  content: string;
  authorName?: string;
  channelName?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<ProcessDiscordMessageResult> {
  const { content, authorName, channelName, conversationHistory } = params;
  const history = conversationHistory ?? [];

  const analysis = await runStructuredPrompt({
    text: content,
    authorName,
    channelName,
    conversationHistory: history,
  });

  const intel = computeIntelligenceTimestamps({
    urgency_level:      analysis.urgency_level ?? null,
    lead_quality_score: analysis.lead_quality_score ?? null,
  });

  const clinicId = process.env.DISCORD_DEFAULT_CLINIC_ID;

  // Hard rule: phone is mandatory for any lead or appointment action
  const hasPhone = typeof analysis.phone === 'string' && analysis.phone.trim().length > 0;

  // Hard rule: is_new_lead cannot be true without a phone number
  if (analysis.is_new_lead && !hasPhone) {
    analysis.is_new_lead = false;
  }

  // Hard rule: first message cannot book an appointment (no prior exchange)
  const isFirstMessage = history.length === 0;

  // ── APPOINTMENT INTENT ──────────────────────────────────────────────────────
  if (analysis.intent === 'appointment') {
    console.log('[Discord] Appointment intent — datetime:', analysis.appointment_datetime, '| name:', analysis.appointment_patient_name, '| phone:', analysis.phone, '| type:', analysis.appointment_type);
    const datetimeRaw     = analysis.appointment_datetime;
    const patientName     = analysis.appointment_patient_name ?? authorName ?? null;
    const appointmentType = (analysis.appointment_type ?? 'new') as AppointmentType;

    // Block appointment if phone missing, first message, or incomplete details
    if (!hasPhone || isFirstMessage || !datetimeRaw || !patientName) {
      console.log('[Discord] Appointment blocked — phone:', hasPhone, '| firstMessage:', isFirstMessage, '| datetime:', datetimeRaw, '| name:', patientName);
      const safeReply =
        analysis.reply && analysis.reply !== 'PENDING_SCHEDULE'
          ? analysis.reply
          : !hasPhone
            ? 'אשמח לעזור! כדי לקבוע את התור אצטרך את מספר הטלפון שלך.'
            : !patientName
              ? 'מה שמך המלא?'
              : 'באיזה תאריך ושעה תרצה לקבוע?';
      return { reply: safeReply };
    }

    if (!clinicId) {
      console.error('[Discord] DISCORD_DEFAULT_CLINIC_ID is not set.');
      return { reply: 'מצטערים, לא ניתן לקבוע תור כרגע. פנה אלינו ישירות.' };
    }

    // ── Upsert lead by email/phone first, then fall back to name ────────────────
    let leadId: string | undefined;
    let existingLead: Awaited<ReturnType<typeof leadRepository.getLeadByEmailOrPhone>>['data'] = null;

    // 1. Try email or phone lookup
    const { data: leadByContact } = await leadRepository.getLeadByEmailOrPhone(
      clinicId,
      analysis.email ?? null,
      analysis.phone ?? null,
    );

    if (leadByContact) {
      existingLead = leadByContact;
      leadId = leadByContact.id;
      console.log('[Discord] Existing lead found by contact:', leadId);
    } else {
      // 2. Fall back to name lookup
      const { data: leadByName } = await leadRepository.getLeadByClinicAndName(clinicId, patientName);
      if (leadByName) {
        existingLead = leadByName;
        leadId = leadByName.id;
        console.log('[Discord] Existing lead found by name:', leadId);
      }
    }

    // 3. Create new lead if none found
    if (!leadId) {
      const { data: newLead, error: createErr } = await leadRepository.createLead({
        clinic_id:                clinicId,
        full_name:                patientName.trim(),
        phone:                    analysis.phone ?? null,
        email:                    analysis.email ?? null,
        interest:                 analysis.interest ?? null,
        status:                   'Appointment scheduled',
        source:                   'discord',
        conversation_summary:     analysis.conversation_summary     ?? null,
        lead_quality_score:       analysis.lead_quality_score       ?? null,
        urgency_level:            analysis.urgency_level            ?? null,
        priority_level:           analysis.priority_level           ?? null,
        sla_deadline:             intel.sla_deadline,
        follow_up_recommended_at: intel.follow_up_recommended_at,
        callback_recommendation:  analysis.callback_recommendation  ?? null,
      });
      if (createErr) {
        console.error('[Discord] Lead creation for appointment failed:', createErr);
      } else if (newLead) {
        leadId = newLead.id;
        console.log('[Discord] New lead created:', leadId);
      }
    }

    const result = await appointmentService.scheduleAppointment({
      clinicId,
      patientName,
      requestedDatetimeRaw: datetimeRaw,
      type: appointmentType,
      leadId: leadId ?? undefined,
    });

    if (result.status === 'confirmed') {
      // Update existing lead with appointment details
      if (existingLead) {
        await leadRepository.updateLead(existingLead.id, clinicId, {
          status:            'Appointment scheduled',
          last_contact_date: new Date().toISOString(),
          next_appointment:  result.appointment.datetime,
        });
        console.log('[Discord] Lead updated with appointment:', existingLead.id);
      } else if (leadId) {
        // Newly created lead — set last_contact_date and next_appointment
        await leadRepository.updateLead(leadId, clinicId, {
          last_contact_date: new Date().toISOString(),
          next_appointment:  result.appointment.datetime,
        });
        console.log('[Discord] New lead linked to appointment:', leadId);
      }
      console.log('[Discord] Appointment linked to lead_id:', leadId ?? 'none');
      const time = appointmentService.formatAppointmentTime(result.appointment.datetime);
      return { reply: `מעולה! ${patientName}, קבענו לך תור ל${time}. נתראה בקליניקה!` };
    }

    if (result.status === 'unavailable') {
      if (result.suggestions.length === 0) {
        return { reply: `השעה המבוקשת תפוסה ולא מצאנו חלופות קרובות. פנה אלינו ישירות לתיאום.` };
      }
      const opts = result.suggestions
        .slice(0, 2)
        .map(appointmentService.formatAppointmentTime)
        .join(' או ');
      return { reply: `השעה המבוקשת תפוסה. אני יכול להציע: ${opts}. מה מתאים לך?` };
    }

    if (result.status === 'outside_hours') {
      return {
        reply: `שעות הקליניקה הן ${result.openHour}:00–${result.closeHour}:00. באיזו שעה תרצה לקבוע?`,
      };
    }

    if (result.status === 'follow_up_too_soon') {
      const earliest = appointmentService.formatAppointmentTime(result.earliestAllowed);
      return {
        reply: `ביקור המשך צריך להיות לפחות 7 ימים אחרי הביקור הקודם. המועד המוקדם ביותר הוא ${earliest}.`,
      };
    }
  }

  // ── LEAD INTENT ─────────────────────────────────────────────────────────────
  // Hard rule: phone is mandatory — no lead without it
  if (analysis.is_new_lead && analysis.full_name && hasPhone && clinicId) {
    console.log('[Discord] Creating lead:', analysis.full_name, '| clinic_id:', clinicId);
    const { data, error } = await leadRepository.createLead({
      clinic_id:                clinicId,
      full_name:                analysis.full_name,
      phone:                    analysis.phone ?? null,
      email:                    analysis.email ?? null,
      interest:                 analysis.interest ?? null,
      status:                   'New',
      conversation_summary:     analysis.conversation_summary     ?? null,
      lead_quality_score:       analysis.lead_quality_score       ?? null,
      urgency_level:            analysis.urgency_level            ?? null,
      priority_level:           analysis.priority_level           ?? null,
      sla_deadline:             intel.sla_deadline,
      follow_up_recommended_at: intel.follow_up_recommended_at,
      callback_recommendation:  analysis.callback_recommendation  ?? null,
    });
    if (error) console.error('[Discord] Lead creation failed:', error);
    else if (data) console.log('[Discord] Lead created successfully.');
  }

  return { reply: analysis.reply ?? null };
}
