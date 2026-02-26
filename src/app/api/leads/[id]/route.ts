import { NextRequest, NextResponse } from 'next/server';
import * as leadRepository from '@/repositories/lead.repository';
import { createClient } from '@/lib/supabase-server';

async function getClinicIdFromSession(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (user.app_metadata as { clinic_id?: string } | null)?.clinic_id ?? null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinicId = await getClinicIdFromSession();
  if (!clinicId) {
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
    email: string;
    interest: string;
    status: string;
    next_follow_up_date: string;
  }>;

  const { error } = await leadRepository.updateLead(id, clinicId, data);
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
