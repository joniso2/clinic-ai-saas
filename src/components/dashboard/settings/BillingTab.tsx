'use client';

import { CreditCard, Zap, BarChart3, Users, CheckCircle2, ArrowUpRight } from 'lucide-react';

const PLAN_FEATURES = [
  'Unlimited leads pipeline',
  'AI Discord receptionist',
  'Smart appointment scheduling',
  'Lead intelligence scoring',
  'Realtime calendar',
  'Analytics dashboard',
  'Team management',
];

const USAGE_ITEMS = [
  { label: 'Leads this month', value: '—', max: '∞' },
  { label: 'Appointments', value: '—', max: '∞' },
  { label: 'AI interactions', value: '—', max: '∞' },
  { label: 'Team members', value: '—', max: '5' },
];

export function BillingTab() {
  return (
    <div className="space-y-5">
      {/* Current plan */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Current plan</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Subscription status and features included.</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-zinc-100">Starter</span>
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Active
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">Everything you need to run your clinic AI pipeline.</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Upgrade plan
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Usage */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Usage this month</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Current billing period metrics.</p>
          </div>
        </div>
        <div className="px-5 py-5 grid gap-3 sm:grid-cols-2">
          {USAGE_ITEMS.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-700/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{item.label}</p>
              <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-zinc-100">
                {item.value}
                <span className="text-xs font-normal text-slate-400 dark:text-zinc-500"> / {item.max}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment info placeholder */}
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700 bg-slate-50/40 dark:bg-zinc-800/40 px-5 py-8 text-center">
        <Users className="mx-auto h-6 w-6 text-slate-300 dark:text-zinc-600 mb-2" />
        <p className="text-sm font-semibold text-slate-400 dark:text-zinc-500">Payment portal coming soon</p>
        <p className="mt-1 text-xs text-slate-300 dark:text-zinc-600">Manage invoices, payment methods, and billing history here.</p>
      </div>
    </div>
  );
}
