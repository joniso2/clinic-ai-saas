'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Phone, X, Mail, Sparkles, MessageSquare,
  Calendar as CalendarIcon, ChevronDown, CheckCircle,
} from 'lucide-react';
import type { Lead } from '@/types/leads';
import { getDisplayPriority, type Priority } from '@/types/leads';
import { STATUS_LABELS, PRIORITY_LABELS, SOURCE_LABELS } from '@/lib/hebrew';
import {
  PRIORITY_STYLES,
  STATUS_BADGE_STYLES,
  REJECT_REASONS,
  type RejectReason,
  OTHER_SERVICE,
} from './leads-table-helpers';

// ─── WhatsApp Icon ────────────────────────────────────────────────────────────

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────

export function FilterDropdown<T extends string>({
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

// ─── Action Icon Button ───────────────────────────────────────────────────────

export function ActionIconButton({
  icon: Icon,
  label,
  variant,
  onClick,
  disabled,
  size = 'sm',
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant: 'view' | 'edit' | 'call' | 'complete' | 'more' | 'delete';
  onClick: () => void;
  disabled?: boolean;
  /** sm = default compact, md = larger square (e.g. mobile), lg = ~10% larger for mobile cards */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-400/30 dark:focus:ring-slate-500/50';
  const sizeClasses = size === 'lg' ? 'h-10 w-10 min-w-[2.5rem] min-h-[2.5rem] p-0' : size === 'md' ? 'h-9 w-9 min-w-[2.25rem] min-h-[2.25rem] p-0' : 'px-2 py-1';
  const variants = {
    view: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
    edit: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
    call: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:shadow-sm active:scale-95',
    complete: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
    more: 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
    delete: 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400',
  };
  const deleteMd = (size === 'md' || size === 'lg') && variant === 'delete' ? 'bg-slate-100 dark:bg-slate-800' : '';
  const iconSize = size === 'lg' ? 'h-[18px] w-[18px]' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`${base} ${sizeClasses} ${variants[variant]} ${deleteMd} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}
    >
      <Icon className={`${iconSize} shrink-0`} />
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
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

// ─── Phone Contact Modal ──────────────────────────────────────────────────────

export function PhoneContactModal({ phone, onClose }: { phone: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const waNumber = phone.replace(/\D/g, '').replace(/^0/, '972');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xs rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-950 shadow-xl dark:shadow-2xl modal-enter">
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

// ─── Pending Review Modal ─────────────────────────────────────────────────────

export function PendingReviewModal({
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
  const [mode, setMode] = useState<'review' | 'reject'>('review');
  const [rejectReason, setRejectReason] = useState<RejectReason | ''>('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const priority = getDisplayPriority(lead);
  const hasAppointment = !!nextAppointment;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-950 shadow-xl dark:shadow-2xl modal-enter">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 text-right">
            {mode === 'review' ? 'סקירת ליד' : 'הסרת ליד'}
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
                  {acceptLoading ? 'מאשר...' : '\u2713 אשר ואישור תור'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onScheduleAppointment(lead)}
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

// ─── Complete Lead Modal ─────────────────────────────────────────────────────

export function CompleteLeadModal({
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
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-5 shadow-xl dark:shadow-2xl modal-enter text-right" dir="rtl">
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
