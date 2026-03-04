import { NextRequest, NextResponse } from 'next/server';
import { requireClinicAccess } from '@/lib/auth-server';
import * as patientRepository from '@/repositories/patient.repository';
import { normalizePhone } from '@/lib/phone';

export type ImportRow = {
  name?: string;
  phone?: string;
  email?: string;
  last_visit?: string;
  revenue?: number;
  /** Pascal case from Excel template */
  Name?: string;
  Phone?: string;
  Email?: string;
  LastVisit?: string;
  Revenue?: number;
};

/** POST /api/customers/import — body: { rows: ImportRow[] } */
export async function POST(req: NextRequest) {
  const access = await requireClinicAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { rows?: ImportRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawRows = Array.isArray(body.rows) ? body.rows : [];
  if (rawRows.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  const { data: existingPhones, error: fetchErr } = await patientRepository.getExistingPatientPhones(access.clinicId);
  if (fetchErr) {
    console.error('GET existing phones error:', fetchErr);
    return NextResponse.json({ error: 'Failed to check existing customers' }, { status: 500 });
  }

  const seenPhones = new Set<string>();
  const payloads: patientRepository.CreatePatientPayload[] = [];

  for (const row of rawRows) {
    const name = (row.name ?? row.Name ?? '').toString().trim();
    const phoneRaw = (row.phone ?? row.Phone ?? '').toString().trim();
    const lastVisitRaw = (row.last_visit ?? row.LastVisit ?? '').toString().trim();
    const revenueRaw = row.revenue ?? row.Revenue;

    if (!name && !phoneRaw) continue;

    const phoneNorm = normalizePhone(phoneRaw);
    if (!phoneNorm || phoneNorm.length < 9) continue;
    if (existingPhones.has(phoneNorm) || seenPhones.has(phoneNorm)) continue;
    seenPhones.add(phoneNorm);

    let lastVisit: string | null = null;
    if (lastVisitRaw) {
      const d = new Date(lastVisitRaw);
      if (!Number.isNaN(d.getTime())) lastVisit = d.toISOString().slice(0, 10);
    }

    const revenue = typeof revenueRaw === 'number' ? revenueRaw : Number(revenueRaw);
    const totalRevenue = Number.isFinite(revenue) && revenue >= 0 ? revenue : 0;

    payloads.push({
      clinic_id: access.clinicId,
      full_name: name || 'ללא שם',
      phone: phoneRaw,
      total_revenue: totalRevenue,
      visits_count: 0,
      last_visit_date: lastVisit,
    });
  }

  if (payloads.length === 0) {
    return NextResponse.json({ imported: 0, skipped: rawRows.length });
  }

  const { inserted, error } = await patientRepository.createPatientsBatch(access.clinicId, payloads);
  if (error) {
    console.error('Import batch error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }

  return NextResponse.json({ imported: inserted, skipped: rawRows.length - inserted });
}
