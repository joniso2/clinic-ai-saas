import { runStructuredPrompt } from '@/ai/ai-client';
import * as leadRepository from '@/repositories/lead.repository';
import * as appointmentService from '@/services/appointment.service';
import { computeIntelligenceTimestamps } from '@/services/intelligence.service';
import { getClinicSettings } from '@/services/settings.service';
import { buildDiscordSystemPrompt } from '@/prompts/discord.prompt';
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

  const clinicId = process.env.DISCORD_DEFAULT_CLINIC_ID;

  // ── Fetch clinic settings (non-blocking; fall back to defaults on failure) ──
  const settings = clinicId ? await getClinicSettings(clinicId).catch(() => null) : null;

  // Automation flags (from settings, with safe defaults)
  const requirePhoneForBooking      = settings?.require_phone_before_booking      ?? true;
  const autoCreateOnFirstMessage    = settings?.auto_create_lead_on_first_message ?? false;
  const autoMarkContacted           = settings?.auto_mark_contacted               ?? false;

  // Build a prompt that reflects current AI behavior settings
  const systemPrompt = buildDiscordSystemPrompt({
    ai_tone:                 settings?.ai_tone                 ?? 'professional',
    ai_response_length:      settings?.ai_response_length      ?? 'standard',
    strict_hours_enforcement: settings?.strict_hours_enforcement ?? true,
    business_description:    settings?.business_description    ?? null,
  });

  // Scheduling config derived from settings
  const schedulingConfig: appointmentService.SchedulingConfig = {
    slotMinutes:           settings?.slot_minutes              ?? 30,
    bufferMinutes:         settings?.buffer_minutes            ?? 0,
    maxPerDay:             settings?.max_appointments_per_day  ?? null,
    minBookingNoticeHours: settings?.min_booking_notice_hours  ?? 0,
    maxSuggestionDays:     settings?.max_booking_window_days   ?? 14,
  };

  const analysis = await runStructuredPrompt({
    text: content,
    authorName,
    channelName,
    conversationHistory: history,
    systemPrompt,
  });

  const intel = computeIntelligenceTimestamps({
    urgency_level:      analysis.urgency_level ?? null,
    lead_quality_score: analysis.lead_quality_score ?? null,
  });

  // Override SLA with clinic-configured target if set
  if (settings?.sla_target_minutes && settings.sla_target_minutes !== 60) {
    intel.sla_deadline = new Date(Date.now() + settings.sla_target_minutes * 60_000).toISOString();
  }

  // Hard rule: phone is mandatory for booking (unless setting disabled)
  const hasPhone = typeof analysis.phone === 'string' && analysis.phone.trim().length > 0;

  // Hard rule: is_new_lead cannot be true without phone (unless auto_create_lead_on_first_message)
  if (analysis.is_new_lead && !hasPhone && !autoCreateOnFirstMessage) {
    analysis.is_new_lead = false;
  }

  // Hard rule: first message cannot book an appointment (no prior exchange)
  const isFirstMessage = history.length === 0;

  // ── APPOINTMENT INTENT ──────────────────────────────────────────────────────
  if (analysis.intent === 'appointment') {
    // Fallback: if AI didn't extract name, use full_name or Discord username
    const patientName =
      analysis.appointment_patient_name ??
      analysis.full_name ??
      authorName ??
      null;

    console.log('[Discord] Appointment intent — datetime:', analysis.appointment_datetime, '| name:', patientName, '| phone:', analysis.phone, '| type:', analysis.appointment_type);
    const datetimeRaw = analysis.appointment_datetime;
    const appointmentType = (analysis.appointment_type ?? 'new') as AppointmentType;

    // Block appointment if phone missing (per setting), first message, or name missing
    if ((requirePhoneForBooking && !hasPhone) || isFirstMessage || !patientName) {
      console.log('[Discord] Appointment blocked — phone:', hasPhone, '| firstMessage:', isFirstMessage, '| name:', patientName);
      // Always enforce the correct missing field — never let AI override this order
      if (requirePhoneForBooking && !hasPhone) {
        return { reply: 'אשמח לעזור! כדי לקבוע את התור אצטרך את מספר הטלפון שלך.' };
      }
      if (!patientName) {
        return { reply: 'מה שמך המלא?' };
      }
      // isFirstMessage — let AI reply guide if available, otherwise ask for date
      if (analysis.reply && analysis.reply !== 'PENDING_SCHEDULE' && analysis.reply.trim().length > 0) {
        return { reply: analysis.reply };
      }
      return { reply: 'באיזה תאריך ושעה תרצה לקבוע?' };
    }

    // If no datetime — check if patient wants earliest slot or needs to choose
    let resolvedDatetimeRaw = datetimeRaw;
    if (!resolvedDatetimeRaw) {
      // Only auto-book if reply is PENDING_SCHEDULE (patient wants earliest/any slot)
      if (analysis.reply === 'PENDING_SCHEDULE' && clinicId) {
        console.log('[Discord] PENDING_SCHEDULE with no datetime — finding closest available slot');
        const now = new Date();
        const suggestions = await appointmentService.suggestClosestAvailable(clinicId, now, 1, schedulingConfig);
        if (suggestions.length > 0) {
          resolvedDatetimeRaw = suggestions[0];
          console.log('[Discord] Auto-selected slot:', resolvedDatetimeRaw);
        } else {
          return { reply: 'מצטערים, אין זמינות בשבועות הקרובים. פנה אלינו ישירות לתיאום.' };
        }
      } else {
        // Patient hasn't specified — let the AI reply guide them to choose a date
        return { reply: analysis.reply ?? 'באיזה תאריך ושעה תרצה לקבוע?' };
      }
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
        status:                   'Pending',
        source:                   'discord',
        conversation_summary:     analysis.conversation_summary     ?? null,
        lead_quality_score:       analysis.lead_quality_score       ?? null,
        urgency_level:            analysis.urgency_level            ?? null,
        priority_level:           analysis.priority_level           ?? null,
        sla_deadline:             intel.sla_deadline,
        follow_up_recommended_at: intel.follow_up_recommended_at,
        callback_recommendation:  analysis.callback_recommendation  ?? null,
        estimated_deal_value:     analysis.estimated_value          ?? null,
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
      requestedDatetimeRaw: resolvedDatetimeRaw,
      type: appointmentType,
      leadId: leadId ?? undefined,
      config: schedulingConfig,
    });

    if (result.status === 'confirmed') {
      // Update existing lead with appointment details
      if (existingLead) {
        const { error: updateErr } = await leadRepository.updateLead(existingLead.id, clinicId, {
          status:            'Pending',
          last_contact_date: new Date().toISOString(),
          next_appointment:  result.appointment.datetime,
        });
        if (updateErr) console.error('[Discord] Failed to update existing lead:', updateErr);
        else console.log('[Discord] Lead updated with appointment:', existingLead.id);
      } else if (leadId) {
        const { error: updateErr } = await leadRepository.updateLead(leadId, clinicId, {
          status:            'Pending',
          last_contact_date: new Date().toISOString(),
          next_appointment:  result.appointment.datetime,
        });
        if (updateErr) console.error('[Discord] Failed to update new lead:', updateErr);
        else console.log('[Discord] New lead linked to appointment:', leadId);
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
  // Allow creation without phone only if auto_create_lead_on_first_message is enabled
  const canCreateLead = analysis.is_new_lead && analysis.full_name && clinicId &&
    (hasPhone || autoCreateOnFirstMessage);

  if (canCreateLead) {
    console.log('[Discord] Creating lead:', analysis.full_name, '| clinic_id:', clinicId);
    const { data, error } = await leadRepository.createLead({
      clinic_id:                clinicId,
      full_name:                analysis.full_name!,
      phone:                    analysis.phone ?? null,
      email:                    analysis.email ?? null,
      interest:                 analysis.interest ?? null,
      status:                   autoMarkContacted ? 'Contacted' : 'Pending',
      source:                   'discord',
      conversation_summary:     analysis.conversation_summary     ?? null,
      lead_quality_score:       analysis.lead_quality_score       ?? null,
      urgency_level:            analysis.urgency_level            ?? null,
      priority_level:           analysis.priority_level           ?? null,
      sla_deadline:             intel.sla_deadline,
      follow_up_recommended_at: intel.follow_up_recommended_at,
      callback_recommendation:  analysis.callback_recommendation  ?? null,
      estimated_deal_value:     analysis.estimated_value          ?? null,
    });
    if (error) console.error('[Discord] Lead creation failed:', error);
    else if (data) console.log('[Discord] Lead created successfully.');
  }

  return { reply: analysis.reply ?? null };
}
