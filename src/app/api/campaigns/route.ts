/**
 * /api/campaigns — GET (list) + POST (create)
 *
 * ─── Supabase migration ────────────────────────────────────────────────────
 * Run the following SQL in your Supabase SQL Editor before using this route:
 *
 *   create table if not exists campaigns (
 *     id             uuid        primary key default gen_random_uuid(),
 *     clinic_id      uuid        not null references clinics(id) on delete cascade,
 *     created_at     timestamptz not null default now(),
 *     channel        text        not null check (channel in ('sms','whatsapp')),
 *     message        text        not null,
 *     audience_type  text        not null check (audience_type in ('all','custom','last_visit_filter')),
 *     audience_ids   text[]      not null default '{}',
 *     audience_size  int         not null default 0,
 *     schedule_type  text        not null check (schedule_type in ('now','weekly','monthly','auto_days_after')),
 *     schedule_value text,
 *     status         text        not null default 'draft'
 *                    check (status in ('sent','scheduled','draft','sending'))
 *   );
 *
 *   create index on campaigns(clinic_id, created_at desc);
 *   alter table campaigns enable row level security;
 *   create policy "clinic staff can manage their campaigns"
 *     on campaigns for all
 *     using (clinic_id = (
 *       select clinic_id from clinic_users where user_id = auth.uid() limit 1
 *     ));
 * ──────────────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireClinicAccess } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';
import type { Campaign } from '@/types/campaigns';

/** GET /api/campaigns — list campaigns for the current clinic */
export async function GET() {
  const access = await requireClinicAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('clinic_id', access.clinicId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    // Table may not exist yet — return empty list gracefully
    console.warn('[GET /api/campaigns]', error.message);
    return NextResponse.json({ campaigns: [] });
  }

  return NextResponse.json({ campaigns: data ?? [] });
}

/** POST /api/campaigns — create a new campaign */
export async function POST(req: NextRequest) {
  const access = await requireClinicAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const {
    channel, message, audience_type, audience_ids = [],
    audience_size = 0, schedule_type, schedule_value = null,
  } = body as Partial<Campaign>;

  if (!channel || !message || !audience_type || !schedule_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const status: Campaign['status'] = schedule_type === 'now' ? 'sending' : 'scheduled';

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      clinic_id: access.clinicId,
      channel,
      message,
      audience_type,
      audience_ids,
      audience_size,
      schedule_type,
      schedule_value,
      status,
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/campaigns]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If schedule_type === 'now', trigger actual send here.
  // For now: status transitions to 'sent' after the (mock) send completes.
  if (schedule_type === 'now' && data) {
    await supabase.from('campaigns').update({ status: 'sent' }).eq('id', data.id);
    data.status = 'sent';
  }

  return NextResponse.json({ campaign: data }, { status: 201 });
}
