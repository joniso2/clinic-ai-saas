import { runStructuredPrompt } from '@/ai/ai-client';
import * as leadRepository from '@/repositories/lead.repository';
import * as appointmentService from '@/services/appointment.service';
import { computeIntelligenceTimestamps } from '@/services/intelligence.service';
import { getClinicSettings } from '@/services/settings.service';
import { buildDiscordSystemPrompt } from '@/prompts/discord.prompt';
import {
  getClinicIdByGuildId,
  getClinicServicesForClinic,
  buildPricingBlock,
  estimateDealValueFromServices,
  getClinicName,
} from '@/services/discord-guild.service';
import type { AppointmentType } from '@/types/appointments';
import type { WorkingHoursDay } from '@/repositories/settings.repository';
import logger from '@/lib/logger';

const DISCORD_GUILD_UNMAPPED_REPLY = 'אנא פנה לשרת הרשמי של העסק לצורך המשך טיפול.';

const DEFAULT_OPEN_TIME  = '08:00';
const DEFAULT_CLOSE_TIME = '16:00';

/** Hour (0–23) in Israel time for a given Date. */
function getIsraelHour(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-IL', { timeZone: 'Asia/Jerusalem', hour: 'numeric', hour12: false }).format(date),
    10,
  );
}

/** Minute (0–59) in Israel time. */
function getIsraelMinute(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-IL', { timeZone: 'Asia/Jerusalem', minute: '2-digit' }).format(date),
    10,
  );
}

/** Day of week (0 = Sunday … 6 = Saturday) in Israel time. */
function getIsraelDayOfWeek(date: Date): number {
  const long = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'long' }).format(date);
  const days: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  return days[long] ?? 0;
}

/**
 * Check if a date/time falls within clinic business hours.
 * Uses clinic working_hours for the requested day (Israel time).
 * Returns { within, openTime, closeTime, dayClosed } for the message when outside hours.
 * dayClosed = true when the clinic is closed the entire day (e.g. Saturday disabled).
 */
function isWithinBusinessHours(
  date: Date,
  workingHours: WorkingHoursDay[],
): { within: boolean; openTime: string; closeTime: string; dayClosed?: boolean } {
  const dayIndex = getIsraelDayOfWeek(date);
  const dayConfig = workingHours.find((w) => w.day === dayIndex);

  if (!dayConfig) {
    const apptMins = getIsraelHour(date) * 60 + getIsraelMinute(date);
    const openMins = 8 * 60;
    const closeMins = 16 * 60;
    const within = apptMins >= openMins && apptMins < closeMins;
    return { within, openTime: DEFAULT_OPEN_TIME, closeTime: DEFAULT_CLOSE_TIME };
  }

  if (!dayConfig.enabled) {
    return { within: false, openTime: dayConfig.open, closeTime: dayConfig.close, dayClosed: true };
  }

  const [openH, openM] = dayConfig.open.split(':').map(Number);
  const [closeH, closeM] = dayConfig.close.split(':').map(Number);
  const openMins  = openH * 60 + (openM || 0);
  const closeMins = closeH * 60 + (closeM || 0);
  const apptMins  = getIsraelHour(date) * 60 + getIsraelMinute(date);
  const within = apptMins >= openMins && apptMins < closeMins;
  return { within, openTime: dayConfig.open, closeTime: dayConfig.close };
}

function calculatePriorityLevel(urgency_level: string | null | undefined): 'low' | 'medium' | 'high' {
  if (urgency_level === 'high') return 'high';
  if (urgency_level === 'medium') return 'medium';
  return 'low';
}

