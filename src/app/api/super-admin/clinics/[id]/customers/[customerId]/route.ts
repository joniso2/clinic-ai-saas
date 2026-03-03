import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import * as patientRepository from '@/repositories/patient.repository';
import * as appointmentRepository from '@/repositories/appointment.repository';

/** GET /api/super-admin/clinics/[id]/customers/[customerId] — one customer + timeline */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: clinicId, customerId } = await params;
  const { data: patient, error: patientErr } = await patientRepository.getPatientById(customerId, clinicId);
  if (patientErr || !patient) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  const { data: appointments } = await appointmentRepository.getCompletedAppointmentsByPatientId(customerId, clinicId);
  return NextResponse.json({ customer: patient, appointments });
}

/** PATCH /api/super-admin/clinics/[id]/customers/[customerId] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: clinicId, customerId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const data = body as Partial<{ full_name: string; phone: string; status: string }>;
  const updates: Parameters<typeof patientRepository.updatePatient>[2] = {};
  if (data.full_name !== undefined) updates.full_name = data.full_name;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.status !== undefined && ['active', 'dormant', 'inactive'].includes(data.status)) {
    updates.status = data.status as 'active' | 'dormant' | 'inactive';
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });
  const { error } = await patientRepository.updatePatient(customerId, clinicId, updates);
  if (error) {
    console.error('PATCH super-admin customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/super-admin/clinics/[id]/customers/[customerId] — soft-delete */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; customerId: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: clinicId, customerId } = await params;
  const { error } = await patientRepository.softDeletePatient(customerId, clinicId);
  if (error) {
    console.error('DELETE super-admin customer error:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
