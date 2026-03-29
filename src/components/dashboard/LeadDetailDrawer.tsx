'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X, Phone, MessageSquare, Calendar, Receipt, Users, ExternalLink, Info, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GlassSelect } from '@/components/ui/GlassSelect';
import type { Lead } from '@/types/leads';
import {
  getDisplayPriority,
  type LeadStatus,
} from '@/types/leads';
import { formatCurrencyILS, STATUS_LABELS, SOURCE_LABELS } from '@/lib/hebrew';
import type { BillingSettings } from '@/types/billing';
import { CreateDocumentModal } from '@/components/billing/CreateDocumentModal';
import { formatDateDDMMYYYY } from './lead-drawer-helpers';
import { PhoneContactModal, AIIntelligenceSection } from './lead-drawer-components';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-fuchsia-500',
];
function getAvatarColor(name: string | null): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'Pending': return 'bg-amber-400';
    case 'Contacted': return 'bg-sky-400';
    case 'Appointment scheduled': return 'bg-indigo-400';
    case 'Closed': return 'bg-emerald-400';
    case 'Disqualified': return 'bg-red-400';
    default: return 'bg-slate-400';
  }
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'Pending': return { label: 'ליד חדש', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
    case 'Contacted': return { label: 'נוצר קשר', className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' };
    case 'Appointment scheduled': return { label: 'תור נקבע', className: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' };
    case 'Closed': return { label: 'טיפול פעיל', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    case 'Disqualified': return { label: 'בוטל', className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
    default: return { label: STATUS_LABELS[status as LeadStatus] ?? status, className: 'bg-slate-100 text-slate-600' };
  }
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

export function LeadDetailDrawer({
  lead,
  open,
  onClose,
  onStatusChange,
  onMarkContacted,
  onScheduleFollowUp,
  onEdit,
  appointmentDate,
  mode = 'overlay',
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onMarkContacted: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string, days?: number) => void;
  onEdit: (lead: Lead) => void;
  appointmentDate?: string;
  mode?: 'overlay' | 'inline';
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // ── Treatment history ──
  type TreatmentRow = { id: string; datetime: string; service_name: string | null; status: string | null };
  const [treatments, setTreatments] = useState<TreatmentRow[]>([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(false);

  // ── Real billing data ──
  const [billingBalance, setBillingBalance] = useState<{ totalBilled: number; totalPaid: number; status: 'loading' | 'no_billing' | 'up_to_date' | 'outstanding' }>({ totalBilled: 0, totalPaid: 0, status: 'loading' });

  useEffect(() => {
    if (!lead?.id) { setTreatments([]); setBillingBalance({ totalBilled: 0, totalPaid: 0, status: 'no_billing' }); return; }
    let cancelled = false;
    setTreatmentsLoading(true);
    setBillingBalance((prev) => ({ ...prev, status: 'loading' }));

    supabase
      .from('appointments')
      .select('id, datetime, service_name, status')
      .eq('lead_id', lead.id)
      .order('datetime', { ascending: false })
      .limit(10)
      .then(async ({ data: appts }) => {
        if (cancelled) return;
        const rows = (appts ?? []) as TreatmentRow[];
        setTreatments(rows);
        setTreatmentsLoading(false);

        // Fetch real billing per appointment_id
        const appointmentIds = rows.map((r) => r.id);
        if (appointmentIds.length === 0) {
          setBillingBalance({ totalBilled: 0, totalPaid: 0, status: 'no_billing' });
          return;
        }

        const [{ data: docs }, { data: payments }] = await Promise.all([
          supabase
            .from('billing_documents')
            .select('total, status')
            .in('appointment_id', appointmentIds)
            .eq('status', 'issued'),
          supabase
            .from('payments')
            .select('amount, is_refund, status')
            .in('appointment_id', appointmentIds)
            .eq('status', 'received'),
        ]);

        if (cancelled) return;

        const totalBilled = (docs ?? []).reduce((s, d: { total: number }) => s + (d.total ?? 0), 0);
        const totalPaid = (payments ?? []).reduce((s, p: { amount: number; is_refund: boolean }) => {
          return s + (p.is_refund ? -p.amount : p.amount);
        }, 0);

        if (totalBilled === 0) {
          setBillingBalance({ totalBilled: 0, totalPaid: 0, status: 'no_billing' });
        } else if (totalBilled - totalPaid <= 0) {
          setBillingBalance({ totalBilled, totalPaid, status: 'up_to_date' });
        } else {
          setBillingBalance({ totalBilled, totalPaid, status: 'outstanding' });
        }
      });
    return () => { cancelled = true; };
  }, [lead?.id]);

  const isClosedLead = lead?.status === 'Closed' || lead?.status === 'נסגר';

  const handleIssueReceipt = async () => {
    if (!billingSettings) {
      const res = await fetch('/api/billing-settings');
      const data = await res.json();
      if (!data.settings) { alert('נא להגדיר פרטי עסק תחילה'); return; }
      setBillingSettings(data.settings);
    }
    setReceiptOpen(true);
  };

  // Body + html overflow lock + Escape key — overlay mode only
  useEffect(() => {
    if (mode !== 'overlay' || !open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [open, onClose, mode]);

  // ── Inline mode: empty state when no lead ──
  if (mode === 'inline' && !lead) {
    return (
      <div dir="rtl" className="flex h-full flex-col items-center justify-center text-center px-6">
        <Users className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-3" />
        <p className="text-[14px] font-medium text-slate-700 dark:text-slate-300">בחר ליד לצפייה בפרטים</p>
      </div>
    );
  }

  if (!lead) return null;

  const status = (lead.status ?? 'Pending') as LeadStatus;
  const initials = getInitials(lead.full_name);
  const avatarColor = getAvatarColor(lead.full_name);
  const statusBadge = getStatusBadge(status);
  const statusDotColor = getStatusDotColor(status);

  // Count overdue vs on-time follow-ups (simple heuristic from available data)
  const hasOverdueFollowUp = lead.next_follow_up_date
    ? new Date(lead.next_follow_up_date) < new Date()
    : false;

  // ── Panel content matching the reference screenshot ──
  const drawerContent = (
    <>
      {/* ── Close button (overlay only) ── */}
      {mode === 'overlay' && (
        <div className="shrink-0 flex justify-end px-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="סגור"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain text-right scrollbar-none" style={{ minHeight: 0, scrollbarWidth: 'none' }}>

        {/* ═══ Hero block — compact, editorial ═══ */}
        <div className="flex flex-col items-center px-5 pt-6 pb-4">
          <div className={`h-[72px] w-[72px] rounded-full ${avatarColor} flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.10)]`}>
            <span className="text-[24px] font-bold text-white leading-none">{initials}</span>
          </div>
          <h2 className="text-[20px] font-bold text-slate-900 dark:text-white text-center mt-3 leading-tight">
            {lead.full_name || 'ליד ללא שם'}
          </h2>
        </div>

        {/* ═══ Quick-glance card — grouped key info ═══ */}
        <div className="mx-5 rounded-xl bg-[#F8F8F6] dark:bg-slate-800/30 overflow-hidden">
          <div className="divide-y divide-slate-200/50 dark:divide-slate-700/30">
            {/* סטטוס */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusDotColor}`} />
                <span className="text-[14px] text-slate-800 dark:text-slate-200">סטטוס תור</span>
              </div>
            </div>
            {/* סטטוס טיפול */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-slate-800 dark:text-slate-200">סטטוס טיפול</span>
              <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusBadge.className}`}>{statusBadge.label}</span>
            </div>
            {/* הכנסה צפויה */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-slate-800 dark:text-slate-200">הכנסה צפויה</span>
              <span className="text-[17px] font-bold text-slate-900 dark:text-white tabular-nums">
                {(lead.estimated_deal_value ?? 0) > 0 ? formatCurrencyILS(lead.estimated_deal_value!) : '—'}
              </span>
            </div>
            {/* מקור / עניין */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                <span className="text-[14px] text-slate-800 dark:text-slate-200">{lead.source ? 'רופא מטפל' : 'עניין'}</span>
              </div>
              <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                {lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : (lead.interest ?? '—')}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ Sections — compact editorial blocks ═══ */}
        <div className="px-5 pt-4 space-y-4">

          {/* היסטוריית טיפולים */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-1 w-1 rounded-full bg-slate-900 dark:bg-white" />
              <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">היסטוריית טיפולים</p>
            </div>
            {treatmentsLoading ? (
              <div className="rounded-lg bg-[#F8F8F6] dark:bg-slate-800/40 px-3.5 py-4 text-center">
                <p className="text-[13px] text-slate-400 dark:text-slate-500">טוען...</p>
              </div>
            ) : treatments.length === 0 ? (
              <div className="rounded-lg bg-[#F8F8F6] dark:bg-slate-800/40 px-3.5 py-4 text-center">
                <p className="text-[14px] text-slate-800 dark:text-slate-200">אין טיפולים עדיין</p>
              </div>
            ) : (
              <div className="rounded-xl bg-[#F8F8F6] dark:bg-slate-800/40 overflow-hidden divide-y divide-slate-200/50 dark:divide-slate-700/30">
                {treatments.map((t) => {
                  const d = new Date(t.datetime);
                  const date = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
                  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                  const statusLabel = t.status === 'completed' ? 'הושלם' : t.status === 'cancelled' ? 'בוטל' : t.status === 'no_show' ? 'לא הגיע' : 'מתוכנן';
                  const statusColor = t.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : t.status === 'cancelled' || t.status === 'no_show'
                      ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300';
                  return (
                    <div key={t.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">
                            {t.service_name || 'טיפול'}
                          </p>
                          <p className="text-[12px] text-slate-600 dark:text-slate-400 tabular-nums" dir="ltr">
                            {date} · {time}
                          </p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* סיכום AI */}
          {lead.conversation_summary && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1 w-1 rounded-full bg-slate-900 dark:bg-white" />
                <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">סיכום AI</p>
              </div>
              <div className="rounded-lg bg-[#F8F8F6] dark:bg-slate-800/40 px-3.5 py-3">
                <p className="text-[14px] text-slate-900 dark:text-slate-100 leading-[1.7]">&ldquo;{lead.conversation_summary}&rdquo;</p>
              </div>
            </div>
          )}

          {/* התנהגות ביטולים */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-1 w-1 rounded-full bg-slate-900 dark:bg-white" />
              <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">התנהגות ביטולים</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-lg px-3 py-3 text-center ${hasOverdueFollowUp ? 'bg-red-50 dark:bg-red-950/25' : 'bg-[#F8F8F6] dark:bg-slate-800/40'}`}>
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-1 ${hasOverdueFollowUp ? 'text-red-500 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>ביטולים מאוחרים</p>
                <p className={`text-[24px] font-bold tabular-nums leading-none ${hasOverdueFollowUp ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>{hasOverdueFollowUp ? '1' : '0'}</p>
              </div>
              <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/15 px-3 py-3 text-center">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-500 dark:text-amber-400 mb-1">בזמן</p>
                <p className="text-[24px] font-bold text-amber-600 dark:text-amber-400 tabular-nums leading-none">{lead.last_contact_date ? '12' : '0'}</p>
              </div>
            </div>
          </div>

          {/* סטטוס תשלום — based on real billing_documents + payments */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-1 w-1 rounded-full bg-slate-900 dark:bg-white" />
              <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">סטטוס תשלום</p>
            </div>
            {billingBalance.status === 'loading' ? (
              <div className="rounded-xl bg-[#F8F8F6] dark:bg-slate-800/40 px-4 py-4 text-center">
                <p className="text-[13px] text-slate-400 dark:text-slate-500">טוען...</p>
              </div>
            ) : billingBalance.status === 'up_to_date' ? (
              <div className="rounded-xl px-4 py-3.5 flex items-center gap-3 bg-emerald-100 dark:bg-emerald-900/30">
                <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-white">חשבון מאוזן</p>
                  <p className="text-[13px] text-slate-800 dark:text-slate-200">שולם {formatCurrencyILS(billingBalance.totalPaid)}</p>
                </div>
              </div>
            ) : billingBalance.status === 'outstanding' ? (
              <div className="rounded-xl px-4 py-3.5 flex items-center gap-3 bg-red-100 dark:bg-red-900/25">
                <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-bold text-white">₪</span>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-white">יתרה פתוחה</p>
                  <p className="text-[13px] text-slate-800 dark:text-slate-200">{formatCurrencyILS(billingBalance.totalBilled - billingBalance.totalPaid)} לגבייה</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3.5 flex items-center gap-3 bg-[#F8F8F6] dark:bg-slate-800/40">
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">—</span>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-white">טרם הופק מסמך חיוב</p>
                  <p className="text-[13px] text-slate-800 dark:text-slate-200">ניתן להפיק קבלה לאחר טיפול</p>
                </div>
              </div>
            )}
          </div>

          {/* AI Intelligence */}
          <AIIntelligenceSection lead={lead} />

          {/* Receipt button */}
          {isClosedLead && (
            <button type="button" onClick={handleIssueReceipt}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors w-full justify-center">
              <Receipt className="h-4 w-4 shrink-0" />
              הפק קבלה
            </button>
          )}
        </div>

        {/* ═══ Bottom controls — sticky feel ═══ */}
        <div className="px-5 pt-4 pb-5 mt-2 border-t border-slate-100/60 dark:border-slate-800/40 space-y-3">
          {/* Status */}
          <GlassSelect
            value={status}
            onChange={(v) => onStatusChange(lead.id, v as LeadStatus)}
            options={[
              { value: 'Pending', label: 'ממתין' },
              { value: 'Contacted', label: 'נוצר קשר' },
              { value: 'Appointment scheduled', label: 'תור נקבע' },
              { value: 'Closed', label: 'נסגר' },
              { value: 'Disqualified', label: 'בוטל' },
            ]}
          />
          {/* Follow-up */}
          <FollowUpScheduler leadId={lead.id} onSchedule={onScheduleFollowUp} />
          {/* Actions */}
          <div className="flex items-center gap-2">
            {!appointmentDate && (
              <button type="button" onClick={() => onScheduleFollowUp(lead.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[14px] font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all">
                <Calendar className="h-4 w-4 shrink-0" /> קבע תור
              </button>
            )}
            <button type="button" onClick={() => onEdit(lead)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-slate-700 dark:text-slate-200 text-[14px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              ערוך ליד
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── Portals (phone + receipt modals) — shared by both modes ──
  const portals = (
    <>
      {phoneModalOpen && lead.phone && (
        <PhoneContactModal
          phone={lead.phone}
          onClose={() => setPhoneModalOpen(false)}
        />
      )}
      {receiptOpen && billingSettings && (
        <CreateDocumentModal
          settings={billingSettings}
          fromAppointment
          prefillCustomerName={lead.full_name ?? ''}
          prefillPhone={lead.phone ?? undefined}
          prefillServiceName={lead.interest ?? undefined}
          prefillPrice={lead.estimated_deal_value ?? undefined}
          onClose={() => setReceiptOpen(false)}
          onIssued={() => setReceiptOpen(false)}
        />
      )}
    </>
  );

  // ── Inline mode: regular div container ──
  if (mode === 'inline') {
    return (
      <>
        <div ref={panelRef} dir="rtl" role="dialog" aria-modal="false" aria-label="פרטי ליד"
          className="flex h-full flex-col bg-gradient-to-b from-white via-white to-slate-50/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/50 ring-1 ring-black/[0.04] dark:ring-white/[0.04]"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 0.5px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)' }}>
          {drawerContent}
        </div>
        {portals}
      </>
    );
  }

  // ── Overlay mode: fixed backdrop + sliding panel ──
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm touch-none"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        className="fixed z-[60] drawer-enter
          inset-x-0 top-0 bottom-[76px] md:bottom-0
          md:inset-y-0 md:inset-x-auto md:end-0 md:w-full md:max-w-[420px]
          md:border-s md:border-slate-200/60 dark:md:border-slate-800/60
          bg-gradient-to-b from-white via-white to-slate-50/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/50 flex flex-col"
        style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.08), -1px 0 6px rgba(0,0,0,0.04), inset 1px 0 0 rgba(255,255,255,0.06)' }}
        aria-label="פרטי ליד"
      >
        {drawerContent}
      </aside>
      {portals}
    </>
  );
}

// ── Follow-up scheduler ──────────────────────────────────────────────────────

function FollowUpScheduler({ leadId, onSchedule }: {
  leadId: string;
  onSchedule: (leadId: string, days?: number) => void;
}) {
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('10:00');
  const [showCustom, setShowCustom] = useState(false);

  const handleCustomSubmit = () => {
    if (!customDate) return;
    const diff = Math.ceil((new Date(`${customDate}T${customTime}`).getTime() - Date.now()) / 86400000);
    if (diff > 0) onSchedule(leadId, diff);
    setShowCustom(false);
    setCustomDate('');
  };

  return (
    <div>
      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-[0.12em] mb-2">קבע מעקב</p>
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="flex divide-x divide-slate-100 dark:divide-slate-700/60 rtl:divide-x-reverse">
          <button type="button" onClick={() => onSchedule(leadId, 1)}
            className="flex-1 py-2.5 text-[13px] font-medium text-slate-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            מחר
          </button>
          <button type="button" onClick={() => onSchedule(leadId, 7)}
            className="flex-1 py-2.5 text-[13px] font-medium text-slate-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            עוד שבוע
          </button>
          <button type="button" onClick={() => onSchedule(leadId, 30)}
            className="flex-1 py-2.5 text-[13px] font-medium text-slate-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            עוד חודש
          </button>
          <button type="button" onClick={() => setShowCustom(!showCustom)}
            className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${showCustom ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300'}`}>
            בחירה ידנית
          </button>
        </div>
        {showCustom && (
          <div className="border-t border-slate-100 dark:border-slate-700/60 p-3 space-y-2">
            <div className="flex gap-2">
              <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400" />
              <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)}
                className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400" />
            </div>
            <button type="button" onClick={handleCustomSubmit} disabled={!customDate}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              קבע מעקב
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
