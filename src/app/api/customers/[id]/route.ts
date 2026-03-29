import { NextRequest, NextResponse } from 'next/server';
import { requireClinicAccess } from '@/lib/auth-server';
import * as patientRepository from '@/repositories/patient.repository';
import * as appointmentRepository from '@/repositories/appointment.repository';
import * as patientService from '@/services/patient.service';

/** GET /api/customers/[id] — single customer + completed appointments timeline + enriched data */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireClinicAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  // Run enriched card data + appointments timeline in parallel
  const [cardResult, appointmentsResult] = await Promise.all([
    patientService.getPatientCardData(id, access.clinicId),
    appointmentRepository.getCompletedAppointmentsByPatientId(id, access.clinicId),
  ]);

  if (cardResult.error || !cardResult.data) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const { patient, ...enriched } = cardResult.data;
  return NextResponse.json({
    customer: patient,
    appointments: appointmentsResult.data,
    enriched,
  });
}

/** PATCH /api/customers/[id] — update customer (including manual status override and recall) */
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
    recall_active: boolean;
    recall_date: string | null;
  }>;
  const updates: Parameters<typeof patientRepository.updatePatient>[2] = {};
  if (data.full_name !== undefined) updates.full_name = data.full_name;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.status !== undefined && ['active', 'dormant', 'inactive'].includes(data.status)) {
    updates.status = data.status as 'active' | 'dormant' | 'inactive';
  }
  if (data.recall_active !== undefined) updates.recall_active = data.recall_active;
  if (data.recall_date !== undefined) updates.recall_date = data.recall_date;
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
