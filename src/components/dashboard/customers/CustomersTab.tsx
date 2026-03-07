'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Trash2, X, Phone, DollarSign, ArrowRight, UserCheck, Users,
  Calendar, MessageCircle, Archive, FileText, Download, Upload,
  Bell, BellRing, ChevronDown, TrendingUp, Sparkles, Clock, Filter, SortAsc, Send,
} from 'lucide-react';
import { CustomersImportModal } from './CustomersImportModal';
import { MessagingPanel } from './MessagingPanel';
import type { Patient } from '@/types/patients';
import type { Lead } from '@/types/leads';
import type { CompletedAppointmentRow } from '@/repositories/appointment.repository';
import { formatCurrencyILS, formatPhoneILS, PATIENT_STATUS_LABELS, SOURCE_LABELS } from '@/lib/hebrew';

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['active', 'dormant', 'inactive'] as const;
type SortKey = 'date_desc' | 'date_asc' | 'value_desc' | 'value_asc' | 'name_az' | 'name_za';
type RecallEntry = { active: boolean; reminderDate: string };

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date_desc', label: 'תאריך סגירה (חדש לישן)' },
  { value: 'date_asc', label: 'תאריך סגירה (ישן לחדש)' },
  { value: 'value_desc', label: 'שווי (גבוה לנמוך)' },
  { value: 'value_asc', label: 'שווי (נמוך לגבוה)' },
  { value: 'name_az', label: 'שם א-ת' },
  { value: 'name_za', label: 'שם ת-א' },
];

// ─── Design helpers ───────────────────────────────────────────────────────────

