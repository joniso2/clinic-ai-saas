import { NextRequest, NextResponse } from 'next/server';
import * as leadRepository from '@/repositories/lead.repository';
import * as appointmentRepository from '@/repositories/appointment.repository';
import { createClient } from '@/lib/supabase-server';

async function getClinicIdFromSession(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (user.app_metadata as { clinic_id?: string } | null)?.clinic_id ?? null;
}

/** Build ISO datetime for 09:00 Israel time on the given date (YYYY-MM-DD). */
function toIsraelNineAm(dateStr: string): string {
  return `${dateStr}T09:00:00+02:00`;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinicId = await getClinicIdFromSession();
  if (!clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: leadId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as Partial<{
    full_name: string;
    phone: string;
    email: string;
    interest: string;
    status: string;
    next_follow_up_date: string | null;
  }>;

  const hasFollowUpChange = 'next_follow_up_date' in data;

  if (hasFollowUpChange) {
    const { data: lead, error: leadErr } = await leadRepository.getLeadById(leadId, clinicId);
    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    const patientName = data.full_name ?? lead.full_name ?? 'Unknown';
    const { error: delErr } = await appointmentRepository.deleteAppointmentsByLeadId(leadId, clinicId);
    if (delErr) {
      console.error('Error deleting lead follow-up appointments:', delErr);
    }
    if (data.next_follow_up_date) {
      const datetime = toIsraelNineAm(data.next_follow_up_date);
      const { error: createErr } = await appointmentRepository.createAppointment({
        clinic_id: clinicId,
        patient_name: patientName,
        datetime,
        type: 'follow_up',
        lead_id: leadId,
      });
      if (createErr) {
        console.error('Error creating follow-up appointment:', createErr);
      }
    }
  }

  const { error } = await leadRepository.updateLead(leadId, clinicId, data);
  if (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinicId = await getClinicIdFromSession();
  if (!clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await appointmentRepository.deleteAppointmentsByLeadId(id, clinicId);
  const { error } = await leadRepository.deleteLead(id, clinicId);
  if (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
