'use client';

/**
 * SuperAdminShell — Pure Navigation Shell
 *
 * Responsibilities:
 * - Hash-based section routing (mobile tabs + desktop navigation hook)
 * - Render the correct section component based on active route
 * - Each section manages its own state in full isolation (no shared state here)
 *
 * Data flow:
 * - overviewData is fetched by the parent Server Component and passed as prop
 * - All other sections self-fetch their data on mount
 */

import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, DollarSign, Link2,
  Activity, Brain, Users, Settings, PackageOpen,
} from 'lucide-react';
import type { OverviewPageData } from '@/types/analytics';

// Section components
import OverviewSection              from '@/components/super-admin/overview/OverviewSection';
import TenantManagementSection      from '@/components/super-admin/tenants/TenantManagementSection';
import PricingSection               from '@/components/super-admin/pricing/PricingSection';
import IntegrationsSection          from '@/components/super-admin/integrations/IntegrationsSection';
import TrafficSection               from '@/components/super-admin/traffic/TrafficSection';
import AIControlSection             from '@/components/super-admin/ai/AIControlSection';
import SystemUsersSection           from '@/components/super-admin/users/SystemUsersSection';
import SystemSettingsSection        from '@/components/super-admin/settings/SystemSettingsSection';
import TenantServicesOverrideSection from '@/components/super-admin/services/TenantServicesOverrideSection';

// ─── Navigation config ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',     label: 'סקירה',            icon: LayoutDashboard },
  { id: 'clinics',      label: 'קליניקות',          icon: Building2 },
  { id: 'pricing',      label: 'תמחור גלובלי',     icon: DollarSign },
  { id: 'integrations', label: 'אינטגרציות',        icon: Link2 },
  { id: 'traffic',      label: 'תעבורה וביצועים',   icon: Activity },
  { id: 'ai',           label: 'AI & מודלים',       icon: Brain },
  { id: 'users',        label: 'משתמשי מערכת',      icon: Users },
  { id: 'settings',     label: 'הגדרות מערכת',      icon: Settings },
  { id: 'services',     label: 'ניהול שירותים לקליניקות', icon: PackageOpen },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];
const SECTION_IDS: readonly SectionId[] = SECTIONS.map((s) => s.id);

function sectionFromHash(): SectionId {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.slice(1) as SectionId;
  return SECTION_IDS.includes(h) ? h : 'overview';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SuperAdminShellProps {
  overviewData: OverviewPageData;
}

// ─── Shell ────────────────────────────────────────────────────────────────────
export function SuperAdminShell({ overviewData }: SuperAdminShellProps) {
  const [section, setSection] = useState<SectionId>('overview');

  useEffect(() => {
    setSection(sectionFromHash());
    const onHash = () => setSection(sectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (id: SectionId) => {
    setSection(id);
    window.location.hash = id;
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Mobile horizontal tab bar */}
      <nav
        className="flex md:hidden gap-1 p-2 overflow-x-auto border-b border-zinc-800 bg-zinc-950"
        aria-label="ניווט מקטעים"
      >
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(id)}
            className={[
              'shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              section === id
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
            ].join(' ')}
            aria-current={section === id ? 'page' : undefined}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Content area */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-zinc-950">
        <div className="px-4 py-6 md:px-8 max-w-screen-2xl mx-auto">
          {section === 'overview'     && <OverviewSection initialData={overviewData} />}
          {section === 'clinics'      && <TenantManagementSection />}
          {section === 'pricing'      && <PricingSection />}
          {section === 'integrations' && <IntegrationsSection />}
          {section === 'traffic'      && <TrafficSection />}
          {section === 'ai'           && <AIControlSection />}
          {section === 'users'        && <SystemUsersSection />}
          {section === 'settings'     && <SystemSettingsSection />}
          {section === 'services'     && <TenantServicesOverrideSection />}
        </div>
      </main>
    </div>
  );
}
