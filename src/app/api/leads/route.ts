import { NextRequest, NextResponse } from 'next/server';
import * as leadRepository from '@/repositories/lead.repository';
import { createClient } from '@/lib/supabase-server';
import { getClinicIdFromSession, getEffectiveClinicId, getSessionUser } from '@/lib/auth-server';

function isAgentAuthorized(req: NextRequest): boolean {
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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 },
    );
  }

  const parsed = body as {
    full_name?: string;
    phone?: string;
    email?: string;
    interest?: string;
    clinic_id?: string;
    status?: string;
    estimated_deal_value?: number | null;
  };

  let clinicId: string | null = null;

  if (isAgentAuthorized(req)) {
    clinicId = parsed.clinic_id ?? null;
  } else {
    clinicId = await getClinicIdFromSession();
  }

  if (!parsed.full_name || !clinicId) {
    return NextResponse.json(
      isAgentAuthorized(req)
        ? { error: 'full_name and clinic_id are required' }
        : { error: 'Unauthorized or clinic not set' },
      { status: isAgentAuthorized(req) ? 400 : 401 },
    );
  }

  const { data, error } = await leadRepository.createLead({
    clinic_id: clinicId,
    full_name: parsed.full_name,
    phone: parsed.phone ?? null,
    email: parsed.email ?? null,
    interest: parsed.interest ?? null,
    status: parsed.status ?? 'Pending',
    ...(parsed.estimated_deal_value != null && { estimated_deal_value: parsed.estimated_deal_value }),
  });

  if (error) {
    console.error('Error inserting lead:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 },
    );
  }

  return NextResponse.json({ lead: data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clinicId = await getEffectiveClinicId(req);
    if (!clinicId) {
      return NextResponse.json(
        { leads: [], error: 'Clinic not set for user' },
        { status: 200 },
      );
    }

    const { data, error } = await leadRepository.getLeadsByClinicId(clinicId);
    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 },
      );
    }
    return NextResponse.json({ leads: data ?? [] });
  } catch (err) {
    console.error('GET /api/leads error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 },
    );
  }
}
