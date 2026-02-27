'use client';

import { useState, useMemo } from 'react';
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
  New: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60',
  Contacted: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60',
  'Appointment scheduled': 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60',
  Closed: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60',
  Converted: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60',
};

const STATUS_OPTIONS: LeadStatus[] = ['New', 'Contacted', 'Appointment scheduled', 'Closed'];

type SortKey = 'revenue' | 'created' | 'name' | 'score';

function formatDateDDMMYYYY(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

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
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [rowMenuCoords, setRowMenuCoords] = useState<
    | {
        top: number;
        left: number;
      }
    | null
  >(null);

  const filteredAndSorted = useMemo(() => {
    let list = [...leads];

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
      list = list.filter((l) => (l.status ?? 'New') === statusFilter);
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'revenue':
          cmp =
            (a.estimated_deal_value ?? 0) - (b.estimated_deal_value ?? 0);
          break;
        case 'name':
          cmp = (a.full_name ?? '').localeCompare(b.full_name ?? '');
          break;
        case 'score':
          cmp = (a.lead_score ?? 0) - (b.lead_score ?? 0);
          break;
        default:
          cmp =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
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
      setSelectedIds(
        new Set(filteredAndSorted.map((l) => l.id))
      );
    }
  };

  const isUrgent = (lead: Lead) => {
    const p = getDisplayPriority(lead);
    const next = lead.next_follow_up_date
      ? new Date(lead.next_follow_up_date) < new Date()
      : false;
    return p === 'Urgent' || (p === 'High' && next);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: search, filters, sort */}
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
            onChange={(e) =>
              setPriorityFilter((e.target.value || '') as Priority | '')
            }
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
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Closed">Closed</option>
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
              <ChevronDown
                className={`h-4 w-4 transition ${sortDesc ? '' : 'rotate-180'}`}
              />
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
                    checked={
                      filteredAndSorted.length > 0 &&
                      selectedIds.size === filteredAndSorted.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 dark:border-zinc-600 text-slate-900 focus:ring-slate-900"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Last contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Next follow-up
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Next appointment
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-700 bg-white dark:bg-zinc-800">
              {filteredAndSorted.map((lead) => {
                const priority = getDisplayPriority(lead);
                const urgent = isUrgent(lead);
                return (
                  <tr
                    key={lead.id}
                    className={`group transition-colors ${
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
                          <span
                            className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500"
                            title="Requires urgent attention"
                          />
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={() => onView(lead)}
                            className="font-semibold text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                          >
                            {lead.full_name || 'Unnamed lead'}
                          </button>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">
                            {lead.email || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}
                      >
                        {priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-zinc-300">
                      {(lead.estimated_deal_value ?? 0) > 0
                        ? formatCurrency(lead.estimated_deal_value!)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {lead.lead_score != null ? (
                        <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                          {lead.lead_score}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BADGE_STYLES[lead.status ?? 'New'] ?? STATUS_BADGE_STYLES['New']
                        }`}
                      >
                        {lead.status ?? 'New'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">
                      {lead.source ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">
                      {lead.last_contact_date
                        ? formatDateDDMMYYYY(lead.last_contact_date)
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">
                      {lead.next_follow_up_date
                        ? formatDateDDMMYYYY(lead.next_follow_up_date)
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-zinc-400">
                      {nextAppointmentsByLeadId?.[lead.id]
                        ? new Intl.DateTimeFormat('he-IL', {
                            timeZone: 'Asia/Jerusalem',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          }).format(new Date(nextAppointmentsByLeadId[lead.id]!))
                        : '—'}
                    </td>
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
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (rowMenuId === lead.id) {
                                setRowMenuId(null);
                                setRowMenuCoords(null);
                                return;
                              }
                              const rect =
                                (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const estimatedMenuHeight = 220;
                              const viewportHeight = window.innerHeight;
                              let top = rect.bottom + window.scrollY;
                              if (
                                top + estimatedMenuHeight >
                                window.scrollY + viewportHeight - 8
                              ) {
                                top = rect.top + window.scrollY - estimatedMenuHeight;
                              }
                              setRowMenuId(lead.id);
                              setRowMenuCoords({
                                top,
                                left: rect.right + window.scrollX,
                              });
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
                                onClick={() => {
                                  setRowMenuId(null);
                                  setRowMenuCoords(null);
                                }}
                                aria-hidden="true"
                              />
                              <div
                                className="fixed z-20 w-48 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-1 shadow-lg dark:shadow-black/30"
                                style={{
                                  top: rowMenuCoords.top,
                                  left: rowMenuCoords.left - 192,
                                }}
                              >
                                <select
                                  value={lead.status ?? 'New'}
                                  onChange={(e) => {
                                    onStatusChange(
                                      lead.id,
                                      e.target.value as LeadStatus
                                    );
                                    setRowMenuId(null);
                                  }}
                                  className="w-full border-0 bg-transparent px-3 py-2 text-left text-sm text-slate-700 dark:text-zinc-300 focus:ring-0"
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onMarkContacted(lead.id);
                                    setRowMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  Mark as contacted
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onScheduleFollowUp(lead.id);
                                    setRowMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  Schedule follow-up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onScheduleAppointment(lead);
                                    setRowMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  Schedule appointment
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDelete(lead);
                                    setRowMenuId(null);
                                  }}
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
            <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
              No leads match your filters.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
              Try adjusting search or filters, or add a new lead.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
