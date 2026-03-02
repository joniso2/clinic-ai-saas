'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Phone,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
} from 'lucide-react';
import type { Lead } from '@/types/leads';
import { getDisplayPriority, type Priority, type LeadStatus } from '@/types/leads';
import { STATUS_LABELS, PRIORITY_LABELS, SOURCE_LABELS, formatCurrencyILS } from '@/lib/hebrew';

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
        className="flex flex-row-reverse items-center justify-between gap-2 w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-right text-slate-700 dark:text-zinc-300 focus:border-slate-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors duration-150 hover:border-slate-300 dark:hover:border-zinc-600"
      >
        <span className="truncate">{getLabel(value)}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-zinc-400" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute top-full end-0 mt-1 z-50 min-w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 max-h-60 overflow-auto"
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
                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-medium'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
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

const PRIORITY_STYLES: Record<Priority, string> = {
  Low: 'bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/70 dark:text-zinc-400 dark:border-zinc-700/40',
  Medium: 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-500/90 dark:border-amber-800/30',
  High: 'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-500/90 dark:border-orange-800/30',
  Urgent: 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/50 dark:text-red-400/90 dark:border-red-800/30',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-500/85 dark:border-amber-800/25',
  Contacted: 'bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400/80 dark:border-sky-800/25',
  'Appointment scheduled': 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400/80 dark:border-blue-800/25',
  Closed: 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400/80 dark:border-emerald-800/25',
  Converted: 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400/80 dark:border-emerald-800/25',
  Disqualified: 'bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-700/30',
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
}: {
  lead: Lead;
  nextAppointment?: string;
  onAccept: () => void;
  onReject: (reason: RejectReason) => void;
  onClose: () => void;
  onScheduleAppointment: (lead: Lead) => void;
}) {
  const [mode, setMode] = useState<'main' | 'reject'>('main');
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
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 text-right">סקירת ליד</h2>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">{lead.full_name || 'ליד ללא שם'}</span>
            <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
              {PRIORITY_LABELS[priority] ?? priority}
            </span>
          </div>

          {nextAppointment && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span>תור: {new Intl.DateTimeFormat('he-IL', {
                timeZone: 'Asia/Jerusalem',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
              }).format(new Date(nextAppointment))}</span>
            </div>
          )}
        </div>

        {mode === 'main' && (
          <div className="px-5 pb-5 space-y-3">
            {hasAppointment ? (
              <button
                type="button"
                onClick={onAccept}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition"
              >
                ✓ אשר ואישור תור
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 px-4 py-4 text-center space-y-3">
                <p className="text-xs text-slate-500 dark:text-zinc-400">עדיין לא נקבע תור.</p>
                <button
                  type="button"
                  onClick={() => { onClose(); onScheduleAppointment(lead); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 transition"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  קבע תור
                </button>
              </div>
            )}
            <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setMode('reject')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-500 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-zinc-300 transition"
              >
                <X className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                הסר ליד
              </button>
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">בחר סיבה להמשך:</p>
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
                  <span className="text-sm text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-zinc-100 transition text-right">{reason}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setMode('main'); setRejectReason(''); }}
                className="flex-1 rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition"
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
    <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
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
      <div className="relative w-full max-w-xs rounded-2xl border border-slate-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 text-right">יצירת קשר</h2>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition"
          >
            <Phone className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
            שיחה
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition"
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

// ─── Main Table Component ────────────────────────────────────────────────────

export function LeadsTable({
  leads,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onMarkContacted,
  onScheduleFollowUp,
  onScheduleAppointment,
  nextAppointmentsByLeadId,
  onRejectLead,
}: {
  leads: Lead[];
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onMarkContacted: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onScheduleAppointment: (lead: Lead) => void;
  nextAppointmentsByLeadId?: Record<string, string | undefined>;
  onRejectLead?: (leadId: string, reason: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [openFilter, setOpenFilter] = useState<'priority' | 'status' | 'sort' | null>(null);
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [rowMenuCoords, setRowMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [pendingReviewLead, setPendingReviewLead] = useState<Lead | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [phoneModalPhone, setPhoneModalPhone] = useState<string | null>(null);
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

    // Default: exclude Disqualified unless explicitly selected
    if (!statusFilter) {
      list = list.filter((l) => (l.status ?? 'Pending') !== 'Disqualified');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
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
  }, [leads, searchQuery, priorityFilter, statusFilter, sortKey, sortDesc]);

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

  const handleAccept = (lead: Lead) => {
    onStatusChange(lead.id, 'Appointment scheduled');
    setPendingReviewLead(null);
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
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white dark:border-zinc-800/70 dark:bg-zinc-900/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between flex-row-reverse">
        <div className="flex flex-wrap items-center gap-3 flex-row-reverse justify-end">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              type="search"
              placeholder="חיפוש לפי שם או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-4 text-sm text-right text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/50 transition-colors duration-150 sm:w-56"
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
            <label className="text-[11px] text-slate-500 dark:text-zinc-500 shrink-0">מיון:</label>
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
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-200 transition-colors duration-150 shrink-0"
              title={sortDesc ? 'יורד' : 'עולה'}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sortDesc ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar — above table when at least one selected */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/95 px-4 py-3 shadow-sm flex-row-reverse justify-end">
          <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              מחיקה
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              שינוי סטטוס
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              ייצוא
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            ביטול
          </button>
        </div>
      )}

      {/* Table */}
      <div className="relative rounded-xl border border-slate-200 bg-white dark:border-zinc-800/60 dark:bg-zinc-900 shadow-sm shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/30 overflow-hidden ring-1 ring-slate-900/[0.03] dark:ring-white/[0.03]">
        <div className="overflow-x-auto overflow-y-visible" dir="rtl">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-700 bg-slate-100/95 dark:bg-zinc-800/95 text-right">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">איש קשר</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">עדיפות</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">שווי</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">סטטוס</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">מקור</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">תאריך</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">מעקב הבא</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">תור הבא</th>
                {isDisqualifiedView && (
                  <>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">סיבת הסרה</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">הוסר בתאריך</th>
                  </>
                )}
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 w-[1%]">פעולות</th>
                <th className="w-10 px-4 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={filteredAndSorted.length > 0 && selectedIds.size === filteredAndSorted.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 bg-white dark:border-zinc-600 dark:bg-zinc-800 text-indigo-500 focus:ring-indigo-500/40 focus:ring-offset-0"
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
                    : 'border-s-2 border-s-transparent group-hover:border-s-slate-300 dark:group-hover:border-s-zinc-600/50';
                return (
                  <tr
                    key={lead.id}
                    className={[
                      'group relative border-b border-slate-100 dark:border-zinc-800/50 transition-colors duration-200 ease-out',
                      'hover:bg-slate-50/80 dark:hover:bg-zinc-800/30',
                      isRemoving ? 'opacity-0 scale-y-95 pointer-events-none' : 'opacity-100',
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/25 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                        : urgent
                          ? 'bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50/70 dark:hover:bg-red-950/20'
                          : '',
                    ].join(' ')}
                  >
                    <td className={`px-4 py-3 ${accentBorder} transition-[border-color] duration-150`}>
                      <div className="flex items-center gap-2 flex-row-reverse justify-end">
                        {urgent && (
                          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500/90" title="דורש טיפול דחוף" />
                        )}
                        <div className="min-w-0 text-right">
                          <button
                            type="button"
                            onClick={() => onView(lead)}
                            className="block text-right text-sm font-bold text-slate-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400 transition-colors duration-150"
                          >
                            {lead.full_name || 'ליד ללא שם'}
                          </button>
                          <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5 text-right">{lead.email || <span className="italic text-slate-400 dark:text-zinc-500/80">אין אימייל</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide ${PRIORITY_STYLES[priority]}`}>
                        {PRIORITY_LABELS[priority] ?? priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-slate-700 dark:text-zinc-300 align-middle">
                      {(lead.estimated_deal_value ?? 0) > 0 ? formatCurrencyILS(lead.estimated_deal_value!) : <span className="text-xs italic text-slate-400 dark:text-zinc-500/80">אין שווי</span>}
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      {lead.status === 'Pending' ? (
                        <button
                          type="button"
                          onClick={() => setPendingReviewLead(lead)}
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide cursor-pointer transition-all duration-150 hover:brightness-110 hover:shadow-sm ${STATUS_BADGE_STYLES['Pending']}`}
                          title="לחץ לסקירת הליד"
                        >
                          {STATUS_LABELS.Pending}
                        </button>
                      ) : (
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide ${STATUS_BADGE_STYLES[lead.status ?? 'Pending'] ?? STATUS_BADGE_STYLES['Pending']}`}>
                          {STATUS_LABELS[lead.status ?? 'Pending'] ?? lead.status ?? STATUS_LABELS.Pending}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400 text-right align-middle">
                      {(lead.source && SOURCE_LABELS[lead.source]) ? SOURCE_LABELS[lead.source] : (lead.source || <span className="italic text-slate-400 dark:text-zinc-500/80">לא ידוע</span>)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600 dark:text-zinc-400 text-right align-middle">
                      {lead.last_contact_date ? formatDateDDMMYYYY(lead.last_contact_date) : <span className="italic text-slate-400 dark:text-zinc-500/80">עדיין לא נוצר קשר</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600 dark:text-zinc-400 text-right align-middle">
                      {lead.next_follow_up_date ? formatDateDDMMYYYY(lead.next_follow_up_date) : <span className="italic text-slate-400 dark:text-zinc-500/80">אין מעקב</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600 dark:text-zinc-400 text-right align-middle">
                      {nextAppointmentsByLeadId?.[lead.id]
                        ? new Intl.DateTimeFormat('he-IL', {
                            timeZone: 'Asia/Jerusalem',
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: false,
                          }).format(new Date(nextAppointmentsByLeadId[lead.id]!))
                        : <span className="italic text-slate-400 dark:text-zinc-500/80">לא נקבע</span>}
                    </td>
                    {isDisqualifiedView && (
                      <>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400 text-right align-middle">
                          {lead.reject_reason ?? <span className="italic text-slate-400 dark:text-zinc-500/80">לא צוינה סיבה</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-600 dark:text-zinc-400 text-right align-middle">
                          {lead.rejected_at ? formatDateTime(lead.rejected_at) : <span className="italic text-slate-400 dark:text-zinc-500/80">לא ידוע</span>}
                        </td>
                      </>
                    )}
                    <td className="relative px-4 py-3 align-middle">
                      <div className="flex items-center justify-end gap-2 flex-row-reverse">
                        <button
                          type="button"
                          onClick={() => onView(lead)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 transition-colors duration-150"
                          title="צפייה"
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0" />
                          <span className="hidden sm:inline">צפייה</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(lead)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 transition-colors duration-150"
                          title="עריכה"
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0" />
                          <span className="hidden sm:inline">עריכה</span>
                        </button>
                        {lead.phone && (
                          <button
                            type="button"
                            onClick={() => setPhoneModalPhone(lead.phone!)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 transition-colors duration-150"
                            title="חיוג"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden sm:inline">חיוג</span>
                          </button>
                        )}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (rowMenuId === lead.id) {
                                setRowMenuId(null);
                                setRowMenuCoords(null);
                                return;
                              }
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const estimatedMenuHeight = 220;
                              const viewportHeight = window.innerHeight;
                              let top = rect.bottom + window.scrollY;
                              if (top + estimatedMenuHeight > window.scrollY + viewportHeight - 8) {
                                top = rect.top + window.scrollY - estimatedMenuHeight;
                              }
                              setRowMenuId(lead.id);
                              setRowMenuCoords({ top, left: rect.right + window.scrollX });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 transition-colors duration-150"
                            title="עוד"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5 shrink-0" />
                          </button>
                          {rowMenuId === lead.id && rowMenuCoords && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => { setRowMenuId(null); setRowMenuCoords(null); }}
                                aria-hidden="true"
                              />
                              <div
                                className="fixed z-20 w-48 rounded-xl border border-slate-200 bg-white dark:border-zinc-700/60 dark:bg-zinc-900 py-1 shadow-lg shadow-slate-200/60 dark:shadow-2xl dark:shadow-black/40 ring-1 ring-slate-900/[0.06] dark:ring-black/20"
                                style={{ top: rowMenuCoords.top, left: rowMenuCoords.left - 192 }}
                              >
                                <select
                                  value={lead.status ?? 'Pending'}
                                  onChange={(e) => {
                                    onStatusChange(lead.id, e.target.value as LeadStatus);
                                    setRowMenuId(null);
                                  }}
                                  className="w-full border-0 bg-transparent px-3 py-2 text-left text-sm text-slate-700 dark:text-zinc-300 focus:ring-0"
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                                  ))}
                                </select>
                                <div className="my-1 border-t border-slate-200 dark:border-zinc-800/60" />
                                <button
                                  type="button"
                                  onClick={() => { onMarkContacted(lead.id); setRowMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors duration-100"
                                >
                                  <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                                  סמן נוצר קשר
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { onScheduleFollowUp(lead.id); setRowMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors duration-100"
                                >
                                  <CalendarIcon className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                                  קבע מעקב
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { onScheduleAppointment(lead); setRowMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors duration-100"
                                >
                                  <CalendarIcon className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                                  קבע תור
                                </button>
                                <div className="my-1 border-t border-slate-200 dark:border-zinc-800/60" />
                                <button
                                  type="button"
                                  onClick={() => { onDelete(lead); setRowMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition-colors duration-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  מחק
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.id)}
                        className="h-4 w-4 rounded border-slate-300 bg-white dark:border-zinc-600 dark:bg-zinc-800 text-indigo-500 focus:ring-indigo-500/40 focus:ring-offset-0"
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
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">אין לידים התואמים את הסינון.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">נסה לשנות חיפוש או סינון, או הוסף ליד חדש.</p>
          </div>
        )}
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
        />
      )}

      {/* Phone Contact Modal */}
      {phoneModalPhone && (
        <PhoneContactModal
          phone={phoneModalPhone}
          onClose={() => setPhoneModalPhone(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
