'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Eye,
  Trash2,
  ChevronDown,
  X,
  Phone,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import type { Patient } from '@/types/patients';
import type { CompletedAppointmentRow } from '@/repositories/appointment.repository';
import { formatCurrencyILS, PATIENT_STATUS_LABELS } from '@/lib/hebrew';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type Props = { clinicId: string; clinicName: string };

export function SuperAdminCustomersClient({ clinicId, clinicName }: Props) {
  const [customers, setCustomers] = useState<Patient[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Patient | null>(null);
  const [detailAppointments, setDetailAppointments] = useState<CompletedAppointmentRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const fetchCustomers = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/super-admin/clinics/${clinicId}/customers?${params.toString()}`, { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as { customers?: Patient[]; revenueSummary?: { totalRevenue: number } };
    if (res.ok) {
      setCustomers(json.customers ?? []);
      setRevenueSummary(json.revenueSummary?.totalRevenue ?? 0);
    }
    setLoading(false);
  }, [clinicId, debouncedSearch, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (!detailId) {
      setDetailCustomer(null);
      setDetailAppointments([]);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/super-admin/clinics/${clinicId}/customers/${detailId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { customer?: Patient; appointments?: CompletedAppointmentRow[] }) => {
        setDetailCustomer(data.customer ?? null);
        setDetailAppointments(data.appointments ?? []);
      })
      .finally(() => setDetailLoading(false));
  }, [clinicId, detailId]);

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
    const res = await fetch(`/api/super-admin/clinics/${clinicId}/customers/${deleteId}`, { method: 'DELETE', credentials: 'include' });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      setCustomers((prev) => prev.filter((c) => c.id !== deleteId));
      if (detailId === deleteId) setDetailId(null);
    }
    fetchCustomers();
  };

  return (
    <>
      <div className="mb-6 text-right">
        <Link
          href="/dashboard/super-admin#clinics"
          className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 mb-2"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לקליניקות
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">לקוחות · {clinicName}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">צפייה ועריכה לפי קליניקה</p>
      </div>

      {!loading && customers.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
          <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">סה״כ הכנסות (לקוחות): </span>
          <span className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{formatCurrencyILS(revenueSummary)}</span>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center flex-row-reverse">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="חיפוש שם או טלפון..."
            className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-3 pr-9 py-2 text-sm text-right"
            dir="rtl"
          />
        </div>
        <div ref={filterRef} className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          >
            מסננים
            <ChevronDown className="h-4 w-4" />
          </button>
          {filterOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-3 text-right" dir="rtl">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">סטטוס</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm mt-1"
              >
                <option value="">הכל</option>
                <option value="active">{PATIENT_STATUS_LABELS.active}</option>
                <option value="dormant">{PATIENT_STATUS_LABELS.dormant}</option>
                <option value="inactive">{PATIENT_STATUS_LABELS.inactive}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {loading && customers.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/50 px-6 py-12 text-center" dir="rtl">
          <p className="text-sm text-slate-500 dark:text-zinc-400">אין לקוחות לקליניקה זו.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right" dir="rtl">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase">
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
                  <tr key={c.id} className="border-b border-slate-100 dark:border-zinc-800/80 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 py-2">
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
                        <button type="button" onClick={() => setDetailId(c.id)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-700" aria-label="צפה">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600" aria-label="מחק">
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
      )}

      {detailId && (
        <div className="fixed inset-0 z-50 flex justify-end">
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
                      <span className="font-medium">{formatCurrencyILS(Number(detailCustomer.total_revenue))}</span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-zinc-400">
                      {detailCustomer.visits_count} ביקורים · אחרון: {formatDate(detailCustomer.last_visit_date)}
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
                            <div className="flex justify-between">
                              <span>{formatDate(apt.datetime)}{apt.service_name ? ` · ${apt.service_name}` : ''}</span>
                              <span className="font-medium">{apt.revenue != null ? formatCurrencyILS(apt.revenue) : '—'}</span>
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

      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDeleteId(null)} aria-hidden="true" />
          <div className="relative rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-xl text-right max-w-sm w-full" dir="rtl">
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">מחיקת לקוח</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">מחיקה רכה. ניתן לשחזר בהמשך.</p>
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
