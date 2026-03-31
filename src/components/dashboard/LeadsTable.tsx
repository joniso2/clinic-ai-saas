'use client';

import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Trash2,
  Phone,
  Plus,
  CheckCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import type { Lead } from '@/types/leads';
import { getDisplayPriority, type Priority, type LeadStatus } from '@/types/leads';
import { STATUS_LABELS, formatCurrencyILS } from '@/lib/hebrew';
import { useToast } from '@/components/ui/Toast';
import { GlassSelect } from '@/components/ui/GlassSelect';

// Extracted modules
import {
  toWaHref,
  type SortKey,
  formatDateTime,
} from './leads-table-helpers';
import {
  WhatsAppIcon,
  FilterDropdown,
  Toast,
  PhoneContactModal,
  PendingReviewModal,
  CompleteLeadModal,
} from './leads-table-components';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

/** Risk bar color + label for a lead based on priority */
function getRiskInfo(lead: Lead): { color: string; barColor: string; label: string } | null {
  const p = getDisplayPriority(lead);
  const overdue = lead.next_follow_up_date
    ? new Date(lead.next_follow_up_date) < new Date()
    : false;
  if (p === 'Urgent' || (p === 'High' && overdue)) {
    return { color: 'text-red-500', barColor: 'bg-red-500', label: 'סיכון גבוה' };
  }
  if (p === 'High') {
    return { color: 'text-orange-500', barColor: 'bg-orange-400', label: 'סיכון בינוני' };
  }
  if (p === 'Medium') {
    return { color: 'text-amber-500', barColor: 'bg-amber-400', label: 'סיכון נמוך' };
  }
  return null;
}

/** Status badge label for leads context */
function getLeadStageBadge(lead: Lead): { label: string; className: string } | null {
  const s = lead.status ?? 'Pending';
  switch (s) {
    case 'Pending':
      return { label: 'ליד חדש', className: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' };
    case 'Contacted':
      return { label: 'נוצר קשר', className: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300' };
    case 'Appointment scheduled':
      return { label: 'תור נקבע', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' };
    case 'Closed':
      return { label: 'נסגר', className: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300' };
    case 'Disqualified':
      return { label: 'בוטל', className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
    default:
      return null;
  }
}

/** Format a Hebrew date like "12 באוקט'" */
function formatHebrewShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(d);
}

/** Format appointment as "היום 14:00" or "12 באוקט' 14:00" */
function formatAppointmentDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jerusalem',
  }).format(d);
  if (isToday) return `היום ${time}`;
  if (isTomorrow) return `מחר ${time}`;
  return `${formatHebrewShortDate(dateStr)} ${time}`;
}

/** Structured appointment info for rich rendering */
function getAppointmentParts(dateStr: string): { label: string; time: string; urgent: boolean } | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jerusalem',
  }).format(d);
  if (isToday) return { label: 'היום', time, urgent: true };
  if (isTomorrow) return { label: 'מחר', time, urgent: true };
  return { label: formatHebrewShortDate(dateStr), time, urgent: false };
}

// Avatar background colors
const AVATAR_COLORS = [
  'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-fuchsia-500',
];

function getAvatarColor(name: string | null): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Memoized Row Component ─────────────────────────────────────────────────

interface LeadRowProps {
  lead: Lead;
  isActive: boolean;
  isSelected: boolean;
  isRemoving: boolean;
  isDisqualifiedView: boolean;
  hasFinePointer: boolean;
  nextAppt: string | undefined;
  pricingServices: { service_name: string; price: number; color?: string | null }[];
  hasCompleteLead: boolean;
  onView: (lead: Lead) => void;
  onScheduleAppointment: (lead: Lead) => void;
  onToggleSelect: (id: string) => void;
  onSetCompleteLead: (lead: Lead) => void;
  onDragStart: (lead: Lead) => void;
  onDragEnd: () => void;
  onGoToCalendar: (datetime: string) => void;
}

