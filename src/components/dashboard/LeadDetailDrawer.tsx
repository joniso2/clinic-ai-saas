'use client';

import { useEffect, useState, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X, Mail, Phone, Calendar, Tag, DollarSign, Receipt, Users } from 'lucide-react';
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
  mode = 'overlay',
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onMarkContacted: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onEdit: (lead: Lead) => void;
  mode?: 'overlay' | 'inline';
}) {
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

  // Body overflow lock + Escape key — overlay mode only
  useEffect(() => {
    if (mode !== 'overlay') return;
    if (open) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handler);
        document.body.style.overflow = '';
      };
    }
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
            className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="סגור"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-behavior-contain px-5 py-5 text-right">
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

          {/* ── Contact Details Section ── */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3">פרטי קשר</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              {/* Right column (first in DOM for RTL): email, phone, interest, deal value, receipt */}
              <div className="space-y-5">
                {lead.email && (
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2 justify-start">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">אימייל</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 break-all">{lead.email}</p>
                  </div>
                )}
                {lead.phone && (
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2 justify-start">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">טלפון</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      <button
                        type="button"
                        onClick={() => setPhoneModalOpen(true)}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                      >
                        {lead.phone}
                      </button>
                    </p>
                  </div>
                )}
                {lead.interest && (
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2 justify-start">
                      <Tag className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">עניין</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{lead.interest}</p>
                  </div>
                )}
                {(lead.estimated_deal_value ?? 0) > 0 && (
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2 justify-start">
                      <DollarSign className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">שווי עסקה</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatCurrencyILS(lead.estimated_deal_value!)}</p>
                  </div>
                )}

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
              </div>
              {/* Left column (second in DOM for RTL): created, last contact, next follow-up */}
              <div className="space-y-5">
                <div className="space-y-1.5 text-right">
                  <div className="flex items-center gap-2 justify-start">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">נוצר בתאריך</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatDateDDMMYYYY(lead.created_at)}</p>
                </div>
                {lead.last_contact_date && (
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2 justify-start">
                      <Calendar className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">קשר אחרון</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatDateDDMMYYYY(lead.last_contact_date)}</p>
                  </div>
                )}
                {lead.next_follow_up_date && (
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2 justify-start">
                      <Calendar className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">מעקב הבא</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatDateDDMMYYYY(lead.next_follow_up_date)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── AI Section ── */}
          <AIIntelligenceSection lead={lead} />

          {/* ── Timeline Section (status quick-actions) ── */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3">ציר זמן</p>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:border-slate-400 dark:focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-slate-500/50 transition-colors text-right"
              >
                <option value="Pending">ממתין</option>
                <option value="Contacted">נוצר קשר</option>
                <option value="Appointment scheduled">תור נקבע</option>
                <option value="Closed">נסגר</option>
                <option value="Disqualified">הוסר</option>
              </select>
              <div className="flex shrink-0 items-center gap-px rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-1 flex-row-reverse">
                <button
                  type="button"
                  onClick={() => onMarkContacted(lead.id)}
                  title="סמן נוצר קשר"
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-50 transition-colors flex-row-reverse"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">נוצר קשר</span>
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onClick={() => onScheduleFollowUp(lead.id)}
                  title="קבע מעקב"
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-50 transition-colors flex-row-reverse"
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">מעקב</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Fixed Footer (safe area on mobile) ── */}
      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 safe-area-bottom">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3">פעולות</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onScheduleFollowUp(lead.id)}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-indigo-600 text-white text-[14px] font-semibold hover:bg-indigo-700 transition-all duration-150"
          >
            <Calendar className="h-4 w-4 shrink-0" />
            קבע תור
          </button>
          <button
            type="button"
            onClick={() => onEdit(lead)}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all duration-150"
          >
            ערוך ליד
          </button>
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
      <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <aside
          ref={panelRef}
          dir="rtl"
          className="drawer-enter relative w-full sm:max-w-[420px] h-full max-h-[100dvh] md:max-h-none bg-white dark:bg-slate-950 border-s border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
          aria-label="פרטי ליד"
        >
          {drawerContent}
        </aside>
      </div>
      {portals}
    </>
  );
}