export type ProcessDiscordMessageResult = {
  reply: string | null;
  /** Model used for this reply (from ai_models); can be shown in Discord. */
  modelUsed?: string;
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
  message_id?: string;
  content: string;
  authorName?: string;
  channelName?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  guildId?: string | null;
}): Promise<ProcessDiscordMessageResult> {
  const serviceStartedAt = Date.now();
  let openai_duration_ms = 0;
  let dbStartedAt: number | null = null;

  const { content, authorName, channelName, conversationHistory, guildId, message_id: messageId } = params;
  const history = conversationHistory ?? [];

  const clinicId = await getClinicIdByGuildId(guildId ?? null);
  if (!clinicId) {
    const total_service_duration_ms = Date.now() - serviceStartedAt;
    const db_duration_ms = 0;
    logger.info('ai_pipeline_completed', {
      clinic_id: clinicId ?? null,
      message_id: messageId,
      openai_duration_ms,
      db_duration_ms,
      total_service_duration_ms,
      service: 'lead.service',
    });
    return { reply: DISCORD_GUILD_UNMAPPED_REPLY };
  }

  const [settings, services, clinicName] = await Promise.all([
    getClinicSettings(clinicId).catch(() => null),
    getClinicServicesForClinic(clinicId),
    getClinicName(clinicId),
  ]);
  const pricesText = buildPricingBlock(services);

  const requirePhoneForBooking      = settings?.require_phone_before_booking      ?? true;
  const autoCreateOnFirstMessage    = settings?.auto_create_lead_on_first_message ?? false;
  const autoMarkContacted           = settings?.auto_mark_contacted               ?? false;

  const systemPrompt = buildDiscordSystemPrompt({
    ai_tone:                  settings?.ai_tone                  ?? 'professional',
    ai_response_length:       settings?.ai_response_length       ?? 'standard',
    strict_hours_enforcement: settings?.strict_hours_enforcement ?? true,
    business_description:     settings?.business_description     ?? null,
    industry_type:            settings?.industry_type            ?? 'general_business',
    conversation_strategy:    settings?.conversation_strategy    ?? 'consultative',
    custom_prompt_override:   settings?.custom_prompt_override   ?? null,
    pricesText,
    clinicName,
  });

  // Scheduling config derived from settings
  const schedulingConfig: appointmentService.SchedulingConfig = {
    slotMinutes:           settings?.slot_minutes              ?? 30,
    bufferMinutes:         settings?.buffer_minutes            ?? 0,
    maxPerDay:             settings?.max_appointments_per_day  ?? null,
    minBookingNoticeHours: settings?.min_booking_notice_hours  ?? 0,
    maxSuggestionDays:     settings?.max_booking_window_days   ?? 14,
  };

  const openaiStartedAt = Date.now();
  let analysis: Awaited<ReturnType<typeof runStructuredPrompt>>;
  try {
    analysis = await runStructuredPrompt({
      text: content,
      authorName,
      channelName,
      conversationHistory: history,
      systemPrompt,
      clinicId,
    });
  } catch (err) {
    openai_duration_ms = Date.now() - openaiStartedAt;
    await leadRepository.createLead({
      clinic_id:            clinicId,
      full_name:            authorName ?? 'Unknown',
      phone:                null,
      email:                null,
      source:               'discord_ai_failure',
      status:               'AI Failed',
      conversation_summary: content,
    });
    logger.error('ai_failed_lead_captured', {
      clinic_id:  clinicId,
      message_id: messageId,
      error:      (err as Error)?.message,
      service:    'lead.service',
    });
    return { reply: 'תודה על פנייתך, נציג יחזור אליך בהקדם.' };
  }
  openai_duration_ms = Date.now() - openaiStartedAt;

  const logPipelineAndReturn = (reply: string | null, modelUsed?: string): ProcessDiscordMessageResult => {
    const total_service_duration_ms = Date.now() - serviceStartedAt;
    const db_duration_ms = dbStartedAt !== null ? Date.now() - dbStartedAt : 0;
    logger.info('ai_pipeline_completed', {
      clinic_id: clinicId ?? null,
      message_id: messageId,
      openai_duration_ms,
      db_duration_ms,
      total_service_duration_ms,
      service: 'lead.service',
    });
    return { reply, modelUsed: modelUsed ?? analysis.modelUsed };
  };

  const priority_level = calculatePriorityLevel(analysis.urgency_level);
  const estimated_deal_value = estimateDealValueFromServices(analysis.interest, services);

  const intel = computeIntelligenceTimestamps({
    urgency_level: analysis.urgency_level ?? null,
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
      // Always prefer the AI's reply — it already knows what step to ask for.
      // Only fall back to hardcoded strings if AI reply is empty or PENDING_SCHEDULE.
      if (analysis.reply && analysis.reply !== 'PENDING_SCHEDULE' && analysis.reply.trim().length > 0) {
        return logPipelineAndReturn(analysis.reply);
      }
      // Fallback: enforce the correct missing field
      if (requirePhoneForBooking && !hasPhone) {
        return logPipelineAndReturn('אשמח לעזור! כדי לקבוע את התור אצטרך את מספר הטלפון שלך.');
      }
      if (!patientName) {
        return logPipelineAndReturn('מה שמך המלא?');
      }
      return logPipelineAndReturn('באיזה תאריך ושעה תרצה לקבוע?');
    }

    // If no datetime — check if patient wants earliest slot or needs to choose
    let resolvedDatetimeRaw = datetimeRaw;
    if (!resolvedDatetimeRaw) {
      // PENDING_SCHEDULE: suggest closest slot and ask for confirmation — do NOT book yet
      if (analysis.reply === 'PENDING_SCHEDULE' && clinicId) {
        console.log('[Discord] PENDING_SCHEDULE — suggesting closest slot (no auto-book)');
        const now = new Date();
        const suggestions = await appointmentService.suggestClosestAvailable(clinicId, now, 1, schedulingConfig);
        if (suggestions.length > 0) {
          const closestSlot = suggestions[0];
          const formattedTime = appointmentService.formatAppointmentTime(closestSlot);
          return logPipelineAndReturn(
            `התור הפנוי הקרוב ביותר שיש לנו הוא ${formattedTime}. תרצה שאשריין לך את התור הזה?`,
          );
        }
        return logPipelineAndReturn(
          'בדקתי ביומן ולצערי לא מצאתי תורים פנויים בזמן הקרוב. תרצה שאבדוק לתאריכים רחוקים יותר?',
        );
      }
      // Patient hasn't specified — let the AI reply guide them to choose a date
      return logPipelineAndReturn(analysis.reply ?? 'באיזה תאריך ושעה תרצה לקבוע?');
    }

    if (!clinicId) {
      return logPipelineAndReturn(DISCORD_GUILD_UNMAPPED_REPLY);
    }

    // ── Server-side validation: past date/time (do not trust AI) ─────────────────
    const appointmentDate = new Date(resolvedDatetimeRaw);
    if (appointmentDate < new Date()) {
      console.log('[Discord] Appointment in the past — rejecting before schedule');
      return logPipelineAndReturn('נראה שהשעה שבחרת כבר עברה. באיזה יום ושעה יהיה לך נוח להגיע?');
    }

    // ── Server-side business hours validation (do not trust AI) ─────────────────
    const workingHours = settings?.working_hours ?? [];
    const hoursCheck = isWithinBusinessHours(appointmentDate, workingHours);
    if (!hoursCheck.within) {
      console.log('[Discord] Appointment outside business hours — rejecting before schedule');
      if (hoursCheck.dayClosed) {
        return logPipelineAndReturn('העסק סגור ביום זה. באיזה יום אחר יהיה לך נוח להגיע?');
      }
      return logPipelineAndReturn(
        `אנחנו פתוחים בין ${hoursCheck.openTime} ל-${hoursCheck.closeTime}. באיזו שעה יהיה לך נוח להגיע?`,
      );
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
      if (dbStartedAt === null) dbStartedAt = Date.now();
      const { data: newLead, error: createErr } = await leadRepository.createLead({
        clinic_id:                clinicId,
        full_name:                patientName.trim(),
        phone:                    analysis.phone ?? null,
        email:                    analysis.email ?? null,
        interest:                 analysis.interest ?? null,
        status:                   'Pending',
        source:                   'discord',
        conversation_summary:     analysis.conversation_summary ?? null,
        urgency_level:            analysis.urgency_level ?? null,
        priority_level:           priority_level,
        sla_deadline:             intel.sla_deadline,
        follow_up_recommended_at: intel.follow_up_recommended_at,
        callback_recommendation:  analysis.callback_recommendation ?? null,
        estimated_deal_value:     estimated_deal_value,
      });
      if (createErr) {
        const errObj = createErr as { code?: string; message?: string; details?: string };
        console.error('[Discord] Lead creation for appointment failed:', errObj?.message ?? createErr, '| code:', errObj?.code, '| details:', errObj?.details);
        logger.error('lead_creation_failed', { clinic_id: clinicId, error: errObj?.message ?? String(createErr), code: errObj?.code, service: 'lead.service' });
      } else if (newLead) {
        leadId = newLead.id;
        console.log('[Discord] New lead created:', leadId);
      }
    }

    if (dbStartedAt === null) dbStartedAt = Date.now();
    const result = await appointmentService.scheduleAppointment({
      clinicId,
      patientName,
      requestedDatetimeRaw: resolvedDatetimeRaw,
      type: appointmentType,
      leadId: leadId ?? undefined,
      config: schedulingConfig,
    });

    if (result.status === 'confirmed') {
      logger.info('booking_created', {
        message_id: messageId,
        clinic_id: clinicId,
        lead_id: leadId ?? null,
        appointment_datetime: result.appointment.datetime,
        service: 'lead.service',
      });
      // Update existing lead with appointment details
      if (existingLead) {
        const { error: updateErr } = await leadRepository.updateLead(existingLead.id, clinicId, {
          status:            'Pending',
          last_contact_date: new Date().toISOString(),
          next_appointment:  result.appointment.datetime,
        });
        if (updateErr) console.error('[Discord] Failed to update existing lead:', updateErr);
      } else if (leadId) {
        const { error: updateErr } = await leadRepository.updateLead(leadId, clinicId, {
          status:            'Pending',
          last_contact_date: new Date().toISOString(),
          next_appointment:  result.appointment.datetime,
        });
        if (updateErr) console.error('[Discord] Failed to update new lead:', updateErr);
      }
      const time = appointmentService.formatAppointmentTime(result.appointment.datetime);
      return logPipelineAndReturn(`מעולה! ${patientName}, קבענו לך תור ל${time}. נתראה!`);
    }

    if (result.status === 'unavailable') {
      if (result.suggestions.length === 0) {
        return logPipelineAndReturn(`השעה המבוקשת תפוסה ולא מצאנו חלופות קרובות. פנה אלינו ישירות לתיאום.`);
      }
      const opts = result.suggestions
        .slice(0, 2)
        .map(appointmentService.formatAppointmentTime)
        .join(' או ');
      return logPipelineAndReturn(`השעה המבוקשת תפוסה. אני יכול להציע: ${opts}. מה מתאים לך?`);
    }

    if (result.status === 'create_failed') {
      if (result.suggestions.length > 0) {
        const opts = result.suggestions
          .slice(0, 2)
          .map(appointmentService.formatAppointmentTime)
          .join(' או ');
        return logPipelineAndReturn(`אירעה שגיאה בזמן הקביעה. נסה את הזמנים האלה: ${opts}. מה מתאים לך?`);
      }
      return logPipelineAndReturn(`אירעה שגיאה בזמן הקביעה. נסה שוב או פנה אלינו ישירות לתיאום.`);
    }

    if (result.status === 'outside_hours') {
      return logPipelineAndReturn(
        `שעות הפעילות הן ${result.openHour}:00–${result.closeHour}:00. באיזו שעה תרצה לקבוע?`,
      );
    }

    if (result.status === 'follow_up_too_soon') {
      const earliest = appointmentService.formatAppointmentTime(result.earliestAllowed);
      return logPipelineAndReturn(
        `ביקור המשך צריך להיות לפחות 7 ימים אחרי הביקור הקודם. המועד המוקדם ביותר הוא ${earliest}.`,
      );
    }
  }

  // ── LEAD INTENT ─────────────────────────────────────────────────────────────
  // Allow creation without phone only if auto_create_lead_on_first_message is enabled.
  // When user sends only phone (e.g. "0528502722"), AI may leave full_name null — use Discord author as fallback.
  const effectiveFullName = (analysis.full_name?.trim() || authorName?.trim() || '').trim() || null;
  const canCreateLead = analysis.is_new_lead && effectiveFullName && clinicId &&
    (hasPhone || autoCreateOnFirstMessage);

  if (canCreateLead) {
    console.log('[Discord] Creating lead:', effectiveFullName, '| clinic_id:', clinicId);
    if (dbStartedAt === null) dbStartedAt = Date.now();
    const { data, error } = await leadRepository.createLead({
      clinic_id:                clinicId,
      full_name:                effectiveFullName,
      phone:                    analysis.phone ?? null,
      email:                    analysis.email ?? null,
      interest:                 analysis.interest ?? null,
      status:                   autoMarkContacted ? 'Contacted' : 'Pending',
      source:                   'discord',
      conversation_summary:     analysis.conversation_summary ?? null,
      urgency_level:            analysis.urgency_level ?? null,
      priority_level:           priority_level,
      sla_deadline:             intel.sla_deadline,
      follow_up_recommended_at: intel.follow_up_recommended_at,
      callback_recommendation:  analysis.callback_recommendation ?? null,
      estimated_deal_value:     estimated_deal_value,
    });
    if (error) console.error('[Discord] Lead creation failed:', error);
    else if (data) console.log('[Discord] Lead created successfully.');
  }

  const reply = (analysis.reply && analysis.reply.trim()) ? analysis.reply.trim() : null;
  return logPipelineAndReturn(reply ?? 'מצטערים, לא הצלחתי להבין. נסה לשאול שוב או ליצור קשר ישירות.');
}
