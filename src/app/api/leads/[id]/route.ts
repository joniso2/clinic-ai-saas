import { NextRequest, NextResponse } from 'next/server';
import * as leadRepository from '@/repositories/lead.repository';
import * as appointmentRepository from '@/repositories/appointment.repository';
import * as patientRepository from '@/repositories/patient.repository';
import { createClient } from '@/lib/supabase-server';
import { normalizePhone } from '@/lib/phone';

async function getClinicIdFromSession(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: clinicLink } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single();
  return clinicLink?.clinic_id ?? null;
}

/** Build ISO datetime for 09:00 Israel time on the given date (YYYY-MM-DD). */
function toIsraelNineAm(dateStr: string): string {
  return `${dateStr}T09:00:00+02:00`;
}

/** GET /api/leads/[id] – return single lead for calendar/drawer. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinicId = await getClinicIdFromSession();
  if (!clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: leadId } = await params;
  const { data: lead, error } = await leadRepository.getLeadById(leadId, clinicId);
  if (error || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }
  return NextResponse.json({ lead });
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
    estimated_deal_value: number | null;
    forceUpdate?: boolean;
    createNewAnyway?: boolean;
    service_name?: string | null;
    notes?: string | null;
  }>;

  if (data.status === 'Closed') {
    const value = data.estimated_deal_value ?? 0;
    if (typeof value !== 'number' || value <= 0) {
      return NextResponse.json(
        { error: 'לא ניתן לסגור ליד ללא שווי כספי' },
        { status: 400 },
      );
    }
  }

  let closeWarning: string | null = null;
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

  // When closing lead: create/update patient and completed appointment (CRM)
  // If patients table is missing, we still close the lead and return success with a warning.
  if (data.status === 'Closed') {
    const value = data.estimated_deal_value!;
    const { data: lead, error: leadErr } = await leadRepository.getLeadById(leadId, clinicId);
    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    const name = (data.full_name ?? lead.full_name ?? '').trim() || 'Unknown';
    const rawPhone = data.phone ?? lead.phone ?? '';
    const phoneNorm = normalizePhone(rawPhone);

    function isPatientsTableMissing(err: unknown): boolean {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: string }).message)
        : String(err);
      return /does not exist|schema cache|relation.*patients|table.*patients/i.test(msg);
    }

    const { data: existingPatientData } = await patientRepository.findPatientByNormalizedPhone(clinicId, phoneNorm);
    const existingPatient = existingPatientData;

    const forceUpdate = data.forceUpdate === true;
    const createNewAnyway = data.createNewAnyway === true;

    if (existingPatient && !forceUpdate && !createNewAnyway) {
      return NextResponse.json({
        ok: true,
        existingPatient: true,
        patient: { id: existingPatient.id, full_name: existingPatient.full_name, phone: existingPatient.phone },
      });
    }

    const nowIso = new Date().toISOString();
    let patientId: string | null = null;
    let patientCreated = false;

    if (existingPatient) {
      if (forceUpdate) {
        const { error: incErr } = await patientRepository.incrementPatientVisit(
          existingPatient.id,
          clinicId,
          value,
          nowIso,
        );
        if (incErr) {
          if (isPatientsTableMissing(incErr)) {
            patientCreated = false;
            closeWarning = 'טבלת הלקוחות לא קיימת. הליד נסגר בהצלחה. להצגת לקוחות הרץ את המיגרציה 011 ב-Supabase.';
          } else {
            console.error('Error incrementing patient visit:', incErr);
            return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
          }
        } else {
          patientId = existingPatient.id;
          patientCreated = true;
        }
      } else if (createNewAnyway) {
        const { data: newPatient, error: createErr } = await patientRepository.createPatient({
          clinic_id: clinicId,
          lead_id: leadId,
          full_name: name,
          phone: phoneNorm || rawPhone.trim() || `lead-${leadId}`,
          total_revenue: value,
          visits_count: 1,
          last_visit_date: nowIso,
        });
        if (createErr) {
          if (isPatientsTableMissing(createErr)) {
            patientCreated = false;
            closeWarning = 'טבלת הלקוחות לא קיימת. הליד נסגר בהצלחה. להצגת לקוחות הרץ את המיגרציה 011 ב-Supabase.';
          } else {
            console.error('Error creating patient:', createErr);
            const errObj = createErr as { message?: string; code?: string };
            const msg = errObj?.message ?? String(createErr);
            const userMsg = msg.includes('violates') || errObj?.code === '23503'
              ? 'שגיאת קישור למסד הנתונים. וודא שהמיגרציה 011 הורצה במלואה.'
              : msg;
            return NextResponse.json({ error: userMsg }, { status: 500 });
          }
        } else if (newPatient) {
          patientId = newPatient.id;
          patientCreated = true;
        }
      }
    } else {
      const { data: newPatient, error: createErr } = await patientRepository.createPatient({
        clinic_id: clinicId,
        lead_id: leadId,
        full_name: name,
        phone: phoneNorm || rawPhone.trim() || `lead-${leadId}`,
        total_revenue: value,
        visits_count: 1,
        last_visit_date: nowIso,
      });
      if (createErr) {
        if (isPatientsTableMissing(createErr)) {
          patientCreated = false;
          closeWarning = 'טבלת הלקוחות לא קיימת. הליד נסגר בהצלחה. להצגת לקוחות הרץ את המיגרציה 011 ב-Supabase.';
        } else {
          console.error('Error creating patient:', createErr);
          const errObj = createErr as { message?: string; code?: string };
          const msg = errObj?.message ?? String(createErr);
          const userMsg = msg.includes('violates') || errObj?.code === '23503'
            ? 'שגיאת קישור למסד הנתונים. וודא שהמיגרציה 011 הורצה במלואה.'
            : msg;
          return NextResponse.json({ error: userMsg }, { status: 500 });
        }
      } else if (newPatient) {
        patientId = newPatient.id;
        patientCreated = true;
      }
    }

    if (patientId && patientCreated) {
      const { error: aptErr } = await appointmentRepository.createAppointment({
        clinic_id: clinicId,
        patient_name: name,
        datetime: nowIso,
        type: 'new',
        lead_id: leadId,
        patient_id: patientId,
        status: 'completed',
        revenue: value,
        service_name: data.service_name ?? null,
        notes: data.notes ?? null,
      } as Parameters<typeof appointmentRepository.createAppointment>[0]);
      if (aptErr) {
        console.error('Error creating completed appointment:', aptErr);
        // Lead still gets updated below
      }
    }
    // If patientCreated === false (e.g. table missing), we still update the lead and return success with warning
  }

  const leadUpdatePayload: Record<string, unknown> = {};
  if (data.full_name !== undefined) leadUpdatePayload.full_name = data.full_name;
  if (data.phone !== undefined) leadUpdatePayload.phone = data.phone;
  if (data.email !== undefined) leadUpdatePayload.email = data.email;
  if (data.interest !== undefined) leadUpdatePayload.interest = data.interest;
  if (data.status !== undefined) leadUpdatePayload.status = data.status;
  if (data.next_follow_up_date !== undefined) leadUpdatePayload.next_follow_up_date = data.next_follow_up_date;
  if (data.estimated_deal_value !== undefined) leadUpdatePayload.estimated_deal_value = data.estimated_deal_value;
  const { error } = await leadRepository.updateLead(leadId, clinicId, leadUpdatePayload as Parameters<typeof leadRepository.updateLead>[2]);
  if (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, ...(closeWarning && { warning: closeWarning }) });
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
    const notFound = error instanceof Error && error.message.includes('not found');
    return NextResponse.json(
      { error: notFound ? 'Lead not found or already deleted' : 'Failed to delete lead' },
      { status: notFound ? 404 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
