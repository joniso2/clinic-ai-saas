'use client';

import { useEffect, useState } from 'react';
import { X, Mail, Phone, Calendar, Tag, DollarSign, Brain, AlertTriangle, Clock, Receipt, Sparkles, Users } from 'lucide-react';
import type { Lead } from '@/types/leads';
import {
  getDisplayPriority,
  type Priority,
  type LeadStatus,
} from '@/types/leads';
import { formatCurrencyILS, STATUS_LABELS, PRIORITY_LABELS, SOURCE_LABELS } from '@/lib/hebrew';
import type { BillingSettings } from '@/types/billing';
import { CreateDocumentModal } from '@/components/billing/CreateDocumentModal';

const PRIORITY_STYLES: Record<Priority, string> = {
  Low: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  Medium: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400',
  High: 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-400',
  Urgent: 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-400',
};

function formatDateDDMMYYYY(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const URGENCY_STYLES: Record<string, string> = {
  high:   'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50',
  medium: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50',
  low:    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50',
};

const PRIORITY_LEVEL_STYLES: Record<string, string> = {
  high:   'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400',
  medium: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
  low:    'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400',
};

function SlaDeadline({ value }: { value: string }) {
  const deadline = new Date(value);
  const passed = deadline < new Date();
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
      passed
        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50'
        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
    }`}>
      {passed && <AlertTriangle className="h-3 w-3 shrink-0" />}
      {!passed && <Clock className="h-3 w-3 shrink-0" />}
      <span>{passed ? 'באיחור · ' : ''}{formatDateTime(value)}</span>
    </div>
  );
}

// ─── Phone Contact Modal ─────────────────────────────────────────────────────

function PhoneContactModal({ phone, onClose }: { phone: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const waNumber = phone.replace(/\D/g, '').replace(/^0/, '972');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xs rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-950 shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-right" dir="rtl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">יצירת קשר</h2>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition flex-row-reverse justify-end text-right"
          >
            <Phone className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
            שיחה
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition flex-row-reverse justify-end text-right"
          >
            <svg className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            וואטסאפ
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── AI Intelligence Section ─────────────────────────────────────────────────

function AIIntelligenceSection({ lead }: { lead: Lead }) {
  const hasAny =
    lead.conversation_summary ||
    lead.urgency_level ||
    lead.priority_level ||
    lead.sla_deadline ||
    lead.follow_up_recommended_at ||
    lead.callback_recommendation;

  if (!hasAny) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3">ניתוח AI</p>
      <div className="border border-purple-200/60 dark:border-purple-800/40 bg-gradient-to-br from-purple-50 to-indigo-50/40 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl p-4">
        {/* AI section header */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">ניתוח AI</p>
        </div>

        <div className="space-y-4">

          {/* Conversation Summary */}
          {lead.conversation_summary && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1.5 text-right">סיכום שיחה</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-right">
                {lead.conversation_summary}
              </p>
            </div>
          )}

          {/* Metrics row */}
          {(lead.urgency_level || lead.priority_level) && (
            <div className="flex flex-wrap gap-2">
              {lead.urgency_level && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1 text-right">דחיפות</p>
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${URGENCY_STYLES[lead.urgency_level] ?? ''}`}>
                    {lead.urgency_level}
                  </span>
                </div>
              )}
              {lead.priority_level && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1 text-right">עדיפות</p>
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${PRIORITY_LEVEL_STYLES[lead.priority_level] ?? ''}`}>
                    {lead.priority_level}
                  </span>
                </div>
              )}
            </div>
          )}

          {(lead.sla_deadline || lead.follow_up_recommended_at || lead.callback_recommendation) &&
           (lead.conversation_summary || lead.urgency_level || lead.priority_level) && (
            <div className="border-t border-purple-200/50 dark:border-purple-800/30" />
          )}

          {/* Action intelligence */}
          <div className="space-y-3">
            {lead.sla_deadline && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1.5 text-right">דדליין SLA</p>
                <SlaDeadline value={lead.sla_deadline} />
              </div>
            )}
            {lead.follow_up_recommended_at && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1.5 text-right">מעקב מומלץ</p>
                <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <Clock className="h-3 w-3 shrink-0" />
                  {formatDateTime(lead.follow_up_recommended_at)}
                </span>
              </div>
            )}
            {lead.callback_recommendation && (
              <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 px-3.5 py-3">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 text-right">המלצה להתקשרות</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed text-right">
                  {lead.callback_recommendation}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
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

  // ── Shared inner content (header + scrollable body + footer) ──
  const drawerContent = (
    <>
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
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

      <div className="flex-1 overflow-y-auto px-5 py-5 text-right">
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

      {/* ── Sticky Footer ── */}
      <div className="sticky bottom-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4">
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
        <div dir="rtl" className="flex h-full flex-col bg-white dark:bg-slate-950">
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
          className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-[2px]"
          onClick={onClose}
          aria-hidden="true"
        />
        <aside
          dir="rtl"
          className="relative w-full max-w-[420px] bg-white dark:bg-slate-950 border-s border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto flex flex-col"
          style={{ animation: 'slideInFromRight 220ms ease-out forwards' }}
          aria-label="פרטי ליד"
        >
          {drawerContent}
        </aside>
      </div>
      {portals}
    </>
  );
}
