'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Phone,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import type { Lead } from '@/types/leads';
import {
  getDisplayPriority,
  formatCurrency,
  type Priority,
  type LeadStatus,
} from '@/types/leads';

const PRIORITY_STYLES: Record<Priority, string> = {
  Low: 'bg-slate-100 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-600',
  Medium: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60',
  High: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60',
  Urgent: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60 font-semibold',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  Pending: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60',
  Contacted: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60',
  'Appointment scheduled': 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60',
  Closed: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60',
  Converted: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60',
  Disqualified: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700',
};

const STATUS_OPTIONS: LeadStatus[] = ['Pending', 'Contacted', 'Appointment scheduled', 'Closed', 'Disqualified'];

type SortKey = 'revenue' | 'created' | 'name' | 'score';

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
  'Not relevant inquiry',
  'Price not suitable',
  'Duplicate lead',
  'No response from client',
  'Outside service area',
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
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100">Review Lead</h2>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-100">{lead.full_name || 'Unnamed lead'}</span>
            <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
              {priority}
            </span>
          </div>

          {(lead.lead_quality_score ?? lead.lead_score) != null && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-medium text-zinc-300">Score</span>
              <span>{lead.lead_quality_score ?? lead.lead_score}/100</span>
            </div>
          )}

          {nextAppointment && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Appointment: {new Intl.DateTimeFormat('he-IL', {
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
                ✓ Accept &amp; Confirm Appointment
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-800/50 px-4 py-4 text-center space-y-3">
                <p className="text-xs text-zinc-400">No appointment scheduled yet.</p>
                <button
                  type="button"
                  onClick={() => { onClose(); onScheduleAppointment(lead); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule Appointment
                </button>
              </div>
            )}
            <div className="border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setMode('reject')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 hover:border-zinc-500 bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition"
              >
                ✕ Reject Lead
              </button>
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-xs font-medium text-zinc-400">Select a reason to continue:</p>
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
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition">{reason}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setMode('main'); setRejectReason(''); }}
                className="flex-1 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!rejectReason}
                onClick={() => rejectReason && onReject(rejectReason as RejectReason)}
                className="flex-1 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition"
              >
                Confirm Reject
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
      <div className="relative w-full max-w-xs rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100">Contact via</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-3 w-full rounded-xl border border-zinc-700 hover:border-zinc-500 px-4 py-3 text-sm font-medium text-zinc-200 hover:text-white transition"
          >
            <Phone className="h-4 w-4 shrink-0 text-emerald-400" />
            Phone Call
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full rounded-xl border border-zinc-700 hover:border-zinc-500 px-4 py-3 text-sm font-medium text-zinc-200 hover:text-white transition"
          >
            <svg className="h-4 w-4 shrink-0 text-green-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [rowMenuCoords, setRowMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [pendingReviewLead, setPendingReviewLead] = useState<Lead | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [phoneModalPhone, setPhoneModalPhone] = useState<string | null>(null);

  const isDisqualifiedView = statusFilter === 'Disqualified';

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
        case 'score':
          cmp = (a.lead_quality_score ?? a.lead_score ?? 0) - (b.lead_quality_score ?? b.lead_score ?? 0);
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
      setToast('Lead moved to Disqualified');
    }, 300);
    setPendingReviewLead(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 card-shadow sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="search"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500 sm:w-56"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter((e.target.value || '') as Priority | '')}
            className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
          >
            <option value="">All priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Appointment scheduled">Appointment scheduled</option>
            <option value="Contacted">Contacted</option>
            <option value="Closed">Closed</option>
            <option value="Disqualified">Disqualified</option>
          </select>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500 dark:text-zinc-500">Sort:</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
            >
              <option value="created">Date created</option>
              <option value="revenue">Revenue</option>
              <option value="name">Name</option>
              <option value="score">Lead score</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDesc((d) => !d)}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700"
              title={sortDesc ? 'Descending' : 'Ascending'}
            >
              <ChevronDown className={`h-4 w-4 transition ${sortDesc ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-zinc-700/60 px-3 py-2">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => {
                selectedIds.forEach((id) => {
                  const lead = leads.find((l) => l.id === id);
                  if (lead) onDelete(lead);
                });
                setSelectedIds(new Set());
              }}
              className="rounded-lg bg-red-100 dark:bg-red-950/60 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 transition hover:bg-red-200 dark:hover:bg-red-900/60"
            >
              Delete selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="relative rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-zinc-700">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-700/60 border-b border-slate-200 dark:border-zinc-700">
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredAndSorted.length > 0 && selectedIds.size === filteredAndSorted.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 dark:border-zinc-600 text-slate-900 focus:ring-slate-900"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Last contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Next follow-up</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Next appointment</th>
                {isDisqualifiedView && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Reject reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Rejected at</th>
                  </>
                )}
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-700 bg-white dark:bg-zinc-800">
              {filteredAndSorted.map((lead) => {
                const priority = getDisplayPriority(lead);
                const urgent = isUrgent(lead);
                const isRemoving = removingIds.has(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={`group transition-all duration-300 ${
                      isRemoving ? 'opacity-0 scale-95' : 'opacity-100'
                    } ${
                      urgent
                        ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/70 dark:hover:bg-red-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-700/40'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {urgent && (
                          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" title="Requires urgent attention" />
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={() => onView(lead)}
                            className="font-semibold text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                          >
                            {lead.full_name || 'Unnamed lead'}
                          </button>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">{lead.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
                        {priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-zinc-300">
                      {(lead.estimated_deal_value ?? 0) > 0 ? formatCurrency(lead.estimated_deal_value!) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {(lead.lead_quality_score ?? lead.lead_score) != null ? (
                        <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                          {lead.lead_quality_score ?? lead.lead_score}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {lead.status === 'Pending' ? (
                        <button
                          type="button"
                          onClick={() => setPendingReviewLead(lead)}
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${STATUS_BADGE_STYLES['Pending']}`}
                          title="Click to review this lead"
                        >
                          Pending
                        </button>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[lead.status ?? 'Pending'] ?? STATUS_BADGE_STYLES['Pending']}`}>
                          {lead.status ?? 'Pending'}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">{lead.source ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">
                      {lead.last_contact_date ? formatDateDDMMYYYY(lead.last_contact_date) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">
                      {lead.next_follow_up_date ? formatDateDDMMYYYY(lead.next_follow_up_date) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">
                      {nextAppointmentsByLeadId?.[lead.id]
                        ? new Intl.DateTimeFormat('he-IL', {
                            timeZone: 'Asia/Jerusalem',
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: false,
                          }).format(new Date(nextAppointmentsByLeadId[lead.id]!))
                        : '—'}
                    </td>
                    {isDisqualifiedView && (
                      <>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">
                          {lead.reject_reason ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">
                          {lead.rejected_at ? formatDateTime(lead.rejected_at) : '—'}
                        </td>
                      </>
                    )}
                    <td className="relative px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onView(lead)}
                          className="rounded-lg p-1.5 text-slate-500 dark:text-zinc-400 transition hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(lead)}
                          className="rounded-lg p-1.5 text-slate-500 dark:text-zinc-400 transition hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {lead.phone && (
                          <button
                            type="button"
                            onClick={() => setPhoneModalPhone(lead.phone!)}
                            className="rounded-lg p-1.5 text-slate-500 dark:text-zinc-400 transition hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200"
                            title="Contact"
                          >
                            <Phone className="h-4 w-4" />
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
                            className="rounded-lg p-1.5 text-slate-500 dark:text-zinc-400 transition hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200"
                            title="More"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {rowMenuId === lead.id && rowMenuCoords && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => { setRowMenuId(null); setRowMenuCoords(null); }}
                                aria-hidden="true"
                              />
                              <div
                                className="fixed z-20 w-48 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-1 shadow-lg dark:shadow-black/30"
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
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => { onMarkContacted(lead.id); setRowMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  Mark as contacted
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { onScheduleFollowUp(lead.id); setRowMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  Schedule follow-up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { onScheduleAppointment(lead); setRowMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  Schedule appointment
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { onDelete(lead); setRowMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSorted.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">No leads match your filters.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">Try adjusting search or filters, or add a new lead.</p>
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