const SOURCE_BADGE_STYLES: Record<string, { label: string; cls: string }> = {
  WhatsApp:    { label: 'וואטסאפ',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  Instagram:   { label: 'אינסטגרם', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
  Referral:    { label: 'הפניה',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  'Google Ads':{ label: 'גוגל',      cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  Organic:     { label: 'אורגני',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  discord:     { label: 'דיסקורד',   cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
  Discord:     { label: 'דיסקורד',   cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
  Other:       { label: 'אחר',       cls: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400' },
};

function getSourceBadgeStyle(source: string | null | undefined) {
  if (!source) return null;
  return SOURCE_BADGE_STYLES[source] ?? {
    label: SOURCE_LABELS[source] ?? source,
    cls: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
  };
}

function getStatusBadgeStyle(status: string) {
  if (status === 'active')   return { label: 'פעיל',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (status === 'dormant')  return { label: 'רדום',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  if (status === 'inactive') return { label: 'לא פעיל', cls: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400' };
  if (status === 'Closed')   return { label: 'הושלם',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  return { label: status, cls: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400' };
}

const AVATAR_COLORS = [
  'bg-violet-500','bg-indigo-500','bg-blue-500','bg-cyan-500',
  'bg-teal-500','bg-emerald-500','bg-rose-500','bg-orange-500',
];

function getAvatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2) : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function getCloseDatePatient(p: Patient): string | null {
  return p.last_visit_date ?? p.updated_at ?? p.created_at ?? null;
}
function getCloseDateLead(l: Lead): string | null { return l.created_at ?? null; }
function getValuePatient(p: Patient): number { return Number(p.total_revenue) || 0; }
function getValueLead(l: Lead): number { return l.estimated_deal_value ?? 0; }

// ─── Suggested actions ────────────────────────────────────────────────────────

type Suggestion = { icon: React.ReactNode; text: string; color: 'amber' | 'indigo' | 'emerald' | 'slate' };

function computeSuggestions(customer: Patient | null, allCustomers: Patient[]): Suggestion[] {
  if (!customer) return [];
  const out: Suggestion[] = [];
  const days = daysSince(customer.last_visit_date);

  if (days !== null && days >= 60)
    out.push({ icon: <Clock className="h-4 w-4" />, text: `לא ביקר/ה כבר ${days} יום — מומלץ ליצור קשר`, color: 'amber' });

  if (customer.visits_count === 1)
    out.push({ icon: <Sparkles className="h-4 w-4" />, text: 'ביקור ראשון בלבד — מומלץ לעשות פולואפ', color: 'indigo' });

  const revenues = allCustomers.map(getValuePatient).filter((v) => v > 0).sort((a, b) => b - a);
  if (revenues.length > 0) {
    const threshold = revenues[Math.max(0, Math.floor(revenues.length * 0.2) - 1)];
    if (getValuePatient(customer) >= threshold && threshold > 0)
      out.push({ icon: <TrendingUp className="h-4 w-4" />, text: 'לקוח ערך גבוה — שקול הצעת טיפול נאמנות', color: 'emerald' });
  }

  if (days !== null && days >= 30 && days < 60)
    out.push({ icon: <Bell className="h-4 w-4" />, text: 'חודש ללא ביקור — זמן טוב לשלוח תזכורת', color: 'slate' });

  return out;
}

// ─── Small reusable components ────────────────────────────────────────────────

function SourceBadge({ source }: { source: string | null | undefined }) {
  const s = getSourceBadgeStyle(source);
  if (!s) return <span className="text-slate-400 dark:text-zinc-500 text-sm">—</span>;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
      {label}
      <button type="button" onClick={onRemove} className="ml-0.5 hover:text-indigo-900 dark:hover:text-indigo-100 transition">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type Accent = 'indigo' | 'emerald' | 'violet' | 'amber';

const ACCENT: Record<Accent, { grad: string; iconBg: string; iconColor: string; border: string }> = {
  indigo:  { grad: 'from-indigo-500/10 to-indigo-500/5 dark:from-indigo-500/20 dark:to-transparent',   iconBg: 'bg-indigo-500/15 dark:bg-indigo-500/25',  iconColor: 'text-indigo-600 dark:text-indigo-400',  border: 'border-indigo-200/60 dark:border-indigo-800/40' },
  emerald: { grad: 'from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-transparent', iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/25', iconColor: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/60 dark:border-emerald-800/40' },
  violet:  { grad: 'from-violet-500/10 to-violet-500/5 dark:from-violet-500/20 dark:to-transparent',   iconBg: 'bg-violet-500/15 dark:bg-violet-500/25',   iconColor: 'text-violet-600 dark:text-violet-400',  border: 'border-violet-200/60 dark:border-violet-800/40' },
  amber:   { grad: 'from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-transparent',      iconBg: 'bg-amber-500/15 dark:bg-amber-500/25',    iconColor: 'text-amber-600 dark:text-amber-400',    border: 'border-amber-200/60 dark:border-amber-800/40' },
};

function KpiCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; accent: Accent }) {
  const a = ACCENT[accent];
  return (
    <div className={`rounded-2xl border ${a.border} bg-gradient-to-br ${a.grad} bg-white dark:bg-zinc-900/80 p-5 shadow-sm hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-[0.1em]">{label}</p>
          <p className="mt-2.5 text-[1.75rem] font-bold text-slate-900 dark:text-zinc-50 tabular-nums leading-none tracking-tight">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-slate-400 dark:text-zinc-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${a.iconBg}`}>
          <Icon className={`h-5 w-5 ${a.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Customer Drawer ──────────────────────────────────────────────────────────

function CustomerDrawer({
  customer, appointments, loading, allCustomers,
  recall, onRecallChange, onClose, onSchedule, onDelete,
}: {
  customer: Patient | null;
  appointments: CompletedAppointmentRow[];
  loading: boolean;
  allCustomers: Patient[];
  recall: RecallEntry;
  onRecallChange: (r: RecallEntry) => void;
  onClose: () => void;
  onSchedule: () => void;
  onDelete: () => void;
}) {
  const suggestions = useMemo(() => computeSuggestions(customer, allCustomers), [customer, allCustomers]);
  const statusBadge = customer ? getStatusBadgeStyle(customer.status) : null;
  const avatarColor = customer ? getAvatarColor(customer.id) : 'bg-slate-400';
  const initials = getInitials(customer?.full_name);
  const daysAgo = daysSince(customer?.last_visit_date ?? null);

  const SUGGESTION_CLS: Record<string, string> = {
    amber:   'bg-amber-50 border-amber-200/70 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-300',
    indigo:  'bg-indigo-50 border-indigo-200/70 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800/40 dark:text-indigo-300',
    emerald: 'bg-emerald-50 border-emerald-200/70 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/40 dark:text-emerald-300',
    slate:   'bg-slate-50 border-slate-200/70 text-slate-600 dark:bg-zinc-800/60 dark:border-zinc-700/60 dark:text-zinc-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-zinc-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-[420px] bg-white dark:bg-zinc-900 border-s border-slate-200 dark:border-zinc-800 shadow-2xl overflow-y-auto flex flex-col"
        dir="rtl"
        style={{ animation: 'slideInFromRight 220ms ease-out forwards' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${avatarColor} text-white text-sm font-bold shrink-0`}>
              {initials}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-tight">{customer?.full_name ?? '...'}</h2>
              {statusBadge && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mt-0.5 ${statusBadge.cls}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition" aria-label="סגור">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {loading && !customer ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-indigo-500" />
            </div>
          ) : customer ? (
            <>
              {/* Contact info */}
              <section>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-2">פרטי קשר</p>
                <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 divide-y divide-slate-100 dark:divide-zinc-800">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Phone className="h-4 w-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                    <a href={`tel:${customer.phone}`} dir="ltr" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                      {formatPhoneILS(customer.phone)}
                    </a>
                  </div>
                  {daysAgo !== null && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Clock className="h-4 w-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                      <span className="text-sm text-slate-600 dark:text-zinc-300">
                        ביקור אחרון לפני <span className="font-semibold">{daysAgo}</span> ימים
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Revenue summary */}
              <section>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-2">סיכום פיננסי</p>
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-transparent border border-emerald-200/60 dark:border-emerald-800/30 p-4">
                  <p className="text-[2rem] font-bold text-slate-900 dark:text-zinc-50 tabular-nums leading-none">{formatCurrencyILS(Number(customer.total_revenue))}</p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">{customer.visits_count} ביקורים · ביקור אחרון {formatDate(customer.last_visit_date)}</p>
                </div>
              </section>

              {/* Suggested actions */}
              {suggestions.length > 0 && (
                <section>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.1em]">פעולות מוצעות</p>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${SUGGESTION_CLS[s.color]}`}>
                        <span className="mt-0.5 shrink-0">{s.icon}</span>
                        <span>{s.text}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recall / follow-up */}
              <section>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-2">מעקב וחזרה</p>
                <div className="rounded-xl border border-slate-200/80 dark:border-zinc-700/60 bg-slate-50/50 dark:bg-zinc-800/40 p-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      {recall.active
                        ? <BellRing className="h-4 w-4 text-indigo-500" />
                        : <Bell className="h-4 w-4 text-slate-400 dark:text-zinc-500" />}
                      <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">מסומן לפולואפ</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRecallChange({ ...recall, active: !recall.active })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${recall.active ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-zinc-700'}`}
                      aria-checked={recall.active}
                      role="switch"
                    >
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: recall.active ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </button>
                  </label>
                  {recall.active && (
                    <div>
                      <label className="text-xs text-slate-500 dark:text-zinc-400 mb-1 block">תאריך תזכורת</label>
                      <input
                        type="date"
                        value={recall.reminderDate}
                        onChange={(e) => onRecallChange({ ...recall, reminderDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        dir="rtl"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Appointment history */}
              {appointments.length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-2">
                    היסטוריית תורים ({appointments.length})
                  </p>
                  <div className="space-y-2">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">{formatDate(apt.datetime)}</p>
                          {apt.service_name && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{apt.service_name}</p>}
                          {apt.notes && <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{apt.notes}</p>}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200 tabular-nums whitespace-nowrap">
                          {apt.revenue != null ? formatCurrencyILS(apt.revenue) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Action buttons */}
              <section className="pt-1">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-2">פעולות</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-3 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition"
                  >
                    <Phone className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                    התקשר
                  </a>
                  <button
                    type="button"
                    onClick={() => window.open(`https://wa.me/972${(customer.phone ?? '').replace(/\D/g, '').replace(/^0/, '')}`, '_blank')}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 px-2 py-3 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition"
                  >
                    <MessageCircle className="h-4 w-4" />
                    וואטסאפ
                  </button>
                  <button
                    type="button"
                    onClick={onSchedule}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-3 text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"
                  >
                    <Calendar className="h-4 w-4" />
                    קבע תור
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onDelete}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-400 dark:text-zinc-500 hover:border-red-200 dark:hover:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition"
                >
                  <Archive className="h-4 w-4" /> ארכוב לקוח
                </button>
              </section>
            </>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Lead Drawer (fallback mode) ──────────────────────────────────────────────

function LeadDrawer({ lead, onClose, onWhatsApp, onBackToLeads, onDelete }: {
  lead: Lead;
  onClose: () => void;
  onWhatsApp: () => void;
  onBackToLeads: () => void;
  onDelete: () => void;
}) {
  const avatarColor = getAvatarColor(lead.id);
  const value = lead.estimated_deal_value ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-zinc-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-[420px] bg-white dark:bg-zinc-900 border-s border-slate-200 dark:border-zinc-800 shadow-2xl overflow-y-auto flex flex-col"
        dir="rtl"
        style={{ animation: 'slideInFromRight 220ms ease-out forwards' }}
      >
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${avatarColor} text-white text-sm font-bold shrink-0`}>
              {getInitials(lead.full_name)}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-tight">{lead.full_name || '—'}</h2>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mt-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">הושלם</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition" aria-label="סגור">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          <section>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-2">פרטי קשר</p>
            <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 divide-y divide-slate-100 dark:divide-zinc-800">
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone className="h-4 w-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                <a href={lead.phone ? `tel:${lead.phone}` : '#'} dir="ltr" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  {formatPhoneILS(lead.phone)}
                </a>
              </div>
              {lead.source && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 shrink-0">מקור</span>
                  <SourceBadge source={lead.source} />
                </div>
              )}
            </div>
          </section>

          {value > 0 && (
            <section>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-2">שווי</p>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-transparent border border-emerald-200/60 dark:border-emerald-800/30 p-4">
                <p className="text-[2rem] font-bold text-slate-900 dark:text-zinc-50 tabular-nums leading-none">{formatCurrencyILS(value)}</p>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">תאריך: {formatDate(lead.created_at)}</p>
              </div>
            </section>
          )}

          <section className="pt-1">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-2">פעולות</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={onWhatsApp}
                className="flex items-center justify-center gap-2 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition"
              >
                <MessageCircle className="h-4 w-4" /> וואטסאפ
              </button>
              <button
                type="button"
                onClick={onBackToLeads}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white transition"
              >
                <ArrowRight className="h-4 w-4" /> ללידים
              </button>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-400 dark:text-zinc-500 hover:border-red-200 dark:hover:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition"
            >
              <Trash2 className="h-4 w-4" /> מחק ליד
            </button>
          </section>
        </div>
      </div>
      <style>{`@keyframes slideInFromRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({
  searchInput, onSearch,
  filtersOpen, onToggleFilters, hasActiveFilters,
  downloadingTemplate, onDownload, onImport, onBackToLeads,
  filterPanelRef, filterPanelContent,
}: {
  searchInput: string; onSearch: (v: string) => void;
  filtersOpen: boolean; onToggleFilters: () => void; hasActiveFilters: boolean;
  downloadingTemplate: boolean; onDownload: () => void; onImport: () => void; onBackToLeads: () => void;
  filterPanelRef: React.RefObject<HTMLDivElement | null>;
  filterPanelContent: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" dir="rtl">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון..."
          className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 pr-11 pl-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 text-right shadow-sm transition"
          dir="rtl"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative" ref={filterPanelRef}>
          <button
            type="button"
            onClick={onToggleFilters}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium shadow-sm transition ${
              hasActiveFilters
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            סינון
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold">!</span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          {filtersOpen && filterPanelContent}
        </div>

        <button
          type="button"
          onClick={onDownload}
          disabled={downloadingTemplate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-sm transition disabled:opacity-60"
        >
          {downloadingTemplate
            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            : <Download className="h-3.5 w-3.5" />}
          הורד תבנית Excel
        </button>

        <button
          type="button"
          onClick={onImport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-sm transition"
        >
          <Upload className="h-3.5 w-3.5" /> ייבוא לקוחות
        </button>

        <button
          type="button"
          onClick={onBackToLeads}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-sm transition"
        >
          חזרה ללידים <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteConfirm({ title, body, onCancel, onConfirm, loading, confirmLabel, confirmIcon }: {
  title: string; body: string;
  onCancel: () => void; onConfirm: () => void;
  loading: boolean; confirmLabel: string; confirmIcon: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-zinc-950/70" onClick={onCancel} aria-hidden="true" />
      <div className="relative rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl text-right max-w-sm w-full" dir="rtl">
        <h3 className="font-semibold text-slate-900 dark:text-zinc-100">{title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{body}</p>
        <div className="mt-5 flex gap-2 justify-start">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 dark:border-zinc-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800">ביטול</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-xl bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-60 flex items-center gap-2">
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : confirmIcon}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomersTab() {
  const router = useRouter();

  // Data state
  const [customers, setCustomers] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [closedLeads, setClosedLeads] = useState<Lead[]>([]);
  const [closedLeadsLoading, setClosedLeadsLoading] = useState(false);

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [revenueMinInput, setRevenueMinInput] = useState('');
  const [lastVisitOver6, setLastVisitOver6] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [revenueMinFilter, setRevenueMinFilter] = useState('');
  const [revenueMaxFilter, setRevenueMaxFilter] = useState('');
  const [withRevenueOnly, setWithRevenueOnly] = useState(false);
  const [withoutValueOnly, setWithoutValueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('date_desc');
  const [sourceFilter, setSourceFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  // Detail / drawer state
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Patient | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailAppointments, setDetailAppointments] = useState<CompletedAppointmentRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Recall state (in-memory per session)
  const [recallMap, setRecallMap] = useState<Map<string, RecallEntry>>(new Map());

  // Messaging state
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));
  const clearSelected = () => setSelectedIds(new Set());

  // ── API calls ────────────────────────────────────────────────────────────────

  const downloadTemplate = useCallback(async () => {
    setDownloadingTemplate(true);
    try {
      const res = await fetch('/api/customers/export-template', { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'customers_import_template.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast('שגיאה בהורדת התבנית');
    } finally {
      setDownloadingTemplate(false);
    }
  }, []);

  const fetchClosedLeads = useCallback(async () => {
    setClosedLeadsLoading(true);
    const res = await fetch('/api/leads', { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as { leads?: Lead[] };
    setClosedLeads(res.ok && Array.isArray(json.leads) ? json.leads.filter((l) => l.status === 'Closed') : []);
    setClosedLeadsLoading(false);
  }, []);

  const fetchCustomers = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (revenueMinInput.trim()) {
      const n = Number(revenueMinInput.trim());
      if (!Number.isNaN(n)) params.set('revenueMin', String(n));
    }
    if (lastVisitOver6) params.set('lastVisitOver6', 'true');
    const res = await fetch(`/api/customers?${params.toString()}`, { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as { customers?: Patient[] };
    if (res.ok) setCustomers(json.customers ?? []);
    setLoading(false);
  }, [statusFilter, revenueMinInput, lastVisitOver6]);

  useEffect(() => { setLoading(true); fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { if (!loading && customers.length === 0) void fetchClosedLeads(); }, [loading, customers.length, fetchClosedLeads]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  useEffect(() => {
    if (!detailId) { setDetailCustomer(null); setDetailAppointments([]); return; }
    setDetailLoading(true);
    fetch(`/api/customers/${detailId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { customer?: Patient; appointments?: CompletedAppointmentRow[] }) => {
        setDetailCustomer(d.customer ?? null);
        setDetailAppointments(d.appointments ?? []);
      })
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  useEffect(() => {
    if (!filtersOpen) return;
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [filtersOpen]);

  // ── Filtered lists ───────────────────────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    let list = customers.filter((c) => {
      if (q) {
        const qd = q.replace(/\D/g, '');
        const name = (c.full_name ?? '').toLowerCase();
        const ph = (c.phone ?? '').replace(/\D/g, '');
        if (!name.includes(q) && !(qd ? ph.includes(qd) : (c.phone ?? '').toLowerCase().includes(q))) return false;
      }
      const ts = getCloseDatePatient(c) ? new Date(getCloseDatePatient(c)!).getTime() : 0;
      if (dateFrom && ts < new Date(dateFrom).setHours(0,0,0,0)) return false;
      if (dateTo   && ts > new Date(dateTo).setHours(23,59,59,999)) return false;
      const val = getValuePatient(c);
      if (revenueMinFilter !== '' && !Number.isNaN(+revenueMinFilter) && val < +revenueMinFilter) return false;
      if (revenueMaxFilter !== '' && !Number.isNaN(+revenueMaxFilter) && val > +revenueMaxFilter) return false;
      if (withRevenueOnly && val <= 0) return false;
      if (withoutValueOnly && val > 0) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      const da = new Date(getCloseDatePatient(a) ?? 0).getTime();
      const db = new Date(getCloseDatePatient(b) ?? 0).getTime();
      const va = getValuePatient(a), vb = getValuePatient(b);
      const na = (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he');
      switch (sortBy) {
        case 'date_desc': return db - da; case 'date_asc': return da - db;
        case 'value_desc': return vb - va; case 'value_asc': return va - vb;
        case 'name_az': return na; case 'name_za': return -na;
        default: return db - da;
      }
    });
  }, [customers, searchInput, dateFrom, dateTo, revenueMinFilter, revenueMaxFilter, withRevenueOnly, withoutValueOnly, sortBy]);

  const filteredClosedLeads = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    let list = closedLeads.filter((l) => {
      if (q) {
        const qd = q.replace(/\D/g, '');
        const name = (l.full_name ?? '').toLowerCase();
        const ph = (l.phone ?? '').replace(/\D/g, '');
        if (!name.includes(q) && !(qd ? ph.includes(qd) : (l.phone ?? '').toLowerCase().includes(q))) return false;
      }
      if (sourceFilter && l.source !== sourceFilter) return false;
      const ts = getCloseDateLead(l) ? new Date(getCloseDateLead(l)!).getTime() : 0;
      if (dateFrom && ts < new Date(dateFrom).setHours(0,0,0,0)) return false;
      if (dateTo   && ts > new Date(dateTo).setHours(23,59,59,999)) return false;
      const val = getValueLead(l);
      if (revenueMinFilter !== '' && !Number.isNaN(+revenueMinFilter) && val < +revenueMinFilter) return false;
      if (revenueMaxFilter !== '' && !Number.isNaN(+revenueMaxFilter) && val > +revenueMaxFilter) return false;
      if (withRevenueOnly && val <= 0) return false;
      if (withoutValueOnly && val > 0) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      const da = new Date(getCloseDateLead(a) ?? 0).getTime();
      const db = new Date(getCloseDateLead(b) ?? 0).getTime();
      const va = getValueLead(a), vb = getValueLead(b);
      const na = (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he');
      switch (sortBy) {
        case 'date_desc': return db - da; case 'date_asc': return da - db;
        case 'value_desc': return vb - va; case 'value_asc': return va - vb;
        case 'name_az': return na; case 'name_za': return -na;
        default: return db - da;
      }
    });
  }, [closedLeads, searchInput, sourceFilter, dateFrom, dateTo, revenueMinFilter, revenueMaxFilter, withRevenueOnly, withoutValueOnly, sortBy]);

  const hasActiveFilters = !!dateFrom || !!dateTo || revenueMinFilter !== '' || revenueMaxFilter !== ''
    || withRevenueOnly || withoutValueOnly || !!statusFilter || lastVisitOver6 || !!sourceFilter;

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setRevenueMinFilter(''); setRevenueMaxFilter('');
    setWithRevenueOnly(false); setWithoutValueOnly(false); setStatusFilter('');
    setLastVisitOver6(false); setSourceFilter(''); setSortBy('date_desc');
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const closeDrawer = () => { setDetailId(null); setDetailLead(null); setDetailCustomer(null); setDetailAppointments([]); };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/customers/${deleteId}`, { method: 'DELETE', credentials: 'include' });
    setDeleting(false); setDeleteId(null);
    if (res.ok) { setCustomers((p) => p.filter((c) => c.id !== deleteId)); if (detailId === deleteId) closeDrawer(); }
  };

  const handleDeleteLead = async () => {
    if (!deleteLeadId) return;
    setDeleting(true);
    const res = await fetch(`/api/leads/${deleteLeadId}`, { method: 'DELETE', credentials: 'include' });
    setDeleting(false); setDeleteLeadId(null);
    if (res.ok) { setClosedLeads((p) => p.filter((l) => l.id !== deleteLeadId)); if (detailLead?.id === deleteLeadId) closeDrawer(); }
  };

  const getRecall = (id: string): RecallEntry => recallMap.get(id) ?? { active: false, reminderDate: '' };
  const setRecall = (id: string, entry: RecallEntry) => setRecallMap((p) => new Map(p).set(id, entry));

  // ── KPI values ───────────────────────────────────────────────────────────────

  const kpiRevCustomers = filteredCustomers.reduce((s, c) => s + getValuePatient(c), 0);
  const kpiAvgCustomers = filteredCustomers.length > 0 ? kpiRevCustomers / filteredCustomers.length : 0;
  const kpiMonthCustomers = filteredCustomers.filter((c) => isThisMonth(getCloseDatePatient(c))).length;
  const kpiRevLeads = filteredClosedLeads.reduce((s, l) => s + getValueLead(l), 0);
  const kpiMonthLeads = filteredClosedLeads.filter((l) => isThisMonth(getCloseDateLead(l))).length;

  // ── Filter panel (shared) ────────────────────────────────────────────────────

  const filterPanel = (
    <div className="absolute left-0 top-full mt-2 z-30 w-80 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-4 space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'תאריך מ-', type: 'date', value: dateFrom, onChange: setDateFrom },
          { label: 'עד-',       type: 'date', value: dateTo,   onChange: setDateTo },
          { label: 'הכנסה מינ׳ (₪)', type: 'number', value: revenueMinFilter, onChange: setRevenueMinFilter, placeholder: '0' },
          { label: 'הכנסה מקס׳ (₪)', type: 'number', value: revenueMaxFilter, onChange: setRevenueMaxFilter, placeholder: '—' },
        ].map(({ label, type, value, onChange, placeholder }) => (
          <div key={label}>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">{label}</label>
            <input
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              dir="rtl"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">סטטוס</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none" dir="rtl">
            <option value="">הכל</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{PATIENT_STATUS_LABELS[s] ?? s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">מיון לפי</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none" dir="rtl">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {[
          { label: 'עם הכנסה בלבד', checked: withRevenueOnly, onChange: setWithRevenueOnly },
          { label: 'ביקור אחרון 6+ חודשים', checked: lastVisitOver6, onChange: setLastVisitOver6 },
        ].map(({ label, checked, onChange }) => (
          <label key={label} className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-slate-300 dark:border-zinc-600 text-indigo-500 focus:ring-indigo-500/30" />
            <span className="text-xs text-slate-600 dark:text-zinc-300">{label}</span>
          </label>
        ))}
      </div>

      {hasActiveFilters && (
        <button type="button" onClick={clearFilters} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
          נקה סינון
        </button>
      )}
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading && customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-indigo-500" />
        <p className="text-sm text-slate-500 dark:text-zinc-400">טוען לקוחות...</p>
      </div>
    );
  }

  // ── Empty / fallback to closed leads ─────────────────────────────────────────

  if (!loading && customers.length === 0) {
    if (closedLeadsLoading) {
      return (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-indigo-500" />
        </div>
      );
    }

    if (closedLeads.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 px-8 py-20 text-center" dir="rtl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
            <Users className="h-8 w-8 text-slate-400 dark:text-zinc-500" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-zinc-100">עדיין אין לקוחות</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-zinc-400">סגור ליד ראשון כדי להתחיל לבנות את רשימת הלקוחות שלך.</p>
          <button type="button" onClick={() => router.push('/dashboard')}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-6 py-3 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white transition">
            <ArrowRight className="h-4 w-4" /> חזרה ללידים
          </button>
        </div>
      );
    }

    // Closed leads fallback table
    return (
      <div className="space-y-6" dir="rtl">
        <Toolbar
          searchInput={searchInput} onSearch={setSearchInput}
          filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen(!filtersOpen)} hasActiveFilters={hasActiveFilters}
          downloadingTemplate={downloadingTemplate} onDownload={downloadTemplate}
          onImport={() => setImportModalOpen(true)} onBackToLeads={() => router.push('/dashboard')}
          filterPanelRef={filterRef} filterPanelContent={filterPanel}
        />

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {dateFrom && <FilterChip label={`מ- ${dateFrom}`} onRemove={() => setDateFrom('')} />}
            {dateTo && <FilterChip label={`עד ${dateTo}`} onRemove={() => setDateTo('')} />}
            {revenueMinFilter !== '' && <FilterChip label={`מינ׳ ₪${revenueMinFilter}`} onRemove={() => setRevenueMinFilter('')} />}
            {revenueMaxFilter !== '' && <FilterChip label={`מקס׳ ₪${revenueMaxFilter}`} onRemove={() => setRevenueMaxFilter('')} />}
            {withRevenueOnly && <FilterChip label="עם הכנסה" onRemove={() => setWithRevenueOnly(false)} />}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="סה״כ לקוחות"   value={String(filteredClosedLeads.length)}         icon={Users}       accent="indigo" />
          <KpiCard label="סה״כ הכנסות"   value={formatCurrencyILS(kpiRevLeads)}              icon={DollarSign}  accent="emerald" />
          <KpiCard label="ממוצע ללקוח"   value={filteredClosedLeads.length ? formatCurrencyILS(kpiRevLeads / filteredClosedLeads.length) : '—'} icon={TrendingUp} accent="violet" />
          <KpiCard label="טופלו החודש"   value={String(kpiMonthLeads)}                       icon={Calendar}    accent="amber" />
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/80 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-800/40">
            <div className="flex items-center gap-2.5">
              <UserCheck className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">לידים שטופלו</span>
              <span className="rounded-full bg-slate-100 dark:bg-zinc-700/80 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-zinc-400 tabular-nums">{filteredClosedLeads.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMessagingOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                שלח הודעה
              </button>
              <SortAsc className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-slate-600 dark:text-zinc-300 focus:outline-none" dir="rtl">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-right min-w-[600px]" dir="rtl">
              <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-zinc-800/95 backdrop-blur-sm text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                <tr className="border-b border-slate-100 dark:border-zinc-800">
                  <th className="py-3 px-5">לקוח</th>
                  <th className="py-3 px-4">טלפון</th>
                  <th className="py-3 px-4">מקור</th>
                  <th className="py-3 px-4">תאריך</th>
                  <th className="py-3 px-4">שווי</th>
                  <th className="py-3 px-4 w-12" />
                </tr>
              </thead>
              <tbody>
                {filteredClosedLeads.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400 dark:text-zinc-500">אין תוצאות</td></tr>
                ) : filteredClosedLeads.map((l) => (
                  <tr key={l.id} onClick={() => { setDetailLead(l); }}
                    className="border-b border-slate-50 dark:border-zinc-800/60 last:border-0 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 cursor-pointer transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getAvatarColor(l.id)} text-white text-xs font-bold`}>{getInitials(l.full_name)}</div>
                        <span className="font-medium text-slate-800 dark:text-zinc-100">{l.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <a href={l.phone ? `tel:${l.phone}` : '#'} onClick={(e) => e.stopPropagation()} dir="ltr" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">{formatPhoneILS(l.phone)}</a>
                    </td>
                    <td className="py-3.5 px-4"><SourceBadge source={l.source} /></td>
                    <td className="py-3.5 px-4 text-sm text-slate-500 dark:text-zinc-400">{formatDate(getCloseDateLead(l))}</td>
                    <td className="py-3.5 px-4 text-sm font-semibold text-slate-800 dark:text-zinc-200 tabular-nums">{getValueLead(l) > 0 ? formatCurrencyILS(getValueLead(l)) : '—'}</td>
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setDeleteLeadId(l.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {detailLead && (
          <LeadDrawer lead={detailLead} onClose={closeDrawer}
            onWhatsApp={() => window.open(`https://wa.me/972${(detailLead.phone ?? '').replace(/\D/g, '').replace(/^0/, '')}`, '_blank')}
            onBackToLeads={() => { closeDrawer(); router.push('/dashboard'); }}
            onDelete={() => { setDeleteLeadId(detailLead.id); closeDrawer(); }}
          />
        )}
        {deleteLeadId && (
          <DeleteConfirm title="מחיקת ליד" body="הליד יוסר מהרשימה. פעולה זו לא ניתנת לשחזור."
            onCancel={() => setDeleteLeadId(null)} onConfirm={handleDeleteLead} loading={deleting}
            confirmLabel="מחק" confirmIcon={<Trash2 className="h-4 w-4" />} />
        )}
        {messagingOpen && (
          <MessagingPanel customers={[]} selectedIds={new Set()} onClose={() => setMessagingOpen(false)} />
        )}
        {importModalOpen && <CustomersImportModal onClose={() => setImportModalOpen(false)} onSuccess={() => { setToast('ייבוא הושלם בהצלחה'); fetchCustomers(); }} />}
        {toast && <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-zinc-800 dark:bg-zinc-700 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-100 shadow-xl">{toast}</div>}
      </div>
    );
  }

  // ── Main customers view ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toolbar */}
      <Toolbar
        searchInput={searchInput} onSearch={setSearchInput}
        filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen(!filtersOpen)} hasActiveFilters={hasActiveFilters}
        downloadingTemplate={downloadingTemplate} onDownload={downloadTemplate}
        onImport={() => setImportModalOpen(true)} onBackToLeads={() => router.push('/dashboard')}
        filterPanelRef={filterRef} filterPanelContent={filterPanel}
      />

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {dateFrom && <FilterChip label={`מ- ${dateFrom}`} onRemove={() => setDateFrom('')} />}
          {dateTo && <FilterChip label={`עד ${dateTo}`} onRemove={() => setDateTo('')} />}
          {revenueMinFilter !== '' && <FilterChip label={`מינ׳ ₪${revenueMinFilter}`} onRemove={() => setRevenueMinFilter('')} />}
          {revenueMaxFilter !== '' && <FilterChip label={`מקס׳ ₪${revenueMaxFilter}`} onRemove={() => setRevenueMaxFilter('')} />}
          {withRevenueOnly && <FilterChip label="עם הכנסה" onRemove={() => setWithRevenueOnly(false)} />}
          {statusFilter && <FilterChip label={PATIENT_STATUS_LABELS[statusFilter] ?? statusFilter} onRemove={() => setStatusFilter('')} />}
          {lastVisitOver6 && <FilterChip label="ביקור 6+ חודשים" onRemove={() => setLastVisitOver6(false)} />}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="סה״כ לקוחות" value={String(filteredCustomers.length)} sub={`${customers.length} במערכת`} icon={Users}      accent="indigo" />
        <KpiCard label="סה״כ הכנסות" value={formatCurrencyILS(kpiRevCustomers)}                                    icon={DollarSign} accent="emerald" />
        <KpiCard label="ממוצע ללקוח" value={formatCurrencyILS(kpiAvgCustomers)}                                    icon={TrendingUp} accent="violet" />
        <KpiCard label="ביקורים החודש" value={String(kpiMonthCustomers)}                                           icon={Calendar}   accent="amber" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/80 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <UserCheck className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">רשימת לקוחות</span>
            <span className="rounded-full bg-slate-100 dark:bg-zinc-700/80 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-zinc-400 tabular-nums">{filteredCustomers.length}</span>
            {selectedIds.size > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                {selectedIds.size} נבחרו
                <button type="button" onClick={clearSelected} className="hover:text-indigo-900 dark:hover:text-indigo-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMessagingOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition shadow-sm ${
                selectedIds.size > 0
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              {selectedIds.size > 0 ? `שלח ל-${selectedIds.size}` : 'שלח הודעה'}
            </button>
            <SortAsc className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-slate-600 dark:text-zinc-300 focus:outline-none" dir="rtl">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-right min-w-[680px]" dir="rtl">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-zinc-800/95 backdrop-blur-sm text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              <tr className="border-b border-slate-100 dark:border-zinc-800">
                <th className="py-3 pr-4 pl-3 w-10" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.has(c.id))}
                    onChange={(e) => e.target.checked ? selectAll(filteredCustomers.map((c) => c.id)) : clearSelected()}
                    className="rounded border-slate-300 dark:border-zinc-600 text-indigo-500 focus:ring-indigo-500/30"
                  />
                </th>
                <th className="py-3 px-4">לקוח</th>
                <th className="py-3 px-4">טלפון</th>
                <th className="py-3 px-4">ביקור אחרון</th>
                <th className="py-3 px-4">הכנסה</th>
                <th className="py-3 px-4">ביקורים</th>
                <th className="py-3 px-4">סטטוס</th>
                <th className="py-3 px-4 w-12" />
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-zinc-500">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">אין תוצאות</p>
                      {hasActiveFilters && <button type="button" onClick={clearFilters} className="text-xs text-indigo-500 hover:underline">נקה סינון</button>}
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.map((c) => {
                const recall = getRecall(c.id);
                const statusBadge = getStatusBadgeStyle(c.status);
                const isSelected = selectedIds.has(c.id);
                return (
                  <tr key={c.id} onClick={() => { setDetailLead(null); setDetailId(c.id); }}
                    className={`border-b border-slate-50 dark:border-zinc-800/60 last:border-0 cursor-pointer transition-colors group ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/15' : 'hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10'}`}>
                    <td className="py-3.5 pr-4 pl-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(c.id)}
                        className="rounded border-slate-300 dark:border-zinc-600 text-indigo-500 focus:ring-indigo-500/30"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getAvatarColor(c.id)} text-white text-xs font-bold`}>
                          {getInitials(c.full_name)}
                          {recall.active && (
                            <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 border-2 border-white dark:border-zinc-900">
                              <BellRing className="h-2 w-2 text-white" />
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-zinc-100 truncate max-w-[160px]">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} dir="ltr" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">{formatPhoneILS(c.phone)}</a>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-slate-500 dark:text-zinc-400">{formatDate(c.last_visit_date)}</td>
                    <td className="py-3.5 px-4 text-sm font-semibold text-slate-800 dark:text-zinc-200 tabular-nums">{formatCurrencyILS(Number(c.total_revenue))}</td>
                    <td className="py-3.5 px-4 text-sm text-slate-500 dark:text-zinc-400 tabular-nums">{c.visits_count}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.cls}`}>{statusBadge.label}</span>
                    </td>
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setDeleteId(c.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer drawer */}
      {detailId && (
        <CustomerDrawer
          customer={detailCustomer} appointments={detailAppointments} loading={detailLoading} allCustomers={customers}
          recall={getRecall(detailId)} onRecallChange={(r) => setRecall(detailId, r)}
          onClose={closeDrawer} onSchedule={() => { closeDrawer(); router.push('/dashboard/calendar'); }}
          onDelete={() => { setDeleteId(detailId); closeDrawer(); }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <DeleteConfirm title="ארכוב לקוח" body="הלקוח יועבר לארכיון (מחיקה רכה). ניתן לשחזר בהמשך."
          onCancel={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting}
          confirmLabel="ארכב" confirmIcon={<Archive className="h-4 w-4" />} />
      )}

      {/* Messaging panel */}
      {messagingOpen && (
        <MessagingPanel
          customers={customers}
          selectedIds={selectedIds}
          onClose={() => setMessagingOpen(false)}
        />
      )}

      {/* Import modal */}
      {importModalOpen && (
        <CustomersImportModal onClose={() => setImportModalOpen(false)} onSuccess={() => { setToast('ייבוא הושלם בהצלחה'); fetchCustomers(); }} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-zinc-800 dark:bg-zinc-700 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-100 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
