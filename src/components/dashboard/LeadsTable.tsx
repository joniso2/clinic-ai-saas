'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  GripVertical,
} from 'lucide-react';
import type { Lead } from '@/types/leads';
import { getDisplayPriority, type Priority, type LeadStatus } from '@/types/leads';
import { STATUS_LABELS, PRIORITY_LABELS, SOURCE_LABELS, formatCurrencyILS } from '@/lib/hebrew';
import { useToast } from '@/components/ui/Toast';

// Extracted modules
import {
  toWaHref,
  PRIORITY_STYLES,
  STATUS_BADGE_STYLES,
  STATUS_OPTIONS,
  SORT_LABELS,
  type SortKey,
  formatDateDDMMYYYY,
  formatDateTime,
  type RejectReason,
} from './leads-table-helpers';
import {
  WhatsAppIcon,
  FilterDropdown,
  ActionIconButton,
  Toast,
  PhoneContactModal,
  PendingReviewModal,
  CompleteLeadModal,
} from './leads-table-components';

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
  const toastApi = useToast();
  const pendingDeleteRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
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
  const [statusDropdownPos, setStatusDropdownPos] = useState<{ top: number; right: number } | null>(null);
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
    // Hide leads pending undo-delete
    if (pendingDeleteIds.size > 0) {
      list = list.filter((l) => !pendingDeleteIds.has(l.id));
    }
    return list;
  }, [leads, debouncedSearch, priorityFilter, statusFilter, sortKey, sortDesc, pendingDeleteIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredAndSorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSorted.map((l) => l.id)));
    }
  }, [selectedIds.size, filteredAndSorted]);

  const isUrgent = (lead: Lead) => {
    const p = getDisplayPriority(lead);
    const next = lead.next_follow_up_date
      ? new Date(lead.next_follow_up_date) < new Date()
      : false;
    return p === 'Urgent' || (p === 'High' && next);
  };

  const handleAccept = useCallback(async (lead: Lead) => {
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
  }, [onAcceptPendingLead, onStatusChange]);

  const handleReject = useCallback((lead: Lead, reason: string) => {
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
  }, [onStatusChange, onRejectLead]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800/70 dark:bg-slate-950/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between flex-row-reverse">
        <div className="flex flex-wrap items-center gap-3 flex-row-reverse justify-end">
          <div className="relative">
            <Search className="absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="search"
              placeholder="חיפוש לפי שם או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pe-9 ps-4 text-sm text-right text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-500/50 transition-colors duration-150 sm:w-56"
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
                          className="absolute start-1 top-1/2 -translate-y-1/2 sm:opacity-0 sm:group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing p-1 rounded transition-opacity duration-150 z-10"
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
                        <div className="relative">
                          <button type="button"
                            onClick={(e) => {
                              if (statusDropdownId === lead.id) {
                                setStatusDropdownId(null);
                                setStatusDropdownPos(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setStatusDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                setStatusDropdownId(lead.id);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold cursor-pointer transition-colors ${STATUS_BADGE_STYLES[lead.status ?? 'Pending'] ?? STATUS_BADGE_STYLES['Pending']}`}>
                            {STATUS_LABELS[lead.status ?? 'Pending'] ?? lead.status ?? STATUS_LABELS.Pending}
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
                          </button>
                          {statusDropdownId === lead.id && statusDropdownPos && createPortal(
                            <div
                              ref={statusDropdownRef}
                              className="fixed z-[70] w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-lg overflow-hidden py-1"
                              style={{ top: statusDropdownPos.top, right: statusDropdownPos.right }}
                              dir="rtl"
                            >
                              {STATUS_OPTIONS.map(s => (
                                <button key={s} type="button"
                                  onClick={() => { onStatusChange(lead.id, s); setStatusDropdownId(null); setStatusDropdownPos(null); }}
                                  className={`w-full text-right px-3 py-2 text-[13px] transition-colors hover:bg-slate-50 dark:hover:bg-slate-800
                                    ${(lead.status ?? 'Pending') === s ? 'font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {STATUS_LABELS[s] ?? s}
                                </button>
                              ))}
                            </div>,
                            document.body
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
                          onClick={(e) => { e.stopPropagation(); onScheduleAppointment(lead); }}
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
                      <div className="flex items-center gap-0.5 flex-row-reverse justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
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
            if (draggingLead) {
              const lead = draggingLead;
              setPendingDeleteIds((prev) => new Set(prev).add(lead.id));
              const timer = setTimeout(() => {
                onDelete(lead);
                setPendingDeleteIds((prev) => { const next = new Set(prev); next.delete(lead.id); return next; });
                pendingDeleteRef.current.delete(lead.id);
              }, 5000);
              pendingDeleteRef.current.set(lead.id, timer);
              toastApi.undo(`"${lead.full_name}" יימחק`, () => {
                clearTimeout(timer);
                pendingDeleteRef.current.delete(lead.id);
                setPendingDeleteIds((prev) => { const next = new Set(prev); next.delete(lead.id); return next; });
              });
            }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="deal-value-title">
          <div className="modal-enter w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-xl p-5">
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
