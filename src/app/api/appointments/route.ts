import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import * as appointmentRepo from '@/repositories/appointment.repository';
import * as appointmentService from '@/services/appointment.service';
import type { AppointmentType } from '@/types/appointments';

async function getClinicIdFromSession(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (user.app_metadata as { clinic_id?: string } | null)?.clinic_id ?? null;
}

/** GET /api/appointments?month=MM&year=YYYY */
export async function GET(req: NextRequest) {
  try {
    const clinicId = await getClinicIdFromSession();
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
    return NextResponse.json({ appointments: data ?? [] });
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
    const clinicId = await getClinicIdFromSession();
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
    } = body as { patient_name?: string; datetime?: string; type?: AppointmentType };

    if (!patient_name || !datetimeRaw) {
      return NextResponse.json(
        { error: 'patient_name and datetime are required' },
        { status: 400 },
      );
    }

    const appointmentType: AppointmentType =
      type === 'follow_up' ? 'follow_up' : 'new';

    const result = await appointmentService.scheduleAppointment({
      clinicId,
      patientName:            patient_name,
      requestedDatetimeRaw:   datetimeRaw,
      type:                   appointmentType,
    });

    if (result.status === 'confirmed') {
      return NextResponse.json(
        { status: 'confirmed', appointment: result.appointment },
        { status: 201 },
      );
    }
    if (result.status === 'unavailable') {
      return NextResponse.json(
        { status: 'unavailable', suggestions: result.suggestions },
        { status: 409 },
      );
    }
    if (result.status === 'outside_hours') {
      return NextResponse.json(
        {
          status: 'outside_hours',
          message: `Clinic is open ${result.openHour}:00–${result.closeHour}:00`,
        },
        { status: 422 },
      );
    }
    if (result.status === 'follow_up_too_soon') {
      return NextResponse.json(
        {
          status: 'follow_up_too_soon',
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

/** DELETE /api/appointments?id=UUID */
export async function DELETE(req: NextRequest) {
  try {
    const clinicId = await getClinicIdFromSession();
    if (!clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await appointmentRepo.deleteAppointment(id, clinicId);
    if (error) {
      console.error('DELETE /api/appointments error:', error);
      return NextResponse.json(
        { error: 'Failed to delete appointment' },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/appointments unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
