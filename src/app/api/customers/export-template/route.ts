import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveClinicId, getSessionUser } from '@/lib/auth-server';
import * as leadRepository from '@/repositories/lead.repository';
import * as XLSX from 'xlsx';

const COLS = [
  { wch: 22 }, // Name
  { wch: 14 }, // Phone
  { wch: 28 }, // Email
  { wch: 12 }, // LastVisit
  { wch: 10 }, // Revenue
];

/** GET /api/customers/export-template — returns xlsx with template + לידים שטופלו */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const clinicId = await getEffectiveClinicId(req);
  if (!clinicId) {
    return NextResponse.json({ error: 'Clinic not set' }, { status: 400 });
  }

  const { data: leads, error } = await leadRepository.getLeadsByClinicId(clinicId);
  if (error) {
    console.error('export-template: getLeadsByClinicId error', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }

  const closedLeads = (leads ?? []).filter(
    (l) => (l.status ?? '').toString().trim().toLowerCase() === 'closed'
  );
  const lastVisitOrCreated = (l: leadRepository.LeadRow) =>
    (l.last_contact_date ?? l.created_at ?? '').toString().slice(0, 10);
  const leadRows = closedLeads.map((l) => [
    l.full_name ?? '',
    l.phone ?? '',
    l.email ?? '',
    lastVisitOrCreated(l),
    l.estimated_deal_value ?? 0,
  ]);

  const wb = XLSX.utils.book_new();

  // גיליון ראשון = לידים שטופלו (נפתח כברירת מחדל ב-Excel)
  const wsLeads = XLSX.utils.aoa_to_sheet([
    ['Name', 'Phone', 'Email', 'LastVisit', 'Revenue'],
    ...leadRows,
  ]);
  wsLeads['!cols'] = COLS;
  XLSX.utils.book_append_sheet(wb, wsLeads, 'לידים שטופלו');

  const wsCustomers = XLSX.utils.aoa_to_sheet([
    ['Name', 'Phone', 'Email', 'LastVisit', 'Revenue'],
    ['Example Patient', '0500000000', 'example@email.com', '2026-03-01', 250],
  ]);
  wsCustomers['!cols'] = COLS;
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="customers_import_template.xlsx"',
    },
  });
}
