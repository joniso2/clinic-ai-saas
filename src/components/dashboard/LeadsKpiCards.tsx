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
   KPI Dashboard — leads page
   Mobile: flat inline cards (like receipts section)
   Desktop: premium cards with hero
   ═══════════════════════════════════════════════════════════════════════════════ */

type KpiItem = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
  hero?: boolean;
};

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

  const kpis: KpiItem[] = [
    { icon: Wallet, title: 'הכנסה צפויה', value: totalRevenue > 0 ? formatCurrencyILS(totalRevenue) : '—', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400', hero: true },
    { icon: CalendarCheck, title: 'תורים היום', value: newToday, iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400' },
    { icon: CalendarClock, title: 'תורים קרובים', value: open, iconBg: 'bg-sky-100 dark:bg-sky-900/40', iconColor: 'text-sky-600 dark:text-sky-400' },
    { icon: ShieldAlert, title: 'סיכון ביטול', value: String(cancellationRisk).padStart(2, '0'), iconBg: cancellationRisk > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-slate-100 dark:bg-slate-800', iconColor: cancellationRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400' },
    { icon: Activity, title: 'שיעור הגעה', value: arrivalRate > 0 ? `${arrivalRate}%` : '—', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { icon: UsersRound, title: 'צוות פעיל', value: String(teamActive).padStart(2, '0'), iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-violet-600 dark:text-violet-400' },
  ];

  return (
    <>
      {/* ── Mobile: flat inline cards (like receipts/customers) ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:hidden" dir="rtl">
        {kpis.map((k) => {
          const Icon = k.icon;
          const isHero = k.hero;
          return (
            <div
              key={k.title}
              className={`rounded-2xl px-4 py-3.5 flex items-center gap-3 relative overflow-hidden ${
                isHero ? '' : 'bg-white dark:bg-slate-800'
              }`}
              style={isHero
                ? { background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', boxShadow: '0 4px 16px rgba(30,27,75,0.25)' }
                : { boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)' }
              }
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                isHero ? 'bg-white/10 backdrop-blur-sm' : k.iconBg
              }`}>
                <Icon className={`h-4.5 w-4.5 ${isHero ? 'text-indigo-300' : k.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-semibold uppercase tracking-[0.06em] leading-none truncate ${
                  isHero ? 'text-indigo-300/80' : 'text-slate-500'
                }`}>{k.title}</p>
                <p className={`text-[20px] font-bold tabular-nums leading-none mt-1 tracking-tight truncate ${
                  isHero ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}>{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop: premium KPI cards with hero ── */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3" dir="rtl">
        <KpiCardPremium
          icon={Wallet}
          title="הכנסה צפויה"
          value={totalRevenue > 0 ? formatCurrencyILS(totalRevenue) : '—'}
          variant="primary"
          className="sm:col-span-3 lg:col-span-1"
        />
        <KpiCardPremium icon={CalendarCheck} title="תורים היום" value={newToday} accentHue="indigo" />
        <KpiCardPremium icon={CalendarClock} title="תורים קרובים" value={open} accentHue="sky" />
        <KpiCardPremium
          icon={ShieldAlert}
          title="סיכון ביטול"
          value={String(cancellationRisk).padStart(2, '0')}
          accentHue={cancellationRisk > 0 ? 'red' : 'slate'}
          danger={cancellationRisk > 0}
        />
        <KpiCardPremium icon={Activity} title="שיעור הגעה" value={arrivalRate > 0 ? `${arrivalRate}%` : '—'} accentHue="emerald" />
        <KpiCardPremium icon={UsersRound} title="צוות פעיל" value={String(teamActive).padStart(2, '0')} accentHue="violet" />
      </div>
    </>
  );
}
