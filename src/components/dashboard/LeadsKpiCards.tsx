'use client';

import {
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
} from 'lucide-react';
import type { Lead } from '@/types/leads';
import { formatCurrencyILS } from '@/lib/hebrew';
import { KpiCard, KPI_ACCENT as ACCENT } from '@/components/ui/KpiCard';

const CLOSED_STATUSES = ['Closed', 'Converted', 'Disqualified'];

export function LeadsKpiCards({
  leads,
  pendingForApproval = 0,
}: {
  leads: Lead[];
  pendingForApproval?: number;
}) {
  const today = new Date().toDateString();
  const newToday = leads.filter(
    (l) => new Date(l.created_at).toDateString() === today
  ).length;
  const totalRevenue = leads.reduce(
    (sum, l) => sum + (l.estimated_deal_value ?? 0),
    0
  );
  const closed = leads.filter((l) =>
    CLOSED_STATUSES.includes(l.status ?? '')
  ).length;
  const open = leads.length - closed;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]" dir="rtl">
      <KpiCard
        label="לידים פתוחים"
        value={open}
        sub="במעקב"
        icon={UserCheck}
        iconContainerClass={ACCENT.blue.icon}
        borderAccentClass={ACCENT.blue.border}
      />
      <KpiCard
        label="לידים סגורים"
        value={closed}
        sub="נסגרו / הוסרו"
        icon={UserX}
        iconContainerClass={ACCENT.slate.icon}
        borderAccentClass={ACCENT.slate.border}
      />
      <KpiCard
        label="מחכים לאישור"
        value={pendingForApproval}
        sub="תורים לאישור מנהל"
        icon={Clock}
        iconContainerClass={ACCENT.amber.icon}
        borderAccentClass={ACCENT.amber.border}
      />
      <KpiCard
        label="חדשים היום"
        value={newToday}
        sub="24 השעות האחרונות"
        icon={UserPlus}
        iconContainerClass={ACCENT.indigo.icon}
        borderAccentClass={ACCENT.indigo.border}
      />
      <KpiCard
        label="הכנסה פוטנציאלית"
        value={totalRevenue > 0 ? formatCurrencyILS(totalRevenue) : '—'}
        sub="שווי צינור"
        icon={DollarSign}
        iconContainerClass={ACCENT.emerald.icon}
        borderAccentClass={ACCENT.emerald.border}
      />
    </div>
  );
}
