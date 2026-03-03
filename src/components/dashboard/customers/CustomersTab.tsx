'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  Phone,
  DollarSign,
  Calendar,
  Hash,
} from 'lucide-react';
import type { Patient } from '@/types/patients';
import type { Lead } from '@/types/leads';
import type { CompletedAppointmentRow } from '@/repositories/appointment.repository';
import { formatCurrencyILS } from '@/lib/hebrew';
import { PATIENT_STATUS_LABELS } from '@/lib/hebrew';

const STATUS_OPTIONS = ['active', 'dormant', 'inactive'] as const;

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Debounced search
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function CustomersTab() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [revenueMinInput, setRevenueMinInput] = useState('');
  const [lastVisitOver6, setLastVisitOver6] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Patient | null>(null);
  const [detailAppointments, setDetailAppointments] = useState<CompletedAppointmentRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [closedLeads, setClosedLeads] = useState<Lead[]>([]);
  const [closedLeadsLoading, setClosedLeadsLoading] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const fetchClosedLeads = useCallback(async () => {
    setClosedLeadsLoading(true);
    const res = await fetch('/api/leads', { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as { leads?: Lead[] };
    if (res.ok && Array.isArray(json.leads)) {
      setClosedLeads(json.leads.filter((l) => l.status === 'Closed'));
    } else {
      setClosedLeads([]);
    }
    setClosedLeadsLoading(false);
  }, []);

  const fetchCustomers = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (statusFilter) params.set('status', statusFilter);
    if (revenueMinInput.trim()) {
      const n = Number(revenueMinInput.trim());
      if (!Number.isNaN(n)) params.set('revenueMin', String(n));
    }
    if (lastVisitOver6) params.set('lastVisitOver6', 'true');
    const res = await fetch(`/api/customers?${params.toString()}`, { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as { customers?: Patient[] };
    if (res.ok) setCustomers(json.customers ?? []);
    setLoading(false);
  }, [debouncedSearch, statusFilter, revenueMinInput, lastVisitOver6]);

  useEffect(() => {
    setLoading(true);
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (!loading && customers.length === 0) void fetchClosedLeads();
  }, [loading, customers.length, fetchClosedLeads]);

  useEffect(() => {
    if (!detailId) {
      setDetailCustomer(null);
      setDetailAppointments([]);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/customers/${detailId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { customer?: Patient; appointments?: CompletedAppointmentRow[] }) => {
        setDetailCustomer(data.customer ?? null);
        setDetailAppointments(data.appointments ?? []);
      })
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/customers/${deleteId}`, { method: 'DELETE', credentials: 'include' });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      setCustomers((prev) => prev.filter((c) => c.id !== deleteId));
      if (detailId === deleteId) setDetailId(null);
    }
  };

  const filteredCount = customers.length;

  if (loading && customers.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
      </div>
    );
  }

  if (!loading && customers.length === 0) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/50 px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500">
            <Hash className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-zinc-100">עדיין אין לקוחות מטופלים</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-zinc-400">סגור ליד ראשון כדי להתחיל לבנות את רשימת הלקוחות שלך</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-6 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm transition hover:bg-slate-800 dark:hover:bg-white"
          >
            חזרה ללידים
          </button>
        </div>

        {closedLeadsLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
          </div>
        ) : closedLeads.length > 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
            <h3 className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-zinc-300 border-b border-slate-100 dark:border-zinc-800">לידים סגורים (טופלו) — מופיעים כאן עד יצירת טבלת הלקוחות</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right" dir="rtl">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-2 px-3">שם</th>
                    <th className="py-2 px-3">טלפון</th>
                    <th className="py-2 px-3">שווי</th>
                    <th className="py-2 px-3">תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {closedLeads.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 dark:border-zinc-800/80 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors py-2">
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-zinc-100">{l.full_name || '—'}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-zinc-400" dir="ltr">{l.phone || '—'}</td>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-zinc-200">{(l.estimated_deal_value ?? 0) > 0 ? formatCurrencyILS(l.estimated_deal_value!) : '—'}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-zinc-400">{formatDate(l.updated_at ?? l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-row-reverse">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="חיפוש שם או טלפון..."
            className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-3 pr-9 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-500 text-right"
            dir="rtl"
          />
        </div>
        <div ref={filterRef} className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300"
          >
            מסננים
            <ChevronDown className="h-4 w-4" />
          </button>
          {filterOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-3 space-y-2 text-right" dir="rtl">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">סטטוס</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
              >
                <option value="">הכל</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{PATIENT_STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mt-2">הכנסה מינימלית (₪)</label>
              <input
                type="number"
                min={0}
                value={revenueMinInput}
                onChange={(e) => setRevenueMinInput(e.target.value)}
                placeholder="0"
                className="w-full rounded border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lastVisitOver6}
                  onChange={(e) => setLastVisitOver6(e.target.checked)}
                />
                <span className="text-sm">ביקור אחרון לפני 6+ חודשים</span>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right" dir="rtl">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="py-2 px-3">שם</th>
                <th className="py-2 px-3">טלפון</th>
                <th className="py-2 px-3">ביקור אחרון</th>
                <th className="py-2 px-3">ביקורים</th>
                <th className="py-2 px-3">הכנסה</th>
                <th className="py-2 px-3">סטטוס</th>
                <th className="py-2 px-3 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 dark:border-zinc-800/80 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors py-2"
                >
                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-zinc-100">{c.full_name}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-400" dir="ltr">{c.phone}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-400">{formatDate(c.last_visit_date)}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-400">{c.visits_count}</td>
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-zinc-200">{formatCurrencyILS(Number(c.total_revenue))}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                      c.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                      c.status === 'dormant' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                      'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}>
                      {PATIENT_STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1 justify-start">
                      <button
                        type="button"
                        onClick={() => setDetailId(c.id)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-zinc-100 transition"
                        aria-label="צפה"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(c.id)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition"
                        aria-label="מחק"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-zinc-900/60" onClick={() => setDetailId(null)} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border-s border-slate-200 dark:border-zinc-800 shadow-xl overflow-y-auto" dir="rtl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">פרטי לקוח</h2>
              <button type="button" onClick={() => setDetailId(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="סגור">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {detailLoading && !detailCustomer ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
                </div>
              ) : detailCustomer ? (
                <>
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-4 space-y-3">
                    <p className="font-semibold text-slate-900 dark:text-zinc-100 text-lg">{detailCustomer.full_name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span dir="ltr">{detailCustomer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-slate-900 dark:text-zinc-100">{formatCurrencyILS(Number(detailCustomer.total_revenue))}</span>
                      <span className="text-slate-500 dark:text-zinc-400">סה״כ הכנסה</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-zinc-400">
                      <span>{detailCustomer.visits_count} ביקורים</span>
                      <span>אחרון: {formatDate(detailCustomer.last_visit_date)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">תוריים שהסתיימו</h3>
                    {detailAppointments.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-zinc-400">אין תוריים להצגה</p>
                    ) : (
                      <ul className="space-y-2">
                        {detailAppointments.map((apt) => (
                          <li key={apt.id} className="rounded-lg border border-slate-100 dark:border-zinc-800 px-3 py-2 text-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-slate-900 dark:text-zinc-100">{formatDate(apt.datetime)}</span>
                                {apt.service_name && <span className="text-slate-500 dark:text-zinc-400 mr-2"> · {apt.service_name}</span>}
                              </div>
                              <span className="font-medium text-slate-800 dark:text-zinc-200">{apt.revenue != null ? formatCurrencyILS(apt.revenue) : '—'}</span>
                            </div>
                            {apt.notes && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{apt.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDeleteId(null)} aria-hidden="true" />
          <div className="relative rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-xl text-right max-w-sm w-full" dir="rtl">
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">מחיקת לקוח</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">הלקוח יוסר מהרשימה (מחיקה רכה). ניתן לשחזר בהמשך.</p>
            <div className="mt-4 flex gap-2 justify-start">
              <button type="button" onClick={() => setDeleteId(null)} className="rounded-xl border border-slate-200 dark:border-zinc-600 px-4 py-2 text-sm font-medium">ביטול</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-60">מחק</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
