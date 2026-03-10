import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveClinicId } from '@/lib/auth-server';
import * as appointmentRepo from '@/repositories/appointment.repository';
import * as appointmentService from '@/services/appointment.service';
import * as leadRepository from '@/repositories/lead.repository';
import { getClinicSettings } from '@/repositories/settings.repository';
import type { AppointmentType } from '@/types/appointments';
import type { ScheduleAppointmentParams, SchedulingConfig } from '@/services/appointment.service';

/** GET /api/appointments?month=MM&year=YYYY&clinic_id=UUID (optional, for SUPER_ADMIN) */
export async function GET(req: NextRequest) {
  try {
    const clinicId = await getEffectiveClinicId(req);
    if (!clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') ?? '');
    const year  = parseInt(searchParams.get('year')  ?? '');

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Valid month (1-12) and year are required' },
        { status: 400 },
      );
    }

    const { data, error } = await appointmentRepo.getAppointmentsByMonth(
      clinicId,
      year,
      month,
    );
    if (error) {
      console.error('GET /api/appointments error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 },
      );
    }
    const list = data ?? [];
    const needLead = list.filter((a) => !a.lead_id && a.patient_name?.trim());
    if (needLead.length > 0) {
      const { data: clinicLeads } = await leadRepository.getLeadsByClinicId(clinicId);
      const leads = clinicLeads ?? [];
      const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
      for (const apt of needLead) {
        const aptName = norm(apt.patient_name!);
        const lead = leads.find((l) => norm(l.full_name ?? '') === aptName);
        if (lead) (apt as { lead_id?: string | null }).lead_id = lead.id;
      }
    }
    return NextResponse.json({ appointments: list });
  } catch (err) {
    console.error('GET /api/appointments unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 },
    );
  }
}

/** POST /api/appointments – schedule a new appointment. */
export async function POST(req: NextRequest) {
  try {
    const clinicId = await getEffectiveClinicId(req);
    if (!clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const {
      patient_name,
      datetime: datetimeRaw,
      type,
      lead_id,
      email,
      phone,
    } = body as { patient_name?: string; datetime?: string; type?: AppointmentType; lead_id?: string | null; email?: string | null; phone?: string | null };

    if (!patient_name || !datetimeRaw) {
      return NextResponse.json(
        { error: 'patient_name and datetime are required' },
        { status: 400 },
      );
    }

    // Upsert lead before scheduling so appointment gets a lead_id
    let resolvedLeadId = lead_id ?? undefined;
    if (!resolvedLeadId) {
      // 1. Try email/phone lookup
      const { data: leadByContact } = await leadRepository.getLeadByEmailOrPhone(
        clinicId, email ?? null, phone ?? null,
      );
      if (leadByContact) {
        resolvedLeadId = leadByContact.id;
      } else {
        // 2. Fall back to name lookup
        const { data: leadByName } = await leadRepository.getLeadByClinicAndName(clinicId, patient_name);
        if (leadByName) {
          resolvedLeadId = leadByName.id;
        }
      }
      // 3. Create new lead if still not found
      if (!resolvedLeadId) {
        const { data: newLead, error: leadErr } = await leadRepository.createLead({
          clinic_id: clinicId,
          full_name:  patient_name.trim(),
          phone:      phone ?? null,
          email:      email ?? null,
          status:     'Pending',
          source:     'calendar',
        });
        if (leadErr) console.error('[Appointments] Lead creation failed:', leadErr);
        else if (newLead) {
          resolvedLeadId = newLead.id;
          console.log('[Appointments] New lead created:', resolvedLeadId);
        }
      }
    }

    const appointmentType: AppointmentType =
      type === 'follow_up' ? 'follow_up' : 'new';

    // Load clinic settings so opening hours match "שעות פעילות" in dashboard
    let config: SchedulingConfig | undefined;
    const { data: settings } = await getClinicSettings(clinicId);
    if (settings?.working_hours?.length) {
      const trimmed = datetimeRaw.trim();
      const reqDate = /[Zz]$|[+-]\d{2}:\d{2}$/.test(trimmed) ? new Date(trimmed) : new Date(trimmed + '+02:00');
      const israelDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(reqDate);
      const israelDay = new Date(israelDateStr + 'T12:00:00+02:00').getUTCDay();
      const dayConfig = settings.working_hours.find((d) => d.day === israelDay);
      const openH = dayConfig ? parseInt(dayConfig.open.split(':')[0] ?? '8', 10) : 8;
      const closeH = dayConfig ? parseInt(dayConfig.close.split(':')[0] ?? '16', 10) : 16;
      config = {
        openHour: dayConfig?.enabled ? openH : 0,
        closeHour: dayConfig?.enabled ? closeH : 0,
        slotMinutes: settings.slot_minutes ?? 30,
        bufferMinutes: settings.buffer_minutes ?? 0,
        maxPerDay: settings.max_appointments_per_day ?? null,
        minBookingNoticeHours: settings.min_booking_notice_hours ?? 0,
      };
    }

    const params: ScheduleAppointmentParams = {
      clinicId,
      patientName:            patient_name,
      requestedDatetimeRaw:   datetimeRaw,
      type:                   appointmentType,
      leadId:                 resolvedLeadId ?? undefined,
      config,
    };
    const result = await appointmentService.scheduleAppointment(params);

    if (result.status === 'confirmed') {
      // Update lead with appointment details
      if (resolvedLeadId) {
        await leadRepository.updateLead(resolvedLeadId, clinicId, {
          status:            'Pending',
          last_contact_date: new Date().toISOString(),
          next_appointment:  result.appointment.datetime,
        });
        console.log('[Appointments] Lead linked to appointment:', resolvedLeadId);
      }
      return NextResponse.json(
        { status: 'confirmed', appointment: result.appointment },
        { status: 201 },
      );
    }
    if (result.status === 'unavailable') {
      const msg = result.suggestions?.length
        ? `המועד תפוס. נסה: ${result.suggestions.slice(0, 3).join(', ')}`
        : 'המועד תפוס';
      return NextResponse.json(
        { status: 'unavailable', error: msg, suggestions: result.suggestions },
        { status: 409 },
      );
    }
    if (result.status === 'outside_hours') {
      const message = `העסק פתוח ${result.openHour}:00–${result.closeHour}:00`;
      return NextResponse.json(
        {
          status: 'outside_hours',
          message,
          error: message,
        },
        { status: 422 },
      );
    }
    if (result.status === 'follow_up_too_soon') {
      const message = result.earliestAllowed
        ? `תור מעקב אפשרי מ-${result.earliestAllowed}`
        : 'תור מעקב מוקדם מדי';
      return NextResponse.json(
        {
          status: 'follow_up_too_soon',
          error: message,
          earliestAllowed: result.earliestAllowed,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ error: 'Unexpected result' }, { status: 500 });
  } catch (err) {
    console.error('POST /api/appointments unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/appointments?id=UUID — deletes the appointment and, if it had a lead_id, the associated lead. */
export async function DELETE(req: NextRequest) {
  try {
    const clinicId = await getEffectiveClinicId(req);
    if (!clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: deleted, error } = await appointmentRepo.deleteAppointment(id, clinicId);
    if (error) {
      console.error('DELETE /api/appointments error:', error);
      return NextResponse.json(
        { error: 'Failed to delete appointment' },
        { status: 500 },
      );
    }
    if (deleted?.lead_id) {
      const { error: leadErr } = await leadRepository.deleteLead(deleted.lead_id, clinicId);
      if (leadErr) {
        console.error('DELETE /api/appointments: lead delete failed:', leadErr);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/appointments unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
