import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key on the server.
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

// Verify that the incoming request is authorized to create leads.
function isAuthorized(req: NextRequest): boolean {
  const configuredSecret = process.env.AGENT_API_SECRET;
  if (!configuredSecret) {
    console.error('AGENT_API_SECRET is not set on the server.');
    return false;
  }

  const headerSecret = req.headers.get('x-agent-secret');
  const bearer = req.headers.get('authorization');
  const bearerToken =
    bearer && bearer.toLowerCase().startsWith('bearer ')
      ? bearer.slice('bearer '.length)
      : null;

  const provided = headerSecret || bearerToken;
  return !!provided && provided === configuredSecret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 },
    );
  }

  const { full_name, phone, email, interest, clinic_id } = body as {
    full_name?: string;
    phone?: string;
    email?: string;
    interest?: string;
    clinic_id?: string;
  };

  if (!full_name || !clinic_id) {
    return NextResponse.json(
      { error: 'full_name and clinic_id are required' },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('leads')
      .insert({
        clinic_id,
        full_name,
        phone: phone || null,
        email: email || null,
        interest: interest || null,
        status: 'New',
      })
      .select('id, clinic_id, full_name, phone, email, interest, status, created_at')
      .single();

    if (error) {
      console.error('Error inserting lead:', error);
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 },
      );
    }

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error creating lead:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 },
    );
  }
}

