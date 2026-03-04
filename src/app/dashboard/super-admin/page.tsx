/**
 * Super Admin Page — Server Component
 *
 * Responsibilities:
 * 1. Fetch real platform data from Supabase (tenants, leads, appointments, users,
 *    Discord connections) at request time — zero client waterfalls for the
 *    Overview section.
 * 2. Import mock analytics (MRR, AI token estimates) from the isolated
 *    mock-analytics service.
 * 3. Transform raw data into a fully-typed OverviewPageData object.
 * 4. Pass the prepared data as a prop to the SuperAdminShell client component.
 *
 * DO NOT add client-side state or event handlers here.
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMockOverviewAnalytics } from '@/services/mock-analytics.service';
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell';
import type {
  OverviewPageData,
  KPIMetric,
  TenantMetricPoint,
  IntegrationStatusRecord,
} from '@/types/analytics';

// ─── Internal raw types (not exported) ───────────────────────────────────────
interface RawTenantRow {
  id: string;
  name: string | null;
  status: string | null;
  plan_id: string | null;
}

interface EnrichedTenant {
  id: string;
  name: string | null;
  status: string;
  leadsCount: number;
  appointmentsCount: number;
  discordConnected: boolean;
}

interface PlatformSnapshot {
  totalTenants: number;
  activeTenants: number;
  totalLeads: number;
  totalAppointments: number;
  totalUsers: number;
  tenants: EnrichedTenant[];
  discordConnectedCount: number;
  messagesToday?: number;
  integrationHealthPercent?: number;
}

// ─── Data layer ───────────────────────────────────────────────────────────────
async function fetchPlatformSnapshot(): Promise<PlatformSnapshot> {
  const supabase = getSupabaseAdmin();

  // Fire independent count queries in parallel
  const [
    { count: rawTotalTenants },
    { data: rawTenants },
    { count: rawLeads },
    { count: rawAppointments },
    { count: rawUsers },
    { data: guildRows },
  ] = await Promise.all([
    supabase.from('clinics').select('id', { count: 'exact', head: true }),
    supabase.from('clinics').select('id, name, status, plan_id').order('name'),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('appointments').select('id', { count: 'exact', head: true }),
    supabase.from('clinic_users').select('user_id', { count: 'exact', head: true }),
    supabase.from('discord_guilds').select('clinic_id'),
  ]);

  const discordSet = new Set(
    (guildRows ?? []).map((r: { clinic_id: string }) => r.clinic_id),
  );

  // Enrich each tenant with per-tenant counts (parallelised)
  const tenants: EnrichedTenant[] = await Promise.all(
    (rawTenants as RawTenantRow[] ?? []).map(async (t) => {
      const [leadsRes, apptsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', t.id),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', t.id),
      ]);
      return {
        id: t.id,
        name: t.name,
        status: t.status ?? 'active',
        leadsCount: leadsRes.count ?? 0,
        appointmentsCount: apptsRes.count ?? 0,
        discordConnected: discordSet.has(t.id),
      };
    }),
  );

  const activeTenants = tenants.filter((t) => t.status !== 'inactive').length;

  let messagesToday = 0;
  let integrationHealthPercent = 0;
  try {
    const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
    const { count: msgCount } = await supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', todayStart);
    messagesToday = msgCount ?? 0;
    const { count: totalInt } = await supabase.from('clinic_integrations').select('id', { count: 'exact', head: true });
    const { count: connectedInt } = await supabase.from('clinic_integrations').select('id', { count: 'exact', head: true }).eq('status', 'connected');
    integrationHealthPercent = (totalInt ?? 0) > 0 ? ((connectedInt ?? 0) / (totalInt ?? 1)) * 100 : 0;
  } catch {
    // messages / clinic_integrations may not exist before migration
  }

  return {
    totalTenants: rawTotalTenants ?? 0,
    activeTenants,
    totalLeads: rawLeads ?? 0,
    totalAppointments: rawAppointments ?? 0,
    totalUsers: rawUsers ?? 0,
    tenants,
    discordConnectedCount: discordSet.size,
    messagesToday,
    integrationHealthPercent,
  };
}

// ─── Data transformation (server-side, no UI logic) ──────────────────────────
function buildKPIs(
  platform: PlatformSnapshot,
  mrrValue: number,
  mrrChange: number,
): KPIMetric[] {
  const conversionRate =
    platform.totalLeads > 0
      ? Math.round((platform.totalAppointments / platform.totalLeads) * 100)
      : 0;

  return [
    {
      id: 'total-tenants',
      label: 'סה"כ לקוחות',
      value: platform.totalTenants,
      trend: 'up',
      change: 12,
    },
    {
      id: 'active-tenants',
      label: 'לקוחות פעילים',
      value: platform.activeTenants,
      trend: 'up',
      change: 8,
    },
    {
      id: 'mrr',
      label: 'MRR',
      value: platform.totalTenants > 0 ? mrrValue : 0,
      prefix: '₪',
      trend: 'up',
      change: mrrChange,
      highlight: true,
    },
    {
      id: 'total-leads',
      label: 'סה"כ לידים',
      value: platform.totalLeads,
      trend: 'up',
      change: 15,
    },
    {
      id: 'total-appointments',
      label: 'סה"כ תורים',
      value: platform.totalAppointments,
      trend: 'up',
      change: 11,
    },
    {
      id: 'conversion-rate',
      label: 'שיעור המרה',
      value: conversionRate,
      suffix: '%',
      trend: conversionRate >= 30 ? 'up' : 'down',
      change: 2.1,
    },
    {
      id: 'total-users',
      label: 'משתמשים',
      value: platform.totalUsers,
      trend: 'neutral',
      change: 5,
    },
    {
      id: 'discord-connected',
      label: 'Discord מחובר',
      value: platform.discordConnectedCount,
      trend: platform.discordConnectedCount === platform.totalTenants ? 'up' : 'down',
      change: 0,
    },
    ...(platform.messagesToday !== undefined
      ? [{
          id: 'messages-today',
          label: 'הודעות היום',
          value: platform.messagesToday,
          trend: 'neutral' as const,
          change: 0,
        }]
      : []),
    ...(platform.integrationHealthPercent !== undefined
      ? [{
          id: 'integration-health',
          label: 'בריאות אינטגרציות',
          value: Math.round(platform.integrationHealthPercent),
          suffix: '%' as const,
          trend: ((platform.integrationHealthPercent ?? 0) >= 80 ? 'up' : (platform.integrationHealthPercent ?? 0) >= 50 ? 'neutral' : 'down') as 'up' | 'down' | 'neutral',
          change: 0,
        }]
      : []),
  ];
}

function buildLeadsPerTenant(tenants: EnrichedTenant[]): TenantMetricPoint[] {
  return [...tenants]
    .sort((a, b) => b.leadsCount - a.leadsCount)
    .slice(0, 10)
    .map((t) => ({
      tenantId: t.id,
      tenantName: t.name ?? t.id,
      value: t.leadsCount,
      secondaryValue: t.appointmentsCount,
    }));
}

function buildIntegrationStatus(
  totalTenants: number,
  discordConnected: number,
): IntegrationStatusRecord[] {
  const webhooksConnected = Math.max(0, Math.floor(totalTenants * 0.6));
  return [
    {
      platform: 'discord',
      label: 'Discord',
      connected: discordConnected,
      total: totalTenants,
      status:
        discordConnected === totalTenants && totalTenants > 0
          ? 'healthy'
          : discordConnected > 0
          ? 'warning'
          : 'critical',
    },
    {
      platform: 'whatsapp',
      label: 'WhatsApp',
      connected: 0,
      total: totalTenants,
      status: 'critical',
    },
    {
      platform: 'webhook',
      label: 'Webhooks',
      connected: webhooksConnected,
      total: totalTenants,
      status: webhooksConnected >= totalTenants ? 'healthy' : 'warning',
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function SuperAdminPage() {
  // Fetch real + mock data in parallel — both are safe to fail gracefully
  const fallbackSnapshot: PlatformSnapshot = {
    totalTenants: 0,
    activeTenants: 0,
    totalLeads: 0,
    totalAppointments: 0,
    totalUsers: 0,
    tenants: [],
    discordConnectedCount: 0,
  };

  const [platform, mock] = await Promise.all([
    fetchPlatformSnapshot().catch(() => fallbackSnapshot),
    Promise.resolve(getMockOverviewAnalytics('30d')),
  ]);

  const overviewData: OverviewPageData = {
    kpis: buildKPIs(platform, mock.mrr, mock.mrrChange),
    revenueTrend: mock.revenueTrend,
    leadsPerTenant: buildLeadsPerTenant(platform.tenants),
    conversionTrend: mock.conversionTrend,
    aiUsagePerTenant: mock.aiUsagePerTenant,
    integrationStatus: buildIntegrationStatus(
      platform.totalTenants,
      platform.discordConnectedCount,
    ),
  };

  return <SuperAdminShell overviewData={overviewData} />;
}
