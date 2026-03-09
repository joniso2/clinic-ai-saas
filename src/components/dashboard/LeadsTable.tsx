'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Pencil,
  Trash2,
  Phone,
  Plus,
  CheckCircle,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
  Mail,
  Sparkles,
  MessageSquare,
  GripVertical,
} from 'lucide-react';
import type { Lead } from '@/types/leads';
import { getDisplayPriority, type Priority, type LeadStatus } from '@/types/leads';
import { STATUS_LABELS, PRIORITY_LABELS, SOURCE_LABELS, formatCurrencyILS } from '@/lib/hebrew';

function toWaHref(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return `https://wa.me/${d.startsWith('0') ? '972' + d.slice(1) : d}`;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// RTL filter dropdown: label (left) + chevron (right), no absolute chevron
function FilterDropdown<T extends string>({
  value,
  options,
  getLabel,
  onChange,
  minWidth = '140px',
  open,
  onOpenChange,
  id,
}: {
  value: T;
  options: T[];
  getLabel: (v: T) => string;
  onChange: (v: T) => void;
  minWidth?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative" style={{ minWidth }}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={getLabel(value)}
        id={id}
        dir="rtl"
        className="flex items-center justify-between gap-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-right text-slate-700 dark:text-slate-300 focus:border-slate-400 dark:focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-slate-500/50 transition-colors duration-150 hover:border-slate-300 dark:hover:border-slate-600"
      >
        <span className="truncate">{getLabel(value)}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400 ms-1" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute top-full end-0 mt-1 z-50 min-w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-lg py-1 max-h-60 overflow-auto"
          dir="rtl"
        >
          {options.map((opt) => (
            <li key={opt} role="option" aria-selected={value === opt}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt);
                  onOpenChange(false);
                }}
                className={`w-full px-3 py-2 text-sm text-right transition-colors ${
                  value === opt
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                {getLabel(opt)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Compact icon-only action button for table row (RTL-safe, no row height change)
function ActionIconButton({
  icon: Icon,
  label,
  variant,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant: 'view' | 'edit' | 'call' | 'complete' | 'more' | 'delete';
  onClick: () => void;
  disabled?: boolean;
}) {
  const base = 'inline-flex items-center justify-center rounded-lg px-2 py-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-400/30 dark:focus:ring-slate-500/50';
  const variants = {
    view: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
    edit: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
    call: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:shadow-sm active:scale-95',
    complete: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
    more: 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
    delete: 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  Low: 'bg-slate-50 text-slate-600 border border-slate-200/30 dark:bg-slate-950/20 dark:text-slate-300 dark:border-slate-700/40',
  Medium: 'bg-amber-50 text-amber-600 border border-amber-200/30 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40',
  High: 'bg-orange-50 text-orange-600 border border-orange-200/30 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700/40',
  Urgent: 'bg-red-50 text-red-600 border border-red-200/30 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-600 border border-amber-200/30 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40',
  Contacted: 'bg-sky-50 text-sky-600 border border-sky-200/30 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-700/40',
  'Appointment scheduled': 'bg-blue-50 text-blue-600 border border-blue-200/30 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40',
  Closed: 'bg-emerald-50 text-emerald-600 border border-emerald-200/30 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40',
  Converted: 'bg-emerald-50 text-emerald-600 border border-emerald-200/30 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40',
  Disqualified: 'bg-slate-50 text-slate-600 border border-slate-200/30 dark:bg-slate-950/20 dark:text-slate-300 dark:border-slate-700/40',
};

const STATUS_OPTIONS: LeadStatus[] = ['Pending', 'Contacted', 'Appointment scheduled', 'Closed', 'Disqualified'];

type SortKey = 'revenue' | 'created' | 'name';

const SORT_LABELS: Record<SortKey, string> = {
  created: 'תאריך יצירה',
  revenue: 'הכנסה',
  name: 'שם',
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

// ─── Pending Review Modal ────────────────────────────────────────────────────

const REJECT_REASONS = [
  'פנייה לא רלוונטית',
  'מחיר לא מתאים',
  'ליד כפול',
  'אין תגובה מלקוח',
  'מחוץ לאזור שירות',
] as const;

type RejectReason = typeof REJECT_REASONS[number];

function PendingReviewModal({
  lead,
  nextAppointment,
  onAccept,
  onReject,
  onClose,
  onScheduleAppointment,
  acceptLoading = false,
}: {
  lead: Lead;
  nextAppointment?: string;
  onAccept: () => void;
  onReject: (reason: RejectReason) => void;
  onClose: () => void;
  onScheduleAppointment: (lead: Lead) => void;
  acceptLoading?: boolean;
}) {
  const [mode, setMode] = useState<'review' | 'book' | 'reject'>('review');
  const [rejectReason, setRejectReason] = useState<RejectReason | ''>('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const priority = getDisplayPriority(lead);
  const hasAppointment = !!nextAppointment;

  const handleInlineBook = async () => {
    if (!bookDate || !bookTime) { setBookError('יש למלא תאריך ושעה'); return; }
    const [dd, mm, yyyy] = bookDate.split('/');
    if (!dd || !mm || !yyyy) { setBookError('פורמט תאריך: DD/MM/YYYY'); return; }
    const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${bookTime}:00+02:00`;
    setBookLoading(true);
    setBookError('');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: lead.full_name || 'ליד ללא שם',
          datetime: iso,
          type: 'new',
          lead_id: lead.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBookError(data.error || 'שגיאה בקביעת התור');
        return;
      }
      onAccept();
    } catch {
      setBookError('שגיאת רשת');
    } finally {
      setBookLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-950 shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 text-right">
            {mode === 'review' ? 'סקירת ליד' : mode === 'book' ? 'קביעת תור' : 'הסרת ליד'}
          </h2>
          <button type="button" onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1: Review */}
        {mode === 'review' && (
          <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Name + Priority */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{lead.full_name || 'ליד ללא שם'}</span>
              <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
                {PRIORITY_LABELS[priority] ?? priority}
              </span>
            </div>

            {/* Contact details */}
            <div className="space-y-1.5">
              {lead.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <a href={`tel:${lead.phone}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" dir="ltr">{lead.phone}</a>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span dir="ltr">{lead.email}</span>
                </div>
              )}
              {lead.source && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{SOURCE_LABELS[lead.source] ?? lead.source}</span>
                </div>
              )}
            </div>

            {/* Interest */}
            {lead.interest && (
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em] mb-1">תחום עניין</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">{lead.interest}</p>
              </div>
            )}

            {/* AI Conversation Summary */}
            {lead.conversation_summary && (
              <div className="rounded-lg border border-purple-200/60 dark:border-purple-800/40 bg-gradient-to-br from-purple-50 to-indigo-50/40 dark:from-purple-950/30 dark:to-indigo-950/30 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-[0.08em]">סיכום AI</p>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{lead.conversation_summary}</p>
              </div>
            )}

            {/* Existing appointment */}
            {nextAppointment && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                <span>תור: {new Intl.DateTimeFormat('he-IL', {
                  timeZone: 'Asia/Jerusalem',
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', hour12: false,
                }).format(new Date(nextAppointment))}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-1">
              {hasAppointment ? (
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={acceptLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition"
                >
                  {acceptLoading ? 'מאשר...' : '✓ אשר ואישור תור'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('book')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  קבע תור
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode('reject')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <X className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                הסר ליד
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Inline Booking */}
        {mode === 'book' && (
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
              קביעת תור עבור <span className="font-medium text-slate-700 dark:text-slate-300">{lead.full_name || 'ליד ללא שם'}</span>
            </p>

            {bookError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                {bookError}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right block">תאריך (DD/MM/YYYY)</label>
                <input
                  type="text"
                  value={bookDate}
                  onChange={(e) => setBookDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-400 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right block">שעה (HH:MM)</label>
                <input
                  type="time"
                  value={bookTime}
                  onChange={(e) => setBookTime(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-400 transition"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setMode('review'); setBookError(''); }}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                חזרה
              </button>
              <button
                type="button"
                disabled={bookLoading}
                onClick={handleInlineBook}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition"
              >
                {bookLoading ? 'קובע...' : 'אשר תור'}
              </button>
            </div>
          </div>
        )}

        {/* Reject step */}
        {mode === 'reject' && (
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">בחר סיבה להמשך:</p>
            <div className="space-y-2">
              {REJECT_REASONS.map((reason) => (
                <label key={reason} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="reject-reason"
                    value={reason}
                    checked={rejectReason === reason}
                    onChange={() => setRejectReason(reason)}
                    className="h-4 w-4 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition text-right">{reason}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setMode('review'); setRejectReason(''); }}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                חזרה
              </button>
              <button
                type="button"
                disabled={!rejectReason}
                onClick={() => rejectReason && onReject(rejectReason as RejectReason)}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition"
              >
                אשר הסרה
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
      {message}
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xs rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-950 shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 text-right">יצירת קשר</h2>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition"
          >
            <Phone className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
            שיחה
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition"
          >
            <svg className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Complete Lead Modal ─────────────────────────────────────────────────────

const OTHER_SERVICE = 'אחר';

function CompleteLeadModal({
  lead,
  serviceOptions,
  onClose,
  onConfirm,
}: {
  lead: Lead;
  serviceOptions: { service_name: string; price: number }[];
  onClose: () => void;
  onConfirm: (leadId: string, value: number, notes?: string, serviceType?: string) => Promise<string | null>;
}) {
  const [valueInput, setValueInput] = useState(String(lead.estimated_deal_value ?? ''));
  const [serviceType, setServiceType] = useState('');
  const [otherText, setOtherText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const serviceChoices = [...serviceOptions.map((s) => s.service_name), OTHER_SERVICE];

  const handleServiceChange = (selected: string) => {
    setServiceType(selected);
    if (selected && selected !== OTHER_SERVICE) {
      const svc = serviceOptions.find((s) => s.service_name === selected);
      if (svc != null && svc.price > 0) setValueInput(String(svc.price));
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const valueNum = Number(valueInput);
  const isValid = valueNum > 0;
  const showError = valueInput.trim() !== '' && !isValid;

  const resolvedServiceType =
    serviceType === OTHER_SERVICE ? (otherText.trim() || OTHER_SERVICE) : serviceType;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    const err = await onConfirm(
      lead.id,
      valueNum,
      notes.trim() || undefined,
      resolvedServiceType || undefined
    );
    setSaving(false);
    if (err) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="סיום טיפול">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-5 shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-right" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">סיום טיפול</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{lead.full_name || 'ליד ללא שם'}</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">שווי (₪) — חובה</label>
            <input
              type="number"
              min={1}
              step={1}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder="הזן סכום"
              dir="ltr"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 text-right focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-slate-900 dark:focus:border-slate-500"
            />
            {showError && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">לא ניתן לסגור ליד ללא שווי כספי</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">סוג שירות (אופציונלי)</label>
            <select
              value={serviceType}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 text-right focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-500"
            >
              <option value="">בחר סוג שירות</option>
              {serviceChoices.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {serviceType === OTHER_SERVICE && (
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="פרט את סוג השירות"
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 text-right placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-500"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">הערות (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות לסיום"
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 text-right focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-500 resize-none"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2 justify-start">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ביטול
          </button>
          <button
            type="button"
            disabled={!isValid || saving}
            onClick={handleSubmit}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 text-sm font-semibold text-white transition"
          >
            {saving ? 'שומר…' : 'אישור סיום'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Table Component ────────────────────────────────────────────────────

export function LeadsTable({
  leads,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onAcceptPendingLead,
  onMarkContacted,
  onScheduleFollowUp,
  onScheduleAppointment,
  onUpdateDealValue,
  onCompleteLead,
  pricingServices = [],
  nextAppointmentsByLeadId,
  onRejectLead,
}: {
  leads: Lead[];
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onAcceptPendingLead?: (lead: Lead) => Promise<void>;
  onMarkContacted: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onScheduleAppointment: (lead: Lead) => void;
  onUpdateDealValue?: (leadId: string, value: number) => Promise<string | null>;
  onCompleteLead?: (
    leadId: string,
    value: number,
    notes?: string,
    serviceType?: string
  ) => Promise<string | { warning: string } | null>;
  pricingServices?: { service_name: string; price: number }[];
  nextAppointmentsByLeadId?: Record<string, string | undefined>;
  onRejectLead?: (leadId: string, reason: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [openFilter, setOpenFilter] = useState<'priority' | 'status' | 'sort' | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  // ── Drag-to-trash ──
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);
  const [trashHover, setTrashHover] = useState(false);
  const [hasFinePointer, setHasFinePointer] = useState(false);
  useEffect(() => {
    setHasFinePointer(window.matchMedia('(pointer: fine)').matches);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node))
        setStatusDropdownId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingReviewLead, setPendingReviewLead] = useState<Lead | null>(null);
  const [acceptingLeadId, setAcceptingLeadId] = useState<string | null>(null);
  const [completeLead, setCompleteLead] = useState<Lead | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [phoneModalPhone, setPhoneModalPhone] = useState<string | null>(null);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [dealValueLeadId, setDealValueLeadId] = useState<string | null>(null);
  const [dealValueInput, setDealValueInput] = useState('');
  const [dealValueSaving, setDealValueSaving] = useState(false);
  const router = useRouter();

  const isDisqualifiedView = statusFilter === 'Disqualified';

  function goToCalendarForDate(isoDatetime: string) {
    const d = new Date(isoDatetime);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    router.push(`/dashboard/calendar?date=${y}-${m}-${day}`);
  }

  const filteredAndSorted = useMemo(() => {
    let list = [...leads];

    // Default: exclude Disqualified and Closed unless explicitly selected
    if (!statusFilter) {
      list = list.filter(
        (l) => (l.status ?? 'Pending') !== 'Disqualified' && (l.status ?? 'Pending') !== 'Closed'
      );
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter(
        (l) =>
          (l.full_name ?? '').toLowerCase().includes(q) ||
          (l.email ?? '').toLowerCase().includes(q)
      );
    }
    if (priorityFilter) {
      list = list.filter((l) => getDisplayPriority(l) === priorityFilter);
    }
    if (statusFilter) {
      list = list.filter((l) => (l.status ?? 'Pending') === statusFilter);
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'revenue':
          cmp = (a.estimated_deal_value ?? 0) - (b.estimated_deal_value ?? 0);
          break;
        case 'name':
          cmp = (a.full_name ?? '').localeCompare(b.full_name ?? '');
          break;
        default:
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [leads, debouncedSearch, priorityFilter, statusFilter, sortKey, sortDesc]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSorted.map((l) => l.id)));
    }
  };

  const isUrgent = (lead: Lead) => {
    const p = getDisplayPriority(lead);
    const next = lead.next_follow_up_date
      ? new Date(lead.next_follow_up_date) < new Date()
      : false;
    return p === 'Urgent' || (p === 'High' && next);
  };

  const handleAccept = async (lead: Lead) => {
    if (onAcceptPendingLead) {
      setAcceptingLeadId(lead.id);
      try {
        await onAcceptPendingLead(lead);
        setPendingReviewLead(null);
      } finally {
        setAcceptingLeadId(null);
      }
    } else {
      onStatusChange(lead.id, 'Appointment scheduled');
      setPendingReviewLead(null);
    }
  };

  const handleReject = (lead: Lead, reason: string) => {
    setRemovingIds((prev) => new Set(prev).add(lead.id));
    setTimeout(() => {
      onStatusChange(lead.id, 'Disqualified');
      onRejectLead?.(lead.id, reason);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
      setToast('הליד הועבר להסרה');
    }, 300);
    setPendingReviewLead(null);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800/70 dark:bg-slate-950/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between flex-row-reverse">
        <div className="flex flex-wrap items-center gap-3 flex-row-reverse justify-end">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="search"
              placeholder="חיפוש לפי שם או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-4 text-sm text-right text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-500/50 transition-colors duration-150 sm:w-56"
            />
          </div>
          <FilterDropdown
            id="filter-priority"
            value={priorityFilter}
            options={['', 'Low', 'Medium', 'High', 'Urgent'] as (Priority | '')[]}
            getLabel={(v) => (v === '' ? 'כל העדיפויות' : (PRIORITY_LABELS[v as Priority] ?? v))}
            onChange={(v) => setPriorityFilter(v as Priority | '')}
            open={openFilter === 'priority'}
            onOpenChange={(o) => setOpenFilter(o ? 'priority' : null)}
            minWidth="140px"
          />
          <FilterDropdown
            id="filter-status"
            value={statusFilter}
            options={['', 'Pending', 'Appointment scheduled', 'Contacted', 'Closed', 'Disqualified']}
            getLabel={(v) => (v === '' ? 'כל הסטטוסים' : (STATUS_LABELS[v as LeadStatus] ?? v))}
            onChange={setStatusFilter}
            open={openFilter === 'status'}
            onOpenChange={(o) => setOpenFilter(o ? 'status' : null)}
            minWidth="140px"
          />
          <div className="flex items-center gap-2 flex-row-reverse">
            <label className="text-[11px] text-slate-500 dark:text-slate-500 shrink-0">מיון:</label>
            <FilterDropdown
              id="filter-sort"
              value={sortKey}
              options={['created', 'revenue', 'name']}
              getLabel={(v) => SORT_LABELS[v]}
              onChange={(v) => setSortKey(v)}
              open={openFilter === 'sort'}
              onOpenChange={(o) => setOpenFilter(o ? 'sort' : null)}
              minWidth="130px"
            />
            <button
              type="button"
              onClick={() => setSortDesc((d) => !d)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-200 transition-colors duration-150 shrink-0"
              title={sortDesc ? 'יורד' : 'עולה'}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sortDesc ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar — above table when at least one selected */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/95 px-4 py-3 shadow-sm flex-row-reverse justify-end">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            נבחרו {selectedIds.size} לידים
          </span>
          <div className="flex items-center gap-2 flex-row-reverse">
            <button
              type="button"
              onClick={() => {
                selectedIds.forEach((id) => {
                  const lead = leads.find((l) => l.id === id);
                  if (lead) onDelete(lead);
                });
                setSelectedIds(new Set());
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              מחיקה
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              שינוי סטטוס
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ייצוא
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            ביטול
          </button>
        </div>
      )}

      {/* Table */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] bg-white dark:bg-slate-900">
        <div className="overflow-x-auto overflow-y-visible" dir="rtl">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 text-right">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">איש קשר</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">עדיפות</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">שווי</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">סטטוס</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">מקור</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">תאריך</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">מעקב הבא</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">תור הבא</th>
                {isDisqualifiedView && (
                  <>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">סיבת הסרה</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right">הוסר בתאריך</th>
                  </>
                )}
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-right w-[1%]">פעולות</th>
                <th className="w-10 px-4 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={filteredAndSorted.length > 0 && selectedIds.size === filteredAndSorted.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 text-indigo-500 focus:ring-indigo-500/40 focus:ring-offset-0"
                    aria-label="בחר הכל"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((lead) => {
                const priority = getDisplayPriority(lead);
                const urgent = isUrgent(lead);
                const isRemoving = removingIds.has(lead.id);
                const isSelected = selectedIds.has(lead.id);
                const accentBorder = isSelected
                  ? 'border-s-2 border-s-indigo-500/60'
                  : urgent
                    ? 'border-s-2 border-s-red-500/50'
                    : 'border-s-2 border-s-transparent group-hover:border-s-slate-300 dark:group-hover:border-s-slate-600/50';
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onView(lead)}
                    className={[
                      'group relative border-b border-slate-100 dark:border-slate-800 transition-colors duration-200',
                      'hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
                      'cursor-pointer',
                      isRemoving ? 'opacity-0 scale-y-95 pointer-events-none' : 'opacity-100',
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/25 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                        : urgent
                          ? 'bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50/70 dark:hover:bg-red-950/20'
                          : '',
                    ].join(' ')}
                  >
                    <td className={`px-4 py-3 ${accentBorder} transition-[border-color] duration-150 relative`}>
                      {hasFinePointer && (
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', lead.id);
                            setDraggingLead(lead);
                          }}
                          onDragEnd={() => { setDraggingLead(null); setTrashHover(false); }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute start-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing p-1 rounded transition-opacity duration-150 z-10"
                          title="גרור למחיקה"
                        >
                          <GripVertical className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-row-reverse justify-end">
                        {onCompleteLead && lead.status !== 'Closed' && lead.status !== 'Disqualified' && (
                          <ActionIconButton
                            icon={CheckCircle}
                            label="סיום טיפול"
                            variant="complete"
                            onClick={() => setCompleteLead(lead)}
                          />
                        )}
                        {urgent && (
                          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500/90" title="דורש טיפול דחוף" />
                        )}
                        <div className="min-w-0 text-right">
                          <button
                            type="button"
                            onClick={() => onView(lead)}
                            className="block text-right text-sm font-bold text-slate-900 hover:text-indigo-600 dark:text-slate-50 dark:hover:text-indigo-400 transition-colors duration-150"
                          >
                            {lead.full_name || 'ליד ללא שם'}
                          </button>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 text-right">{lead.email || <span className="italic text-slate-400 dark:text-slate-500/80">אין אימייל</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide ${PRIORITY_STYLES[priority]}`}>
                        {PRIORITY_LABELS[priority] ?? priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300 align-middle">
                      {(lead.estimated_deal_value ?? 0) > 0 ? (
                        formatCurrencyILS(lead.estimated_deal_value!)
                      ) : onUpdateDealValue ? (
                        <button
                          type="button"
                          onClick={() => { setDealValueLeadId(lead.id); setDealValueInput(''); }}
                          title="הוסף שווי"
                          aria-label="הוסף שווי"
                          className="inline-flex items-center justify-center rounded-lg border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                        </button>
                      ) : (
                        <span className="text-xs italic text-slate-400 dark:text-slate-500/80">אין שווי</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right align-middle" onClick={e => e.stopPropagation()}>
                      {lead.status === 'Pending' ? (
                        <button type="button" onClick={() => setPendingReviewLead(lead)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold cursor-pointer transition-colors ${STATUS_BADGE_STYLES['Pending']}`}
                          title="לחץ לסקירת הליד">
                          {STATUS_LABELS.Pending}
                        </button>
                      ) : (
                        <div className="relative" ref={statusDropdownId === lead.id ? statusDropdownRef : undefined}>
                          <button type="button"
                            onClick={() => setStatusDropdownId(statusDropdownId === lead.id ? null : lead.id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold cursor-pointer transition-colors ${STATUS_BADGE_STYLES[lead.status ?? 'Pending'] ?? STATUS_BADGE_STYLES['Pending']}`}>
                            {STATUS_LABELS[lead.status ?? 'Pending'] ?? lead.status ?? STATUS_LABELS.Pending}
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
                          </button>
                          {statusDropdownId === lead.id && (
                            <div className="absolute top-full end-0 mt-1 z-50 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-lg overflow-hidden py-1">
                              {STATUS_OPTIONS.map(s => (
                                <button key={s} type="button"
                                  onClick={() => { onStatusChange(lead.id, s); setStatusDropdownId(null); }}
                                  className={`w-full text-right px-3 py-2 text-[13px] transition-colors hover:bg-slate-50 dark:hover:bg-slate-800
                                    ${(lead.status ?? 'Pending') === s ? 'font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {STATUS_LABELS[s] ?? s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-400 text-right align-middle">
                      {(lead.source && SOURCE_LABELS[lead.source]) ? SOURCE_LABELS[lead.source] : (lead.source || <span className="italic text-slate-400 dark:text-slate-500/80">לא ידוע</span>)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600 dark:text-slate-400 text-right align-middle">
                      {lead.last_contact_date ? formatDateDDMMYYYY(lead.last_contact_date) : <span className="italic text-slate-400 dark:text-slate-500/80">עדיין לא נוצר קשר</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600 dark:text-slate-400 text-right align-middle">
                      {lead.next_follow_up_date ? formatDateDDMMYYYY(lead.next_follow_up_date) : <span className="italic text-slate-400 dark:text-slate-500/80">אין מעקב</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-right align-middle">
                      {nextAppointmentsByLeadId?.[lead.id] ? (
                        <span className="tabular-nums text-slate-600 dark:text-slate-400">
                          {new Intl.DateTimeFormat('he-IL', {
                            timeZone: 'Asia/Jerusalem',
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: false,
                          }).format(new Date(nextAppointmentsByLeadId[lead.id]!))}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onScheduleAppointment(lead)}
                          title="קבע תור"
                          aria-label="קבע תור"
                          className="inline-flex items-center justify-center rounded-lg border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                        </button>
                      )}
                    </td>
                    {isDisqualifiedView && (
                      <>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-400 text-right align-middle">
                          {lead.reject_reason ?? <span className="italic text-slate-400 dark:text-slate-500/80">לא צוינה סיבה</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600 dark:text-slate-400 text-right align-middle">
                          {lead.rejected_at ? formatDateTime(lead.rejected_at) : <span className="italic text-slate-400 dark:text-slate-500/80">לא ידוע</span>}
                        </td>
                      </>
                    )}
                    <td className="relative px-3 py-2.5 align-middle" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5 flex-row-reverse justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400
                              hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {lead.phone && (
                          <a href={toWaHref(lead.phone)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400
                              hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                            <WhatsAppIcon className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <ActionIconButton icon={Pencil} label="עריכה" variant="edit" onClick={() => onEdit(lead)} />
                        <ActionIconButton icon={Trash2} label="מחיקה" variant="delete" onClick={() => onDelete(lead)} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.id)}
                        className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 text-indigo-500 focus:ring-indigo-500/40 focus:ring-offset-0"
                        aria-label="בחר ליד"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSorted.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">אין לידים התואמים את הסינון.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">נסה לשנות חיפוש או סינון, או הוסף ליד חדש.</p>
          </div>
        )}

        {/* Trash drop zone — visible only while dragging a lead */}
        <div
          className={`flex items-center justify-center gap-2 py-3 border-t-2 border-dashed transition-all duration-200 ${
            draggingLead
              ? trashHover
                ? 'opacity-100 border-red-500 dark:border-red-400 bg-red-100/90 dark:bg-red-950/70'
                : 'opacity-100 border-red-400 dark:border-red-500 bg-red-50/90 dark:bg-red-950/50'
              : 'opacity-0 h-0 py-0 overflow-hidden pointer-events-none border-transparent'
          }`}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setTrashHover(true); }}
          onDragLeave={() => setTrashHover(false)}
          onDrop={(e) => {
            e.preventDefault();
            if (draggingLead) onDelete(draggingLead);
            setDraggingLead(null);
            setTrashHover(false);
          }}
        >
          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
          <span className="text-[13px] font-semibold text-red-600 dark:text-red-400">גרור לכאן למחיקה</span>
        </div>
      </div>

      {/* Pending Review Modal */}
      {pendingReviewLead && (
        <PendingReviewModal
          lead={pendingReviewLead}
          nextAppointment={nextAppointmentsByLeadId?.[pendingReviewLead.id]}
          onAccept={() => handleAccept(pendingReviewLead)}
          onReject={(reason) => handleReject(pendingReviewLead, reason)}
          onClose={() => setPendingReviewLead(null)}
          onScheduleAppointment={(lead) => { setPendingReviewLead(null); onScheduleAppointment(lead); }}
          acceptLoading={acceptingLeadId === pendingReviewLead.id}
        />
      )}

      {/* Phone Contact Modal */}
      {phoneModalPhone && (
        <PhoneContactModal
          phone={phoneModalPhone}
          onClose={() => setPhoneModalPhone(null)}
        />
      )}

      {/* Complete Lead Modal */}
      {completeLead && onCompleteLead && (
        <CompleteLeadModal
          lead={completeLead}
          serviceOptions={pricingServices}
          onClose={() => setCompleteLead(null)}
          onConfirm={async (leadId, value, notes, serviceType) => {
            const result = await onCompleteLead(leadId, value, notes, serviceType);
            if (result != null) {
              if (typeof result === 'object' && 'warning' in result) {
                setToast(result.warning as string);
              } else {
                setToast(result as string);
                return result as string;
              }
            } else {
              setToast('הליד נסגר בהצלחה');
            }
            setCompleteLead(null);
            return null;
          }}
        />
      )}

      {/* Deal Value Modal */}
      {dealValueLeadId && onUpdateDealValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="deal-value-title">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-xl p-5">
            <h2 id="deal-value-title" className="text-base font-semibold text-slate-900 dark:text-slate-50 text-right mb-3">הוסף שווי (₪)</h2>
            <input
              type="number"
              min={0}
              step={1}
              value={dealValueInput}
              onChange={(e) => setDealValueInput(e.target.value)}
              placeholder="הזן סכום"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-right text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500"
              dir="ltr"
              autoFocus
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => { setDealValueLeadId(null); setDealValueInput(''); }}
                disabled={dealValueSaving}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={dealValueSaving || !dealValueInput.trim() || Number(dealValueInput) <= 0}
                onClick={async () => {
                  const num = Number(dealValueInput);
                  if (num <= 0) return;
                  setDealValueSaving(true);
                  const err = await onUpdateDealValue(dealValueLeadId, num);
                  setDealValueSaving(false);
                  if (err) {
                    setToast(err);
                    return;
                  }
                  setDealValueLeadId(null);
                  setDealValueInput('');
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition"
              >
                {dealValueSaving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
