'use client';

import { useState } from 'react';
import {
  Building2,
  CalendarDays,
  Zap,
  BrainCircuit,
  Plug2,
  Users,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import type { ClinicSettings } from '@/services/settings.service';
import { GeneralTab }      from '@/components/dashboard/settings/GeneralTab';
import { SchedulingTab }   from '@/components/dashboard/settings/SchedulingTab';
import { AutomationTab }   from '@/components/dashboard/settings/AutomationTab';
import { AITab }           from '@/components/dashboard/settings/AITab';
import { IntegrationsTab } from '@/components/dashboard/settings/IntegrationsTab';
import { TeamTab }         from '@/components/dashboard/settings/TeamTab';
import { SecurityTab }     from '@/components/dashboard/settings/SecurityTab';
import { BillingTab }      from '@/components/dashboard/settings/BillingTab';

type TabId = 'general' | 'scheduling' | 'automation' | 'ai' | 'integrations' | 'team' | 'security' | 'billing';

const TABS: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'general',      label: 'General',      icon: Building2,   description: 'Profile, contact info, locale' },
  { id: 'scheduling',   label: 'Scheduling',   icon: CalendarDays, description: 'Hours, slots, booking rules' },
  { id: 'automation',   label: 'Automation',   icon: Zap,         description: 'Lead & booking rules' },
  { id: 'ai',          label: 'AI',           icon: BrainCircuit, description: 'Tone, length, enforcement' },
  { id: 'integrations', label: 'Integrations', icon: Plug2,       description: 'Discord, webhooks' },
  { id: 'team',         label: 'Team',         icon: Users,       description: 'Members & roles' },
  { id: 'security',     label: 'Security',     icon: ShieldCheck, description: '2FA, sessions, audit' },
  { id: 'billing',      label: 'Billing',      icon: CreditCard,  description: 'Plan, usage, payment' },
];

export function SettingsTab({
  clinicName,
  userEmail,
  settings,
}: {
  clinicName: string | null;
  userEmail: string | null;
  settings: ClinicSettings | null;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const defaultSettings: ClinicSettings = settings ?? {
    clinic_id: '',
    clinic_phone: null, address: null, timezone: 'Asia/Jerusalem', currency: 'ILS',
    logo_url: null, business_description: null,
    working_hours: [
      { day: 0, enabled: false, open: '08:00', close: '16:00' },
      { day: 1, enabled: true,  open: '08:00', close: '16:00' },
      { day: 2, enabled: true,  open: '08:00', close: '16:00' },
      { day: 3, enabled: true,  open: '08:00', close: '16:00' },
      { day: 4, enabled: true,  open: '08:00', close: '16:00' },
      { day: 5, enabled: true,  open: '08:00', close: '14:00' },
      { day: 6, enabled: false, open: '08:00', close: '16:00' },
    ],
    slot_minutes: 30, buffer_minutes: 0, max_appointments_per_day: null,
    min_booking_notice_hours: 0, max_booking_window_days: 60, break_slots: [],
    require_phone_before_booking: true, auto_create_lead_on_first_message: false,
    sla_target_minutes: 60, auto_mark_contacted: false,
    ai_tone: 'professional', ai_response_length: 'standard', strict_hours_enforcement: true,
  };

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
      {/* ── Sidebar / tab nav ─────────────────────────────────────────────── */}
      <nav className="lg:w-52 shrink-0">
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus:outline-none ${
                  active
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Desktop: vertical list */}
        <div className="hidden lg:flex lg:flex-col lg:gap-0.5 lg:rounded-2xl lg:border lg:border-slate-200 lg:dark:border-zinc-700 lg:bg-white lg:dark:bg-zinc-800 lg:overflow-hidden lg:p-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-inset ${
                  active
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                    : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700/60'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {activeTab === 'general' && (
          <GeneralTab settings={defaultSettings} clinicName={clinicName} userEmail={userEmail} />
        )}
        {activeTab === 'scheduling' && (
          <SchedulingTab settings={defaultSettings} />
        )}
        {activeTab === 'automation' && (
          <AutomationTab settings={defaultSettings} />
        )}
        {activeTab === 'ai' && (
          <AITab settings={defaultSettings} />
        )}
        {activeTab === 'integrations' && (
          <IntegrationsTab />
        )}
        {activeTab === 'team' && (
          <TeamTab />
        )}
        {activeTab === 'security' && (
          <SecurityTab />
        )}
        {activeTab === 'billing' && (
          <BillingTab />
        )}
      </div>
    </div>
  );
}
