import { NextRequest, NextResponse } from 'next/server';
import { requireClinicAccess } from '@/lib/auth-server';
import * as patientRepository from '@/repositories/patient.repository';
import * as appointmentRepository from '@/repositories/appointment.repository';

/** GET /api/customers/[id] — single customer + completed appointments timeline */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireClinicAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { data: patient, error: patientErr } = await patientRepository.getPatientById(id, access.clinicId);
  if (patientErr || !patient) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  const { data: appointments } = await appointmentRepository.getCompletedAppointmentsByPatientId(id, access.clinicId);
  return NextResponse.json({ customer: patient, appointments });
}

/** PATCH /api/customers/[id] — update customer (including manual status override) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireClinicAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const data = body as Partial<{
    full_name: string;
    phone: string;
    status: string;
  }>;
  const updates: Parameters<typeof patientRepository.updatePatient>[2] = {};
  if (data.full_name !== undefined) updates.full_name = data.full_name;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.status !== undefined && ['active', 'dormant', 'inactive'].includes(data.status)) {
    updates.status = data.status as 'active' | 'dormant' | 'inactive';
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }
  const { error } = await patientRepository.updatePatient(id, access.clinicId, updates);
  if (error) {
    console.error('PATCH /api/customers/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/customers/[id] — soft-delete customer */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireClinicAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { error } = await patientRepository.softDeletePatient(id, access.clinicId);
  if (error) {
    console.error('DELETE /api/customers/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