const LeadRow = memo(function LeadRow({
  lead, isActive, isSelected, isRemoving, isDisqualifiedView, hasFinePointer,
  nextAppt, pricingServices, hasCompleteLead,
  onView, onScheduleAppointment, onToggleSelect, onSetCompleteLead, onDragStart, onDragEnd, onGoToCalendar,
}: LeadRowProps) {
  const initials = getInitials(lead.full_name);
  const riskInfo = getRiskInfo(lead);
  const stageBadge = getLeadStageBadge(lead);
  const avatarColor = getAvatarColor(lead.full_name);

  return (
    <div
      onClick={() => onView(lead)}
      draggable={hasFinePointer}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', lead.id);
        onDragStart(lead);
      }}
      onDragEnd={() => onDragEnd()}
      className={[
        'rounded-2xl overflow-hidden cursor-pointer',
        isRemoving
          ? 'opacity-0 scale-95 pointer-events-none transition-all duration-200'
          : 'opacity-100',
        isActive
          ? 'bg-white dark:bg-slate-900 card-float-active'
          : 'bg-white dark:bg-slate-900/80 card-float',
      ].filter(Boolean).join(' ')}
    >
      <div className="px-5 pt-3 pb-4">
        {/* Row 1: Identity */}
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-2xl ${avatarColor} flex items-center justify-center shrink-0 shadow-sm`}>
            <span className="text-[15px] font-bold text-white leading-none">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] sm:text-[21px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                {lead.full_name || 'ליד ללא שם'}
              </h3>
              {hasCompleteLead && lead.status !== 'Closed' && lead.status !== 'Disqualified' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSetCompleteLead(lead); }}
                  className="inline-flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/25 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shrink-0"
                  title="סיום ליד"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {stageBadge && (
                <span className={`rounded-full px-3 py-1 text-[14px] font-semibold ${stageBadge.className}`}>
                  {stageBadge.label}
                </span>
              )}
              {riskInfo && (
                <span className={`rounded-full px-3 py-1 text-[14px] font-semibold ${
                  riskInfo.color === 'text-red-500'
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                    : riskInfo.color === 'text-orange-500'
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                }`}>
                  {riskInfo.label}
                </span>
              )}
            </div>
          </div>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); onToggleSelect(lead.id); }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 text-indigo-500 focus:ring-indigo-500/40 focus:ring-offset-0 shrink-0"
            aria-label="בחר ליד"
          />
        </div>

        {/* Row 2: Split info box */}
        <div className="mt-3 grid grid-cols-2 gap-px rounded-lg overflow-hidden border border-slate-100/70 dark:border-slate-800/40">
          <div className={`px-3.5 py-2.5 ${nextAppt ? 'bg-emerald-50 dark:bg-emerald-950/25' : 'bg-slate-50/80 dark:bg-slate-800/30'}`}>
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">התור הבא</p>
            {nextAppt ? (() => {
              const parts = getAppointmentParts(nextAppt);
              if (!parts) return <span className="text-[13px] text-slate-400">—</span>;
              return (
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); onGoToCalendar(nextAppt); }}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  {parts.urgent ? (
                    <span className="inline-flex items-center rounded-md bg-red-500 px-2.5 py-0.5 text-[17px] font-black text-white leading-tight shadow-sm">
                      {parts.label}
                    </span>
                  ) : (
                    <span className="text-[16px] font-bold text-slate-900 dark:text-white leading-tight">
                      {parts.label}
                    </span>
                  )}
                  <span className="text-[19px] font-bold text-slate-900 dark:text-white tabular-nums leading-none">
                    {parts.time}
                  </span>
                </button>
              );
            })() : (
              <button type="button"
                onClick={(e) => { e.stopPropagation(); onScheduleAppointment(lead); }}
                className="inline-flex flex-row-reverse items-center gap-1 text-[15px] font-semibold text-slate-400 dark:text-slate-500 hover:text-indigo-500 transition-colors">
                <Plus className="h-3.5 w-3.5" />
                קבע תור
              </button>
            )}
          </div>
          {(() => {
            const interestColor = lead.interest ? pricingServices.find((s) => s.service_name === lead.interest)?.color : null;
            return (
              <div
                className={`px-3.5 py-2.5 ${interestColor ? '' : 'bg-slate-50 dark:bg-slate-800/30'}`}
                style={interestColor ? { background: interestColor + '18' } : undefined}
              >
                <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">אינטראקציה אחרונה</p>
                <p className="text-[16px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                  {lead.last_contact_date
                    ? `${formatHebrewShortDate(lead.last_contact_date)}${lead.interest ? ` (${lead.interest})` : ''}`
                    : lead.interest || '—'
                  }
                </p>
              </div>
            );
          })()}
        </div>

        {/* Row 3: metadata + actions */}
        <div className="mt-3 flex items-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-5 text-[15px]">
            {(() => {
              const svcColor = lead.interest
                ? pricingServices.find((s) => s.service_name === lead.interest)?.color ?? null
                : null;
              return (
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">טיפול</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-white shrink-0" />
                  <span className="font-bold" style={svcColor ? { color: svcColor } : undefined}>
                    {lead.interest || '—'}
                  </span>
                </span>
              );
            })()}
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">תשלום</span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-white shrink-0" />
              {(lead.estimated_deal_value ?? 0) > 0 ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrencyILS(lead.estimated_deal_value!)}
                </span>
              ) : (
                <span className="font-bold text-red-500 dark:text-red-400">יתרה פתוחה</span>
              )}
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2.5 md:gap-1.5">
            {lead.phone && (
              <a href={`tel:${lead.phone}`}
                className="inline-flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
                title="התקשר">
                <Phone className="h-4 w-4 md:h-3.5 md:w-3.5 shrink-0" />
              </a>
            )}
            {lead.phone && (
              <a href={toWaHref(lead.phone)} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                title="WhatsApp">
                <WhatsAppIcon className="h-4 w-4 md:h-3.5 md:w-3.5 shrink-0" />
              </a>
            )}
          </div>
        </div>

        {isDisqualifiedView && (lead.reject_reason || lead.rejected_at) && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-3 text-[12px] text-slate-400">
            {lead.reject_reason && <span>סיבה: {lead.reject_reason}</span>}
            {lead.rejected_at && <span className="tabular-nums">בוטל: {formatDateTime(lead.rejected_at)}</span>}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

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
  toolbarStartContent,
  selectedLeadId,
  onNewLead,
}: {
  leads: Lead[];
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onAcceptPendingLead?: (lead: Lead) => Promise<void>;
  onMarkContacted: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string, days?: number) => void;
  onScheduleAppointment: (lead: Lead) => void;
  onUpdateDealValue?: (leadId: string, value: number) => Promise<string | null>;
  onCompleteLead?: (
    leadId: string,
    value: number,
    notes?: string,
    serviceType?: string
  ) => Promise<string | { warning: string } | null>;
  pricingServices?: { service_name: string; price: number; color?: string | null }[];
  nextAppointmentsByLeadId?: Record<string, string | undefined>;
  onRejectLead?: (leadId: string, reason: string) => void;
  toolbarStartContent?: React.ReactNode;
  selectedLeadId?: string;
  onNewLead?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [openFilter, setOpenFilter] = useState<'priority' | 'status' | 'sort' | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  // Tab filter
  const [activeTab, setActiveTab] = useState<'all' | 'in_treatment' | 'checkin'>('all');

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
  const DEAL_VALUE_OTHER = '__other__';
  const [dealValueLeadId, setDealValueLeadId] = useState<string | null>(null);
  const [dealValueServiceKey, setDealValueServiceKey] = useState('');
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

    // Tab filter
    if (activeTab === 'in_treatment') {
      list = list.filter((l) => l.status === 'Contacted' || l.status === 'Appointment scheduled');
    } else if (activeTab === 'checkin') {
      list = list.filter((l) => l.status === 'Pending');
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
  }, [leads, debouncedSearch, priorityFilter, statusFilter, sortKey, sortDesc, pendingDeleteIds, activeTab]);

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

  // Stable callbacks for LeadRow memo
  const handleSetCompleteLead = useCallback((lead: Lead) => setCompleteLead(lead), []);
  const handleDragStart = useCallback((lead: Lead) => setDraggingLead(lead), []);
  const handleDragEnd = useCallback(() => { setDraggingLead(null); setTrashHover(false); }, []);
  const hasCompleteLead = !!onCompleteLead;

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
      setToast('\u05D4\u05DC\u05D9\u05D3 \u05D4\u05D5\u05E2\u05D1\u05E8 \u05DC\u05D4\u05E1\u05E8\u05D4');
    }, 300);
    setPendingReviewLead(null);
  }, [onStatusChange, onRejectLead]);

  return (
    <div className="space-y-3">
      {/* ── Filter/Tab Bar ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white dark:bg-slate-900/80 card-float-toolbar" dir="rtl">
        {/* ── Mobile layout: stacked rows ── */}
        <div className="flex flex-col gap-2.5 px-3.5 py-3 sm:hidden">
          {/* Row 1: Tabs + status + new lead */}
          <div className="flex items-center gap-1.5">
            {(['all', 'in_treatment', 'checkin'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab === 'all' ? 'הכל' : tab === 'in_treatment' ? 'בטיפול' : 'צ׳ק-אין'}
              </button>
            ))}
            <FilterDropdown
              id="filter-status-m"
              value={statusFilter}
              options={['', 'Pending', 'Appointment scheduled', 'Contacted', 'Closed', 'Disqualified']}
              getLabel={(v) => (v === '' ? 'סטטוס' : (STATUS_LABELS[v as LeadStatus] ?? v))}
              onChange={setStatusFilter}
              open={openFilter === 'status'}
              onOpenChange={(o) => setOpenFilter(o ? 'status' : null)}
              minWidth="80px"
            />
            {onNewLead && (
              <button
                type="button"
                onClick={onNewLead}
                className="inline-flex flex-row-reverse items-center justify-center rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 p-2 text-white dark:text-slate-900 shadow-sm transition-all active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Row 2: Search + badge */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                placeholder="חיפוש מ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 py-2 pe-10 ps-3 text-[13px] text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-shadow"
              />
            </div>
            <div className="inline-flex flex-row-reverse items-center gap-2 rounded-lg bg-slate-900/[0.06] dark:bg-white/[0.06] px-3 py-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100 shrink-0">
              <span className="relative h-2 w-2 shrink-0">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
                <span className="absolute inset-0 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[14px] font-bold tabular-nums">{leads.length}</span>
              במעקב
            </div>
          </div>
        </div>

        {/* ── Desktop layout: single row ── */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-3">
          <div className="relative flex-1 min-w-[180px] max-w-[320px]">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="חיפוש מ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 py-2.5 pe-10 ps-4 text-[14px] text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-shadow"
            />
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'in_treatment', 'checkin'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab === 'all' ? 'כל הלידים' : tab === 'in_treatment' ? 'בטיפול' : 'צ׳ק-אין'}
              </button>
            ))}
          </div>

          <FilterDropdown
            id="filter-status"
            value={statusFilter}
            options={['', 'Pending', 'Appointment scheduled', 'Contacted', 'Closed', 'Disqualified']}
            getLabel={(v) => (v === '' ? 'סטטוס' : (STATUS_LABELS[v as LeadStatus] ?? v))}
            onChange={setStatusFilter}
            open={openFilter === 'status'}
            onOpenChange={(o) => setOpenFilter(o ? 'status' : null)}
            minWidth="110px"
          />

          <div className="flex-1" />

          <div className="inline-flex flex-row-reverse items-center gap-2.5 rounded-xl bg-slate-900/[0.06] dark:bg-white/[0.06] px-4 py-2.5 text-[14px] font-semibold text-slate-800 dark:text-slate-100">
            <span className="relative h-2.5 w-2.5 shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
              <span className="absolute inset-0 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[16px] font-bold tabular-nums">{leads.length}</span>
            לידים במעקב
          </div>
          {onNewLead && (
            <button
              type="button"
              onClick={onNewLead}
              className="inline-flex flex-row-reverse items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 px-4 py-2 text-[13px] font-semibold text-white dark:text-slate-900 shadow-sm transition-all active:scale-[0.97]"
            >
              <Plus className="h-3.5 w-3.5" />
              ליד חדש
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk action bar ─────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white dark:bg-slate-900/80 px-4 py-2.5 card-float-toolbar" dir="rtl">
          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
            {selectedIds.size} נבחרו
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                selectedIds.forEach((id) => {
                  const lead = leads.find((l) => l.id === id);
                  if (lead) onDelete(lead);
                });
                setSelectedIds(new Set());
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              מחיקה
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              שינוי סטטוס
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            ביטול
          </button>
        </div>
      )}

      {/* ── Stacked Card Feed ──────────────────────────────────────────── */}
      <div className="space-y-3" dir="rtl">
        {filteredAndSorted.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            isActive={lead.id === selectedLeadId}
            isSelected={selectedIds.has(lead.id)}
            isRemoving={removingIds.has(lead.id)}
            isDisqualifiedView={isDisqualifiedView}
            hasFinePointer={hasFinePointer}
            nextAppt={nextAppointmentsByLeadId?.[lead.id]}
            pricingServices={pricingServices}
            hasCompleteLead={hasCompleteLead}
            onView={onView}
            onScheduleAppointment={onScheduleAppointment}
            onToggleSelect={toggleSelect}
            onSetCompleteLead={handleSetCompleteLead}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onGoToCalendar={goToCalendarForDate}
          />
        ))}

        {/* Empty state */}
        {filteredAndSorted.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 px-6 py-16 text-center card-float-toolbar">
            <p className="text-[14px] font-medium text-slate-700 dark:text-slate-300">אין לידים התואמים את הסינון.</p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-500">נסה לשנות חיפוש או סינון, או הוסף ליד חדש.</p>
          </div>
        )}
      </div>

      {/* ── Trash drop zone — visible only while dragging ──────────────── */}
      <div
        className={`flex items-center justify-center gap-2 rounded-2xl py-3 border-2 border-dashed transition-all duration-200 ${
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

      {/* ── Pending Review Modal ──────────────────────────────────────── */}
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

      {/* ── Phone Contact Modal ──────────────────────────────────────── */}
      {phoneModalPhone && (
        <PhoneContactModal
          phone={phoneModalPhone}
          onClose={() => setPhoneModalPhone(null)}
        />
      )}

      {/* ── Complete Lead Modal ──────────────────────────────────────── */}
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

      {/* ── Deal Value Modal ─────────────────────────────────────────── */}
      {dealValueLeadId && onUpdateDealValue && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="deal-value-title">
          <div className="modal-enter w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-xl p-5">
            <h2 id="deal-value-title" className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 text-right mb-3">הוסף שווי (₪)</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 text-right mb-1.5">בחר סוג שירות או הזן ידנית</label>
                <GlassSelect
                  value={dealValueServiceKey}
                  onChange={(v) => setDealValueServiceKey(v)}
                  options={[
                    ...pricingServices.map((s) => ({ value: s.service_name, label: `${s.service_name} — ₪${s.price}` })),
                    { value: DEAL_VALUE_OTHER, label: 'אחר (הזנה ידנית)' },
                  ]}
                  placeholder="בחר סוג שירות"
                />
              </div>
              {dealValueServiceKey === DEAL_VALUE_OTHER && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 text-right mb-1.5">סכום (₪)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={dealValueInput}
                    onChange={(e) => setDealValueInput(e.target.value)}
                    placeholder="הזן סכום"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-right text-[13px] text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500"
                    dir="ltr"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => { setDealValueLeadId(null); setDealValueServiceKey(''); setDealValueInput(''); }}
                disabled={dealValueSaving}
                className="px-4 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={dealValueSaving || !(dealValueServiceKey === DEAL_VALUE_OTHER ? dealValueInput.trim() && Number(dealValueInput) > 0 : dealValueServiceKey)}
                onClick={async () => {
                  const num = dealValueServiceKey === DEAL_VALUE_OTHER
                    ? Number(dealValueInput)
                    : (pricingServices.find((s) => s.service_name === dealValueServiceKey)?.price ?? 0);
                  if (num <= 0) return;
                  setDealValueSaving(true);
                  const err = await onUpdateDealValue(dealValueLeadId, num);
                  setDealValueSaving(false);
                  if (err) {
                    setToast(err);
                    return;
                  }
                  setDealValueLeadId(null);
                  setDealValueServiceKey('');
                  setDealValueInput('');
                }}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition"
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
