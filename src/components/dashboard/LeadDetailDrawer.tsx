'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X, Phone, MessageSquare, Calendar, Receipt, Users, ExternalLink, Info, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ScheduleAppointmentModal } from '@/app/dashboard/ScheduleAppointmentModal';
import { PaymentFlowModal } from '@/components/billing/PaymentFlowModal';
import { PAYMENT_METHOD_LABELS } from '@/types/billing';
import type { PaymentMethod } from '@/types/billing';
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
    case 'Appointment scheduled': return 'bg-emerald-400';
    case 'Closed': return 'bg-red-400';
    case 'Disqualified': return 'bg-red-400';
    default: return 'bg-slate-400';
  }
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'Pending': return { label: 'ליד חדש', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
    case 'Contacted': return { label: 'נוצר קשר', className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' };
    case 'Appointment scheduled': return { label: 'תור נקבע', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    case 'Closed': return { label: 'נסגר', className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
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
  onScheduleAppointment,
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
  onScheduleAppointment?: (lead: Lead) => void;
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
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
  const [confirmCancelAptId, setConfirmCancelAptId] = useState<string | null>(null);

  const handleCancelAppointment = async (aptId: string) => {
    setCancellingAptId(aptId);
    setConfirmCancelAptId(null);
    try {
      const res = await fetch(`/api/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        setTreatments((prev) => prev.map((t) => t.id === aptId ? { ...t, status: 'cancelled' } : t));
        if (lead) {
          onStatusChange(lead.id, 'Contacted' as LeadStatus);
        }
      }
    } catch { /* ignore */ }
    setCancellingAptId(null);
  };

  // ── Payment data (deal-driven) ──
  type PaymentRow = { id: string; amount: number; payment_method: string; payment_date: string; status: string; is_refund: boolean; notes: string | null };
  const [paymentState, setPaymentState] = useState<{
    dealValue: number;        // lead.estimated_deal_value or fallback to billing docs total
    totalPaid: number;        // sum of received payments
    pendingAmount: number;    // sum of pending payments
    status: 'loading' | 'no_deal' | 'up_to_date' | 'outstanding';
  }>({ dealValue: 0, totalPaid: 0, pendingAmount: 0, status: 'loading' });
  // Keep billingBalance as alias for backward compat in template
  const billingBalance = { totalBilled: paymentState.dealValue, totalPaid: paymentState.totalPaid, pendingAmount: paymentState.pendingAmount, status: paymentState.status === 'no_deal' ? 'no_billing' as const : paymentState.status };
  const [paymentHistory, setPaymentHistory] = useState<PaymentRow[]>([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [appointmentIds, setAppointmentIds] = useState<string[]>([]);

  const fetchBillingData = async (leadId: string, signal?: { cancelled: boolean }) => {
    try {
      setPaymentState((prev) => ({ ...prev, status: 'loading' }));
      setTreatmentsLoading(true);

      // Fetch appointments for this lead directly (single query, DB-filtered)
      const aptRes = await fetch(`/api/appointments?lead_id=${encodeURIComponent(leadId)}`, { credentials: 'include' })
        .then((r) => r.ok ? r.json() : { appointments: [] })
        .catch(() => ({ appointments: [] }));
      const rows: TreatmentRow[] = ((aptRes.appointments ?? []) as { id: string; datetime: string; service_name: string | null; status: string | null }[])
        .map((a) => ({ id: a.id, datetime: a.datetime, service_name: a.service_name, status: a.status }))
        .slice(0, 10);

      if (signal?.cancelled) return;

      setTreatments(rows);
      setTreatmentsLoading(false);

      const aptIds = rows.map((r) => r.id);
      setAppointmentIds(aptIds);

      // Fetch payments (linked to appointments if any)
      let paymentRows: PaymentRow[] = [];
      if (aptIds.length > 0) {
        const { data: allPayments } = await supabase
          .from('payments')
          .select('id, amount, payment_method, payment_date, status, is_refund, notes')
          .in('appointment_id', aptIds)
          .order('payment_date', { ascending: false });
        paymentRows = (allPayments ?? []) as PaymentRow[];
      }

      if (signal?.cancelled) return;
      setPaymentHistory(paymentRows);

      const totalPaid = paymentRows
        .filter((p) => p.status === 'received')
        .reduce((s, p) => s + (p.is_refund ? -p.amount : p.amount), 0);
      const pendingAmount = paymentRows
        .filter((p) => p.status === 'pending')
        .reduce((s, p) => s + p.amount, 0);

      // Deal value = primary source of truth for amount to collect
      const dealValue = lead?.estimated_deal_value ?? 0;

      // Fallback: if no deal value, try billing documents total
      let amountToCollect = dealValue;
      if (amountToCollect <= 0 && aptIds.length > 0) {
        const { data: docs } = await supabase
          .from('billing_documents')
          .select('total, status')
          .in('appointment_id', aptIds)
          .eq('status', 'issued');
        if (signal?.cancelled) return;
        amountToCollect = (docs ?? []).reduce((s, d: { total: number }) => s + (d.total ?? 0), 0);
      }

      if (amountToCollect <= 0 && totalPaid <= 0) {
        setPaymentState({ dealValue: 0, totalPaid: 0, pendingAmount: 0, status: 'no_deal' });
      } else if (amountToCollect - totalPaid <= 0) {
        setPaymentState({ dealValue: amountToCollect, totalPaid, pendingAmount, status: 'up_to_date' });
      } else {
        setPaymentState({ dealValue: amountToCollect, totalPaid, pendingAmount, status: 'outstanding' });
      }
    } catch (err) {
      console.error('[LeadDetailDrawer] fetchBillingData error:', err);
      if (!signal?.cancelled) {
        setTreatmentsLoading(false);
        setPaymentState({ dealValue: 0, totalPaid: 0, pendingAmount: 0, status: 'no_deal' });
      }
    }
  };

  useEffect(() => {
    if (!lead?.id) {
      setTreatments([]);
      setPaymentState({ dealValue: 0, totalPaid: 0, pendingAmount: 0, status: 'no_deal' });
      setPaymentHistory([]);
      setAppointmentIds([]);
      return;
    }
    const signal = { cancelled: false };
    fetchBillingData(lead.id, signal);
    return () => { signal.cancelled = true; };
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
    <div className="flex flex-col flex-1 min-h-0">
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

        {/* ═══ Hero block — horizontal, compact ═══ */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3">
          <div className={`h-11 w-11 rounded-xl ${avatarColor} flex items-center justify-center shrink-0 shadow-sm`}>
            <span className="text-[15px] font-bold text-white leading-none">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-bold text-slate-900 dark:text-white truncate leading-tight">
              {lead.full_name || 'ליד ללא שם'}
            </h2>
            {lead.phone && (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[13px] text-slate-500 dark:text-slate-400 tabular-nums" dir="ltr">{lead.phone}</p>
                <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                  title="התקשר">
                  <Phone className="h-3 w-3" />
                </a>
                <a href={`https://wa.me/${lead.phone.replace(/\D/g, '').replace(/^0/, '972')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  title="WhatsApp">
                  <MessageSquare className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
          <span className={`rounded-full px-3.5 py-1.5 text-[15px] font-bold shrink-0 ${statusBadge.className}`}>{statusBadge.label}</span>
        </div>

        {/* ═══ Quick-glance card — grouped key info ═══ */}
        <div className="mx-5 rounded-xl bg-[#F8F8F6] dark:bg-slate-800/30 overflow-hidden">
          <div className="divide-y divide-slate-200/50 dark:divide-slate-700/30">
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
                <span className="text-[14px] text-slate-800 dark:text-slate-200">{lead.source ? 'מטפל' : 'עניין'}</span>
              </div>
              <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                {lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : (lead.interest ?? '—')}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ Sections — compact editorial blocks ═══ */}
        <div className="px-5 pt-4 space-y-4">

          {/* ═══ Upcoming appointments ═══ */}
          {(() => {
            const upcoming = treatments.filter((t) => t.status === 'scheduled');
            if (treatmentsLoading || upcoming.length === 0) return null;
            return (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="h-1 w-1 rounded-full bg-slate-900 dark:bg-white" />
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">תורים קרובים</p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/30 dark:bg-indigo-950/10 overflow-hidden divide-y divide-indigo-100/50 dark:divide-indigo-900/20">
                  {upcoming.map((t) => {
                    const d = new Date(t.datetime);
                    const date = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
                    const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={t.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Calendar className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">
                              {t.service_name || 'תור'}
                            </p>
                            <p className="text-[12px] text-indigo-600 dark:text-indigo-400 font-medium tabular-nums" dir="ltr">
                              {date} · {time}
                            </p>
                          </div>
                        </div>
                        {confirmCancelAptId === t.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCancelAppointment(t.id)}
                              disabled={cancellingAptId === t.id}
                              className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {cancellingAptId === t.id ? 'מבטל...' : 'אישור'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCancelAptId(null)}
                              className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              לא
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelAptId(t.id)}
                            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800/40 transition-colors"
                          >
                            בטל תור
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ═══ History (past appointments only) ═══ */}
          {(() => {
            const past = treatments.filter((t) => t.status !== 'scheduled');
            return (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="h-1 w-1 rounded-full bg-slate-900 dark:bg-white" />
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">היסטוריה</p>
                </div>
                {treatmentsLoading ? (
                  <div className="rounded-lg bg-[#F8F8F6] dark:bg-slate-800/40 px-3.5 py-4 text-center">
                    <p className="text-[13px] text-slate-400 dark:text-slate-500">טוען...</p>
                  </div>
                ) : past.length === 0 ? (
                  <div className="rounded-lg bg-[#F8F8F6] dark:bg-slate-800/40 px-3.5 py-4 text-center">
                    <p className="text-[14px] text-slate-800 dark:text-slate-200">לא קיים</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#F8F8F6] dark:bg-slate-800/40 overflow-hidden divide-y divide-slate-200/50 dark:divide-slate-700/30">
                    {past.map((t) => {
                      const d = new Date(t.datetime);
                      const date = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
                      const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                      const statusLabel = t.status === 'completed' ? 'הושלם' : t.status === 'cancelled' ? 'בוטל' : t.status === 'no_show' ? 'לא הגיע' : t.status ?? '';
                      const statusColor = t.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
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
            );
          })()}

          {/* סטטוס תשלום — after treatments */}
          {paymentState.status !== 'no_deal' && paymentState.status !== 'loading' && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1 w-1 rounded-full bg-slate-900 dark:bg-white" />
                <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">סטטוס תשלום</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
                <div className={`px-4 py-3.5 flex items-center gap-3 ${
                  billingBalance.status === 'up_to_date' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/15'
                }`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    billingBalance.status === 'up_to_date' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}>
                    {billingBalance.status === 'up_to_date' ? (
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    ) : (
                      <span className="text-[13px] font-bold text-white">₪</span>
                    )}
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[15px] font-bold text-slate-900 dark:text-white">
                      {billingBalance.status === 'up_to_date' ? 'חשבון מאוזן' : 'יתרה פתוחה'}
                    </p>
                    <p className="text-[13px] text-slate-600 dark:text-slate-300">
                      {billingBalance.status === 'up_to_date'
                        ? `שולם ${formatCurrencyILS(billingBalance.totalPaid)}`
                        : `${formatCurrencyILS(billingBalance.totalBilled - billingBalance.totalPaid)} לגבייה`}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-500 dark:text-slate-400">שווי עסקה</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrencyILS(billingBalance.totalBilled)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-500 dark:text-slate-400">שולם</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrencyILS(billingBalance.totalPaid)}</span>
                  </div>
                  {billingBalance.pendingAmount > 0 && (
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-slate-500 dark:text-slate-400">ממתין לאישור</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrencyILS(billingBalance.pendingAmount)}</span>
                    </div>
                  )}
                  {billingBalance.status === 'outstanding' && (
                    <div className="flex items-center justify-between text-[14px] pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-300 font-bold">יתרה</span>
                      <span className="font-black text-red-600 dark:text-red-400 tabular-nums">{formatCurrencyILS(billingBalance.totalBilled - billingBalance.totalPaid)}</span>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-2">
                  {billingBalance.status === 'outstanding' && (
                    <button type="button" onClick={() => setShowPaymentModal(true)}
                      className="flex-1 rounded-lg bg-slate-900 dark:bg-white px-3 py-2 text-[13px] font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-center">
                      בצע תשלום
                    </button>
                  )}
                  {paymentHistory.length > 0 && (
                    <button type="button" onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                      {showPaymentHistory ? 'הסתר היסטוריה' : `היסטוריה (${paymentHistory.length})`}
                    </button>
                  )}
                </div>
                {showPaymentHistory && paymentHistory.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
                    {paymentHistory.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 dark:border-slate-800/50 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${
                            p.status === 'received' ? 'bg-emerald-500' : p.status === 'pending' ? 'bg-amber-500' : p.status === 'failed' ? 'bg-red-500' : 'bg-slate-400'
                          }`} />
                          <div>
                            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                              {PAYMENT_METHOD_LABELS[p.payment_method as PaymentMethod] ?? p.payment_method}
                              {p.is_refund && <span className="text-red-500 ms-1">(החזר)</span>}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{p.payment_date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[13px] font-bold tabular-nums ${
                            p.is_refund ? 'text-red-600' : p.status === 'received' ? 'text-emerald-600 dark:text-emerald-400' : p.status === 'pending' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                          }`}>
                            {p.is_refund ? '-' : ''}₪{p.amount.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {p.status === 'received' ? 'שולם' : p.status === 'pending' ? 'ממתין' : p.status === 'failed' ? 'נכשל' : 'הוחזר'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* (Payment section moved to top of sections) */}

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

        {/* ═══ Bottom controls (inside scroll) ═══ */}
        <div className="px-5 pt-4 pb-4 mt-2 border-t border-slate-100/60 dark:border-slate-800/40 space-y-3">
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
          {/* Schedule appointment — right after status selector */}
          {(!appointmentDate || lead.status === 'Pending' || lead.status === 'Contacted') && (
            <button type="button" onClick={() => onScheduleAppointment ? onScheduleAppointment(lead) : onScheduleFollowUp(lead.id)}
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[14px] font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all">
              <Calendar className="h-4 w-4 shrink-0" /> קבע תור
            </button>
          )}
          {/* Follow-up */}
          <FollowUpScheduler leadId={lead.id} leadName={lead.full_name ?? undefined} followUpDate={lead.next_follow_up_date} onSchedule={onScheduleFollowUp} />
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onEdit(lead)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-slate-700 dark:text-slate-200 text-[14px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              ערוך ליד
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Portals (phone + receipt modals) — shared by both modes ──
  const portals = (
    <>
      {showPaymentModal && (
        <PaymentFlowModal
          leadName={lead.full_name ?? ''}
          appointmentIds={appointmentIds}
          remainingBalance={billingBalance.totalBilled - billingBalance.totalPaid}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchBillingData(lead.id);
          }}
        />
      )}
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
        className="fixed z-[60] modal-enter
          inset-3 md:inset-auto md:top-[3%] md:bottom-[3%] md:left-1/2 md:-translate-x-1/2
          md:w-full md:max-w-md
          rounded-2xl
          bg-gradient-to-b from-white via-white to-slate-50/80 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/50 shadow-2xl flex flex-col overflow-hidden"
        aria-label="פרטי ליד"
      >
        {drawerContent}
      </aside>
      {portals}
    </>
  );
}

// ── Follow-up scheduler ──────────────────────────────────────────────────────

function FollowUpScheduler({ leadId, leadName, followUpDate, onSchedule }: {
  leadId: string;
  leadName?: string;
  followUpDate?: string | null;
  onSchedule: (leadId: string, days?: number) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [justScheduled, setJustScheduled] = useState(false);

  const handleSchedule = (days: number) => {
    onSchedule(leadId, days);
    setJustScheduled(true);
    setTimeout(() => setJustScheduled(false), 3000);
  };

  const formatFollowUp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isOverdue = followUpDate ? new Date(followUpDate) < new Date() : false;

  return (
    <div>
      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-[0.12em] mb-2">קבע מעקב</p>

      {/* Show current follow-up status */}
      {justScheduled && (
        <div className="mb-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 px-3 py-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">נקבע מעקב בהצלחה</span>
        </div>
      )}

      {!justScheduled && followUpDate && (
        <div className={`mb-2 rounded-lg px-3 py-2 flex items-center gap-2 ${
          isOverdue
            ? 'bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40'
            : 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40'
        }`}>
          <span className={`h-2 w-2 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-indigo-500'}`} />
          <span className={`text-[13px] font-semibold ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
            {isOverdue ? 'מעקב באיחור — ' : 'מעקב נקבע ל-'}{formatFollowUp(followUpDate)}
          </span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="flex divide-x divide-slate-100 dark:divide-slate-700/60 rtl:divide-x-reverse">
          <button type="button" onClick={() => handleSchedule(1)}
            className="flex-1 py-2.5 text-[13px] font-medium text-slate-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            מחר
          </button>
          <button type="button" onClick={() => handleSchedule(7)}
            className="flex-1 py-2.5 text-[13px] font-medium text-slate-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            עוד שבוע
          </button>
          <button type="button" onClick={() => handleSchedule(30)}
            className="flex-1 py-2.5 text-[13px] font-medium text-slate-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            עוד חודש
          </button>
          <button type="button" onClick={() => setShowModal(true)}
            className="flex-1 py-2.5 text-[13px] font-medium text-slate-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            בחירה ידנית
          </button>
        </div>
      </div>

      {showModal && (
        <ScheduleAppointmentModal
          lead={{ id: leadId, full_name: leadName ?? null } as Lead}
          title="קביעת מעקב"
          submitLabel="קבע מעקב"
          appointmentType="follow_up"
          onClose={() => setShowModal(false)}
          onScheduled={() => {
            handleSchedule(7);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}


// FollowUpDateModal removed — now uses NewAppointmentForm directly
