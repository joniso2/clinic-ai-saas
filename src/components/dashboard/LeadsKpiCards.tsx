import { useMemo } from 'react';
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
  const { newToday, totalRevenue, closed, open, cancellationRisk, arrivalRate, teamActive } = useMemo(() => {
    const today = new Date().toDateString();
    const _newToday = leads.filter(
      (l) => new Date(l.created_at).toDateString() === today
    ).length;
    const _totalRevenue = leads.reduce(
      (sum, l) => sum + (l.estimated_deal_value ?? 0),
      0
    );
    const _closed = leads.filter((l) =>
      CLOSED_STATUSES.includes(l.status ?? '')
    ).length;
    const _open = leads.length - _closed;

    const _cancellationRisk = leads.filter((l) => {
      const p = getDisplayPriority(l);
      const overdue = l.next_follow_up_date
        ? new Date(l.next_follow_up_date) < new Date()
        : false;
      return (p === 'Urgent' || p === 'High') && overdue;
    }).length;

    const _arrivalRate = _open > 0
      ? Math.round(((_open - _cancellationRisk) / Math.max(_open, 1)) * 100)
      : 0;
    const _teamActive = Math.max(pendingForApproval, _closed > 0 ? _closed : 1);

    return { newToday: _newToday, totalRevenue: _totalRevenue, closed: _closed, open: _open, cancellationRisk: _cancellationRisk, arrivalRate: _arrivalRate, teamActive: _teamActive };
  }, [leads, pendingForApproval]);

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
