'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X, Mail, Phone, Calendar, Tag, DollarSign, Receipt, Users, ExternalLink } from 'lucide-react';
import { GlassSelect } from '@/components/ui/GlassSelect';
import type { Lead } from '@/types/leads';
import {
  getDisplayPriority,
  type LeadStatus,
} from '@/types/leads';
import { formatCurrencyILS, STATUS_LABELS, PRIORITY_LABELS, SOURCE_LABELS } from '@/lib/hebrew';
import type { BillingSettings } from '@/types/billing';
import { CreateDocumentModal } from '@/components/billing/CreateDocumentModal';
import { PRIORITY_STYLES, formatDateDDMMYYYY } from './lead-drawer-helpers';
import { PhoneContactModal, AIIntelligenceSection } from './lead-drawer-components';

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
      <div dir="rtl" className="flex h-full flex-col items-center justify-center text-center">
        <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-[14px] text-slate-500 dark:text-slate-400">בחר ליד לצפייה בפרטים</p>
      </div>
    );
  }

  if (!lead) return null;

  const priority = getDisplayPriority(lead);
  const status = (lead.status ?? 'Pending') as LeadStatus;

  // ── Shared inner content (fixed header + scrollable body + fixed footer) ──
  const drawerContent = (
    <>
      {/* ── Fixed Header ── */}
      <div className="shrink-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-slate-900 dark:text-slate-50 text-right">
          {lead.full_name || 'ליד ללא שם'}
        </h2>
        {mode === 'overlay' && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            aria-label="סגור"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 text-right" style={{ minHeight: 0 }}>
        <div className="space-y-6">

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 flex-row-reverse justify-end">
            <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
              {PRIORITY_LABELS[priority] ?? priority}
            </span>
            <span className="rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              {STATUS_LABELS[status] ?? status}
            </span>
            {lead.source && (
              <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                {SOURCE_LABELS[lead.source] ?? lead.source}
              </span>
            )}
          </div>

          {/* ── Contact Details ── */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-2">פרטי קשר</p>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 divide-y divide-slate-100 dark:divide-slate-800">
              {lead.email && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">אימייל</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate max-w-[55%]">{lead.email}</p>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">טלפון</span>
                  </div>
                  <button type="button" onClick={() => setPhoneModalOpen(true)} className="text-sm font-semibold text-slate-900 dark:text-slate-50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {lead.phone}
                  </button>
                </div>
              )}
              {lead.interest && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">עניין</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{lead.interest}</p>
                </div>
              )}
              {(lead.estimated_deal_value ?? 0) > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">שווי עסקה</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatCurrencyILS(lead.estimated_deal_value!)}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Dates & Calendar ── */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-2">תאריכים</p>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">התקבל בתאריך</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatDateDDMMYYYY(lead.created_at)}</p>
              </div>
              {appointmentDate && (
                <button
                  type="button"
                  onClick={() => { onClose(); router.push(`/dashboard/calendar?date=${appointmentDate.slice(0, 10)}`); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">תור נקבע</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{formatDateDDMMYYYY(appointmentDate)}</p>
                    <ExternalLink className="h-3 w-3 text-emerald-400" />
                  </div>
                </button>
              )}
              {lead.next_follow_up_date && (
                <button
                  type="button"
                  onClick={() => { onClose(); router.push(`/dashboard/calendar?date=${lead.next_follow_up_date!.slice(0, 10)}`); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">מעקב הבא</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{formatDateDDMMYYYY(lead.next_follow_up_date)}</p>
                    <ExternalLink className="h-3 w-3 text-indigo-400" />
                  </div>
                </button>
              )}
            </div>
          </div>

          {isClosedLead && (
            <button
              type="button"
              onClick={handleIssueReceipt}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5
                text-sm font-semibold text-white shadow-sm transition-colors w-full justify-center"
            >
              <Receipt className="h-4 w-4 shrink-0" />
              הפק קבלה
            </button>
          )}

          {/* ── AI Section ── */}
          <AIIntelligenceSection lead={lead} />

          {/* ── Status ── */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-2">סטטוס</p>
            <GlassSelect
              value={status}
              onChange={(v) => onStatusChange(lead.id, v as LeadStatus)}
              options={[
                { value: 'Pending', label: 'ממתין' },
                { value: 'Contacted', label: 'נוצר קשר' },
                { value: 'Appointment scheduled', label: 'תור נקבע' },
                { value: 'Closed', label: 'נסגר' },
                { value: 'Disqualified', label: 'הוסר' },
              ]}
            />
          </div>

          {/* ── Follow-up scheduler ── */}
          <FollowUpScheduler leadId={lead.id} onSchedule={onScheduleFollowUp} />

          {/* ── Actions ── */}
          <div>
            <div className="flex items-center gap-2">
              {!appointmentDate && (
                <button
                  type="button"
                  onClick={() => onScheduleFollowUp(lead.id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 transition-all duration-150"
                >
                  <Calendar className="h-4 w-4 shrink-0" />
                  קבע תור
                </button>
              )}
              <button
                type="button"
                onClick={() => onEdit(lead)}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all duration-150"
              >
                ערוך ליד
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );

  // ── Portals (phone + receipt modals) — shared by both modes ──
  const portals = (
    <>
      {/* Phone Contact Modal */}
      {phoneModalOpen && lead.phone && (
        <PhoneContactModal
          phone={lead.phone}
          onClose={() => setPhoneModalOpen(false)}
        />
      )}

      {/* Receipt Modal */}
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

  // ── Inline mode: regular div container, no backdrop/fixed/animation ──
  if (mode === 'inline') {
    return (
      <>
        <div ref={panelRef} dir="rtl" role="dialog" aria-modal="false" aria-label="פרטי ליד" className="flex h-full flex-col bg-white dark:bg-slate-950">
          {drawerContent}
        </div>
        {portals}
      </>
    );
  }

  // ── Overlay mode (default): fixed backdrop + sliding panel ──
  if (!open) return null;
  return (
    <>
      {/* Backdrop — touch-none blocks iOS touch passthrough */}
      <div
        className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm touch-none"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel — mobile: stops above bottom nav, desktop: side drawer */}
      <aside
        ref={panelRef}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        className="fixed z-[60] drawer-enter
          inset-x-0 top-0 bottom-[76px] md:bottom-0
          md:inset-y-0 md:inset-x-auto md:end-0 md:w-full md:max-w-[420px]
          md:border-s md:border-slate-200 dark:md:border-slate-800
          bg-white dark:bg-slate-950 shadow-2xl flex flex-col"
        aria-label="פרטי ליד"
      >
        {drawerContent}
      </aside>
      {portals}
    </>
  );
}

// ── Follow-up scheduler with quick picks + custom date & time ──
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
      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-2">קבע מעקב</p>
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm shadow-sm overflow-hidden">
        {/* Quick picks */}
        <div className="flex divide-x divide-slate-100 dark:divide-slate-700/60 rtl:divide-x-reverse">
          <button type="button" onClick={() => onSchedule(leadId, 1)}
            className="flex-1 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            מחר
          </button>
          <button type="button" onClick={() => onSchedule(leadId, 7)}
            className="flex-1 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            עוד שבוע
          </button>
          <button type="button" onClick={() => onSchedule(leadId, 30)}
            className="flex-1 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            עוד חודש
          </button>
          <button type="button" onClick={() => setShowCustom(!showCustom)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${showCustom ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300'}`}>
            בחירה ידנית
          </button>
        </div>
        {/* Custom date + time picker */}
        {showCustom && (
          <div className="border-t border-slate-100 dark:border-slate-700/60 p-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400"
              />
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400"
              />
            </div>
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={!customDate}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              קבע מעקב
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
