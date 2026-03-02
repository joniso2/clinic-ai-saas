import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import * as settingsRepo from '@/repositories/settings.repository';

async function getAuthenticatedClinicId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single();

  return data?.clinic_id ?? null;
}

export async function GET() {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const members = await settingsRepo.getTeamMembers(clinicId);
  return NextResponse.json(members);
}

export async function POST(request: NextRequest) {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, role = 'member' } = await request.json();
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const { error, user } = await settingsRepo.inviteTeamMember(clinicId, email, role);
  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });

  return NextResponse.json({ user_id: user?.id, email, role }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id } = await request.json();
  if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });

  const { error } = await settingsRepo.removeTeamMember(clinicId, user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ removed: true });
}
