import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import * as appointmentRepo from '@/repositories/appointment.repository';

async function getClinicIdFromSession(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single();
  return data?.clinic_id ?? null;
}

/** PATCH /api/appointments/[id] — update datetime and/or duration_minutes */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const clinicId = await getClinicIdFromSession();
    if (!clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { datetime, duration_minutes, status } = body as {
      datetime?: string;
      duration_minutes?: number;
      status?: 'scheduled' | 'completed' | 'cancelled';
    };

    if (datetime === undefined && duration_minutes === undefined && status === undefined) {
      return NextResponse.json(
        { error: 'At least one of datetime, duration_minutes, or status is required' },
        { status: 400 },
      );
    }

    const updates: { datetime?: string; duration_minutes?: number; status?: string } = {};
    if (datetime !== undefined) updates.datetime = datetime;
    if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
    if (status !== undefined) updates.status = status;

    const { data, error } = await appointmentRepo.updateAppointment(id, clinicId, updates);
    if (error) {
      console.error('PATCH /api/appointments/[id] error:', error);
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }

    return NextResponse.json({ appointment: data });
  } catch (err) {
    console.error('PATCH /api/appointments/[id] unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
