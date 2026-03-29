import type { Lead } from '@/types/leads';
import { getDisplayPriority } from '@/types/leads';
import { formatCurrencyILS } from '@/lib/hebrew';
import {
  Wallet,
  CalendarCheck,
  CalendarClock,
  ShieldAlert,
  Activity,
  UsersRound,
} from 'lucide-react';
import { KpiCardPremium } from '@/components/ui/KpiCardPremium';

const CLOSED_STATUSES = ['Closed', 'Converted', 'Disqualified'];

/* ═══════════════════════════════════════════════════════════════════════════════
   KPI Dashboard — premium metric grid (leads page)
   ═══════════════════════════════════════════════════════════════════════════════ */

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

  const cancellationRisk = leads.filter((l) => {
    const p = getDisplayPriority(l);
    const overdue = l.next_follow_up_date
      ? new Date(l.next_follow_up_date) < new Date()
      : false;
    return (p === 'Urgent' || p === 'High') && overdue;
  }).length;

  const arrivalRate = open > 0
    ? Math.round(((open - cancellationRisk) / Math.max(open, 1)) * 100)
    : 0;
  const teamActive = Math.max(pendingForApproval, closed > 0 ? closed : 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" dir="rtl">
      {/* ── Revenue hero ── */}
      <KpiCardPremium
        icon={Wallet}
        title="הכנסה צפויה"
        value={totalRevenue > 0 ? formatCurrencyILS(totalRevenue) : '—'}
        variant="primary"
        className="col-span-2 sm:col-span-3 lg:col-span-1"
      />

      {/* ── Secondary metrics ── */}
      <KpiCardPremium
        icon={CalendarCheck}
        title="תורים היום"
        value={newToday}
        accentHue="indigo"
      />
      <KpiCardPremium
        icon={CalendarClock}
        title="תורים קרובים"
        value={open}
        accentHue="sky"
      />
      <KpiCardPremium
        icon={ShieldAlert}
        title="סיכון ביטול"
        value={String(cancellationRisk).padStart(2, '0')}
        accentHue={cancellationRisk > 0 ? 'red' : 'slate'}
        danger={cancellationRisk > 0}
      />
      <KpiCardPremium
        icon={Activity}
        title="שיעור הגעה"
        value={arrivalRate > 0 ? `${arrivalRate}%` : '—'}
        accentHue="emerald"
      />
      <KpiCardPremium
        icon={UsersRound}
        title="צוות פעיל"
        value={String(teamActive).padStart(2, '0')}
        accentHue="violet"
      />
    </div>
  );
}
