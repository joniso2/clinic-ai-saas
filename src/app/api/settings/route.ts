import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import * as settingsService from '@/services/settings.service';

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

  const settings = await settingsService.getClinicSettings(clinicId);

  // Append server-side integration status (non-sensitive)
  const discordConfigured = !!(
    process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_DEFAULT_CLINIC_ID
  );

  return NextResponse.json({ ...settings, _discord_configured: discordConfigured });
}

export async function PUT(request: NextRequest) {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Strip read-only / computed fields before persisting
  const { clinic_id: _, _discord_configured: __, created_at: ___, updated_at: ____, ...updates } = body as Record<string, unknown>;

  const { data, error } = await settingsService.updateClinicSettings(
    clinicId,
    updates as Parameters<typeof settingsService.updateClinicSettings>[1],
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
