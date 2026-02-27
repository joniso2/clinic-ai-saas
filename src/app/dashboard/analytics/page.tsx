'use client';

import { useEffect, useState } from 'react';
import type { Lead } from '@/types/leads';
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetch('/api/leads', { credentials: 'include' })
      .then((r) => r.json())
      .then((json: { leads?: Lead[] }) => setLeads(json.leads ?? []))
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">High-level performance metrics for your pipeline.</p>
      </div>
      <AnalyticsTab leads={leads} />
    </>
  );
}
