import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import * as patientRepository from '@/repositories/patient.repository';
import type { PatientStatus } from '@/types/patients';

/** GET /api/super-admin/clinics/[id]/customers — list customers for a clinic (Super Admin only) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id: clinicId } = await params;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? undefined;
  const status = searchParams.get('status') as PatientStatus | undefined;
  const revenueMin = searchParams.get('revenueMin');
  const lastVisitOver6 = searchParams.get('lastVisitOver6');

  const filters: patientRepository.ListPatientsFilters = {};
  if (search) filters.search = search;
  if (status && ['active', 'dormant', 'inactive'].includes(status)) filters.status = status;
  if (revenueMin != null && revenueMin !== '') {
    const n = Number(revenueMin);
    if (!Number.isNaN(n)) filters.revenueMin = n;
  }
  if (lastVisitOver6 === 'true') filters.lastVisitOlderThanMonths = 6;

  const { data, error } = await patientRepository.listPatients(clinicId, filters);
  if (error) {
    console.error('GET /api/super-admin/clinics/[id]/customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
  const totalRevenue = data.reduce((sum, c) => sum + (c.total_revenue ?? 0), 0);
  return NextResponse.json({ customers: data, revenueSummary: { totalRevenue } });
}
