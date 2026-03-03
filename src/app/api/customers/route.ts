import { NextRequest, NextResponse } from 'next/server';
import { requireClinicAccess } from '@/lib/auth-server';
import * as patientRepository from '@/repositories/patient.repository';
import type { PatientStatus } from '@/types/patients';

/** GET /api/customers?search=&status=&revenueMin=&lastVisitOver6 */
export async function GET(req: NextRequest) {
  const access = await requireClinicAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

  const { data, error } = await patientRepository.listPatients(access.clinicId, filters);
  if (error) {
    console.error('GET /api/customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
  return NextResponse.json({ customers: data });
}
