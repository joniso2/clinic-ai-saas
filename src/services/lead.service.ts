import { runStructuredPrompt } from '@/ai/ai-client';
import * as leadRepository from '@/repositories/lead.repository';
import * as appointmentService from '@/services/appointment.service';
import type { AppointmentType } from '@/types/appointments';

export type ProcessDiscordMessageResult = {
  reply: string | null;
};

/**
 * Entry point for every Discord message.
 * Routes to AppointmentService (booking) or lead creation based on AI intent.
 */
export async function processDiscordMessage(params: {
  content: string;
  authorName?: string;
  channelName?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<ProcessDiscordMessageResult> {
  const { content, authorName, channelName, conversationHistory } = params;

  const analysis = await runStructuredPrompt({
    text: content,
    authorName,
    channelName,
    conversationHistory: conversationHistory ?? [],
  });

  const clinicId = process.env.DISCORD_DEFAULT_CLINIC_ID;

  // ── APPOINTMENT INTENT ──────────────────────────────────────────────────────
  if (analysis.intent === 'appointment') {
    const datetimeRaw     = analysis.appointment_datetime;
    const patientName     = analysis.appointment_patient_name ?? authorName ?? null;
    const appointmentType = (analysis.appointment_type ?? 'new') as AppointmentType;

    if (!datetimeRaw || !patientName) {
      return { reply: analysis.reply ?? null };
    }

    if (!clinicId) {
      console.error('[Discord] DISCORD_DEFAULT_CLINIC_ID is not set.');
      return { reply: 'מצטערים, לא ניתן לקבוע תור כרגע. פנה אלינו ישירות.' };
    }

    // Find or create lead so the appointment appears on the Leads page
    let leadId: string | undefined;
    const { data: existingLead } = await leadRepository.getLeadByClinicAndName(clinicId, patientName);
    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead, error: createErr } = await leadRepository.createLead({
        clinic_id:  clinicId,
        full_name:  patientName.trim(),
        phone:      analysis.phone ?? null,
        email:      analysis.email ?? null,
        interest:   analysis.interest ?? null,
        status:     'Appointment scheduled',
      });
      if (createErr) console.error('[Discord] Lead creation for appointment failed:', createErr);
      else if (newLead) leadId = newLead.id;
    }

    const result = await appointmentService.scheduleAppointment({
      clinicId,
      patientName,
      requestedDatetimeRaw: datetimeRaw,
      type: appointmentType,
      leadId: leadId ?? undefined,
    });

    if (result.status === 'confirmed') {
      if (existingLead && existingLead.status !== 'Appointment scheduled') {
        await leadRepository.updateLead(existingLead.id, clinicId, { status: 'Appointment scheduled' });
      }
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
  if (analysis.is_new_lead && analysis.full_name && clinicId) {
    console.log('[Discord] Creating lead:', analysis.full_name, '| clinic_id:', clinicId);
    const { data, error } = await leadRepository.createLead({
      clinic_id: clinicId,
      full_name:  analysis.full_name,
      phone:      analysis.phone ?? null,
      email:      analysis.email ?? null,
      interest:   analysis.interest ?? null,
      status:     'New',
    });
    if (error) console.error('[Discord] Lead creation failed:', error);
    else if (data) console.log('[Discord] Lead created successfully.');
  }

  return { reply: analysis.reply ?? null };
}
