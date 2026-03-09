'use client';

import { ShieldCheck, KeyRound, MonitorSmartphone, ScrollText, Download, Lock } from 'lucide-react';

function FeatureCard({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
          {badge && (
            <span className="rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export function SecurityTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Security features</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Protect your clinic data and control access.</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-3">
          <FeatureCard
            icon={Lock}
            title="Two-factor authentication"
            description="Add an extra layer of security to your account with 2FA via authenticator app or SMS."
            badge="Coming soon"
          />
          <FeatureCard
            icon={MonitorSmartphone}
            title="Active sessions"
            description="View and revoke active login sessions across all your devices."
            badge="Coming soon"
          />
          <FeatureCard
            icon={KeyRound}
            title="API keys"
            description="Generate and manage API keys for programmatic access to clinic data."
            badge="Coming soon"
          />
          <FeatureCard
            icon={ScrollText}
            title="Audit log"
            description="Full event log of every action taken in your clinic dashboard — by user, timestamp, and change."
            badge="Coming soon"
          />
          <FeatureCard
            icon={Download}
            title="Data export"
            description="Export all your leads, appointments, and settings as CSV or JSON for compliance and backups."
            badge="Coming soon"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 px-5 py-4">
        <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">Enterprise security</p>
        <p className="mt-1 text-xs text-indigo-600/80 dark:text-indigo-400/70">
          Need SSO, SAML, or custom security policies? Contact us to discuss enterprise plans.
        </p>
      </div>
    </div>
  );
}
