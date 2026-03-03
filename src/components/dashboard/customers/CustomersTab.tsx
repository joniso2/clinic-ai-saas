'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  DollarSign,
  Hash,
  ArrowRight,
  UserCheck,
  Users,
  Calendar,
  MessageCircle,
  Archive,
  FileText,
} from 'lucide-react';
import type { Patient } from '@/types/patients';
import type { Lead } from '@/types/leads';
import type { CompletedAppointmentRow } from '@/repositories/appointment.repository';
import { formatCurrencyILS, formatPhoneILS } from '@/lib/hebrew';
import { PATIENT_STATUS_LABELS, SOURCE_LABELS } from '@/lib/hebrew';

const STATUS_OPTIONS = ['active', 'dormant', 'inactive'] as const;
type SortKey = 'date_desc' | 'date_asc' | 'value_desc' | 'value_asc' | 'name_az' | 'name_za';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date_desc', label: 'תאריך סגירה (חדש לישן)' },
  { value: 'date_asc', label: 'תאריך סגירה (ישן לחדש)' },
  { value: 'value_desc', label: 'שווי (גבוה לנמוך)' },
  { value: 'value_asc', label: 'שווי (נמוך לגבוה)' },
  { value: 'name_az', label: 'שם א־ת' },
  { value: 'name_za', label: 'שם ת־א' },
];

const TREATMENT_STATUS: Record<string, string> = {
  active: 'בתהליך',
  dormant: 'רדום',
  inactive: 'ארכיון',
  Closed: 'הושלם',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getCloseDatePatient(p: Patient): string | null {
  return p.last_visit_date ?? p.updated_at ?? p.created_at ?? null;
}
function getCloseDateLead(l: Lead): string | null {
  return l.created_at ?? null;
}
function getValuePatient(p: Patient): number {
  return Number(p.total_revenue) || 0;
}
function getValueLead(l: Lead): number {
  return l.estimated_deal_value ?? 0;
}
function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function LeadDrawer({
  lead,
  onClose,
  formatDate,
  formatCurrency,
  formatPhone,
  sourceLabel,
  notes,
  onNotesChange,
  onWhatsApp,
  onBackToLeads,
}: {
  lead: Lead;
  onClose: () => void;
  formatDate: (v: string | null) => string;
  formatCurrency: (n: number) => string;
  formatPhone: (p: string | null | undefined) => string;
  sourceLabel: string;
  notes: string;
  onNotesChange: (v: string) => void;
  onWhatsApp: () => void;
  onBackToLeads: () => void;
}) {
  const value = lead.estimated_deal_value ?? 0;
  const closeDate = lead.created_at ?? null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-zinc-950/60 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border-s border-slate-200 dark:border-zinc-800 shadow-2xl overflow-y-auto animate-in slide-in-from-end duration-200" dir="rtl" style={{ animationFillMode: 'forwards' }}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">פרטי ליד שטופל</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="סגור">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">פרטים בסיסיים</h3>
            <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-4 space-y-2">
              <p className="font-semibold text-slate-900 dark:text-zinc-100 text-lg">{lead.full_name || '—'}</p>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={lead.phone ? `tel:${lead.phone}` : '#'} dir="ltr" className="text-indigo-600 dark:text-indigo-400 hover:underline">{formatPhone(lead.phone)}</a>
              </div>
              <p className="text-sm text-slate-600 dark:text-zinc-400"><span className="text-slate-500 dark:text-zinc-500">מקור:</span> {sourceLabel}</p>
              <p className="text-sm text-slate-600 dark:text-zinc-400"><span className="text-slate-500 dark:text-zinc-500">תאריך סגירה:</span> {formatDate(closeDate)}</p>
            </div>
          </section>
          <section>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">סיכום הכנסות</h3>
            <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-4">
              <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{value > 0 ? formatCurrency(value) : '—'}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">שווי הליד</p>
            </div>
          </section>
          <section>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">הערות</h3>
            <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} placeholder="הערות פנימיות..." rows={3} className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" dir="rtl" />
          </section>
          <section>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">פעולות</h3>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={onWhatsApp} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition">
                <MessageCircle className="h-4 w-4" /> שליחת וואטסאפ
              </button>
              <button type="button" onClick={onBackToLeads} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white transition">
                <ArrowRight className="h-4 w-4" /> חזרה ללידים
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function CustomersTab() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [revenueMinInput, setRevenueMinInput] = useState('');
  const [lastVisitOver6, setLastVisitOver6] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [revenueMinFilter, setRevenueMinFilter] = useState('');
  const [revenueMaxFilter, setRevenueMaxFilter] = useState('');
  const [withRevenueOnly, setWithRevenueOnly] = useState(false);
  const [withoutValueOnly, setWithoutValueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('date_desc');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Patient | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailAppointments, setDetailAppointments] = useState<CompletedAppointmentRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailNotes, setDetailNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [closedLeads, setClosedLeads] = useState<Lead[]>([]);
  const [closedLeadsLoading, setClosedLeadsLoading] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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
  }, [statusFilter, revenueMinInput, lastVisitOver6]);

  const filteredClosedLeads = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    let list = closedLeads.filter((l) => {
      if (q) {
        const name = (l.full_name ?? '').toLowerCase();
        const phone = (l.phone ?? '').replace(/\D/g, '');
        const qDigits = q.replace(/\D/g, '');
        const matchName = name.includes(q);
        const matchPhone = qDigits ? phone.includes(qDigits) : (l.phone ?? '').toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }
      const closeDate = getCloseDateLead(l);
      const dateTs = closeDate ? new Date(closeDate).getTime() : 0;
      if (dateFrom && dateTs < new Date(dateFrom).setHours(0, 0, 0, 0)) return false;
      if (dateTo && dateTs > new Date(dateTo).setHours(23, 59, 59, 999)) return false;
      const val = getValueLead(l);
      if (revenueMinFilter !== '' && !Number.isNaN(Number(revenueMinFilter)) && val < Number(revenueMinFilter)) return false;
      if (revenueMaxFilter !== '' && !Number.isNaN(Number(revenueMaxFilter)) && val > Number(revenueMaxFilter)) return false;
      if (withRevenueOnly && val <= 0) return false;
      if (withoutValueOnly && val > 0) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const da = new Date(getCloseDateLead(a) ?? 0).getTime();
      const db = new Date(getCloseDateLead(b) ?? 0).getTime();
      const va = getValueLead(a);
      const vb = getValueLead(b);
      const na = (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he');
      switch (sortBy) {
        case 'date_desc': return db - da;
        case 'date_asc': return da - db;
        case 'value_desc': return vb - va;
        case 'value_asc': return va - vb;
        case 'name_az': return na;
        case 'name_za': return -na;
        default: return db - da;
      }
    });
    return list;
  }, [closedLeads, searchInput, dateFrom, dateTo, revenueMinFilter, revenueMaxFilter, withRevenueOnly, withoutValueOnly, sortBy]);

  const filteredCustomers = useMemo(() => {
    let list = customers;
    const q = searchInput.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const name = (c.full_name ?? '').toLowerCase();
        const phone = (c.phone ?? '').replace(/\D/g, '');
        const qDigits = q.replace(/\D/g, '');
        return name.includes(q) || (qDigits ? phone.includes(qDigits) : (c.phone ?? '').toLowerCase().includes(q));
      });
    }
    list = list.filter((c) => {
      const closeDate = getCloseDatePatient(c);
      const dateTs = closeDate ? new Date(closeDate).getTime() : 0;
      if (dateFrom && dateTs < new Date(dateFrom).setHours(0, 0, 0, 0)) return false;
      if (dateTo && dateTs > new Date(dateTo).setHours(23, 59, 59, 999)) return false;
      const val = getValuePatient(c);
      if (revenueMinFilter !== '' && !Number.isNaN(Number(revenueMinFilter)) && val < Number(revenueMinFilter)) return false;
      if (revenueMaxFilter !== '' && !Number.isNaN(Number(revenueMaxFilter)) && val > Number(revenueMaxFilter)) return false;
      if (withRevenueOnly && val <= 0) return false;
      if (withoutValueOnly && val > 0) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const da = new Date(getCloseDatePatient(a) ?? 0).getTime();
      const db = new Date(getCloseDatePatient(b) ?? 0).getTime();
      const va = getValuePatient(a);
      const vb = getValuePatient(b);
      const na = (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he');
      switch (sortBy) {
        case 'date_desc': return db - da;
        case 'date_asc': return da - db;
        case 'value_desc': return vb - va;
        case 'value_asc': return va - vb;
        case 'name_az': return na;
        case 'name_za': return -na;
        default: return db - da;
      }
    });
    return list;
  }, [customers, searchInput, dateFrom, dateTo, revenueMinFilter, revenueMaxFilter, withRevenueOnly, withoutValueOnly, sortBy]);

  const hasActiveFilters =
    !!dateFrom || !!dateTo || revenueMinFilter !== '' || revenueMaxFilter !== '' || withRevenueOnly || withoutValueOnly || !!statusFilter || lastVisitOver6;
  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setRevenueMinFilter('');
    setRevenueMaxFilter('');
    setWithRevenueOnly(false);
    setWithoutValueOnly(false);
    setStatusFilter('');
    setLastVisitOver6(false);
    setSortBy('date_desc');
  };

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
    if (!filtersOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filtersOpen]);

  const openCustomerDetail = (c: Patient) => {
    setDetailLead(null);
    setDetailId(c.id);
    setDetailNotes('');
  };
  const openLeadDetail = (l: Lead) => {
    setDetailId(null);
    setDetailCustomer(null);
    setDetailAppointments([]);
    setDetailLead(l);
    setDetailNotes('');
  };
  const closeDrawer = () => {
    setDetailId(null);
    setDetailLead(null);
    setDetailCustomer(null);
    setDetailAppointments([]);
  };

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

  const filteredCount = filteredCustomers.length;
  const kpiClosedLeads = filteredClosedLeads;
  const kpiTotalRevenueLeads = kpiClosedLeads.reduce((s, l) => s + getValueLead(l), 0);
  const kpiThisMonthLeads = kpiClosedLeads.filter((l) => isThisMonth(getCloseDateLead(l))).length;
  const kpiCustomers = filteredCustomers;
  const kpiTotalRevenueCustomers = kpiCustomers.reduce((s, c) => s + getValuePatient(c), 0);
  const kpiAvgRevenue = kpiCustomers.length > 0 ? kpiTotalRevenueCustomers / kpiCustomers.length : 0;
  const kpiThisMonthCustomers = kpiCustomers.filter((c) => isThisMonth(getCloseDatePatient(c))).length;

  if (loading && customers.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
      </div>
    );
  }

  if (!loading && customers.length === 0) {
    if (closedLeadsLoading) {
      return (
        <div className="flex justify-center py-16" dir="rtl">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
        </div>
      );
    }

    if (closedLeads.length > 0) {
      return (
        <div className="space-y-4" dir="rtl">
          {/* Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-row-reverse">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="חיפוש לפי שם או מספר טלפון..."
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-3 pr-10 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:ring-indigo-500/30 text-right"
                dir="rtl"
              />
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 transition hover:bg-slate-50 dark:hover:bg-zinc-700"
            >
              חזרה ללידים
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Collapsible filters */}
          <div ref={filterRef} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition"
            >
              <span>סינון ומעבר</span>
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {filtersOpen && (
              <div className="border-t border-slate-100 dark:border-zinc-800 px-4 py-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">תאריך סגירה מ־</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" dir="rtl" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">עד־</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" dir="rtl" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">שווי מינימום (₪)</label>
                    <input type="number" min={0} value={revenueMinFilter} onChange={(e) => setRevenueMinFilter(e.target.value)} placeholder="0" className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">שווי מקסימום (₪)</label>
                    <input type="number" min={0} value={revenueMaxFilter} onChange={(e) => setRevenueMaxFilter(e.target.value)} placeholder="—" className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={withRevenueOnly} onChange={(e) => setWithRevenueOnly(e.target.checked)} className="rounded border-slate-300 dark:border-zinc-600" />
                    <span className="text-sm text-slate-700 dark:text-zinc-300">לקוחות עם הכנסה</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={withoutValueOnly} onChange={(e) => setWithoutValueOnly(e.target.checked)} className="rounded border-slate-300 dark:border-zinc-600" />
                    <span className="text-sm text-slate-700 dark:text-zinc-300">לקוחות ללא שווי</span>
                  </label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" dir="rtl">
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {hasActiveFilters && (
                    <button type="button" onClick={clearFilters} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                      נקה סינון
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {dateFrom && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">מ־ {dateFrom}</span>}
              {dateTo && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">עד {dateTo}</span>}
              {revenueMinFilter !== '' && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">שווי מינ׳ {revenueMinFilter}</span>}
              {revenueMaxFilter !== '' && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">שווי מקס׳ {revenueMaxFilter}</span>}
              {withRevenueOnly && <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-xs text-indigo-700 dark:text-indigo-400">עם הכנסה</span>}
              {withoutValueOnly && <span className="rounded-full bg-amber-50 dark:bg-amber-900/30 px-3 py-1 text-xs text-amber-700 dark:text-amber-400">ללא שווי</span>}
            </div>
          )}

          {/* KPI strip */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'סה״כ לקוחות', value: String(kpiClosedLeads.length), icon: Users },
              { label: 'סה״כ הכנסות', value: formatCurrencyILS(kpiTotalRevenueLeads), icon: DollarSign },
              { label: 'ממוצע הכנסה ללקוח', value: kpiClosedLeads.length ? formatCurrencyILS(kpiTotalRevenueLeads / kpiClosedLeads.length) : '—', icon: DollarSign },
              { label: 'שטופלו החודש', value: String(kpiThisMonthLeads), icon: Calendar },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-zinc-900 dark:to-zinc-800/80 p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{value}</p>
                <Icon className="mt-2 h-5 w-5 text-slate-300 dark:text-zinc-600" />
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-2 bg-slate-50/50 dark:bg-zinc-800/30">
              <UserCheck className="h-5 w-5 text-slate-500 dark:text-zinc-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">לידים שטופלו</h2>
            </div>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-right min-w-[520px]" dir="rtl">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-zinc-800/95 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  <tr className="border-b border-slate-200 dark:border-zinc-700">
                    <th className="py-3.5 px-4">שם</th>
                    <th className="py-3.5 px-4">טלפון</th>
                    <th className="py-3.5 px-4">תאריך סגירה</th>
                    <th className="py-3.5 px-4">שווי</th>
                    <th className="py-3.5 px-4">מספר טיפולים</th>
                    <th className="py-3.5 px-4">סטטוס טיפול</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClosedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-slate-500 dark:text-zinc-400">
                        אין תוצאות התואמות את הסינון.
                      </td>
                    </tr>
                  ) : (
                    filteredClosedLeads.map((l) => (
                      <tr
                        key={l.id}
                        onClick={() => openLeadDetail(l)}
                        className="border-b border-slate-100 dark:border-zinc-800/80 last:border-0 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer transition"
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-zinc-100">{l.full_name || '—'}</td>
                        <td className="py-3.5 px-4">
                          <a href={l.phone ? `tel:${l.phone}` : '#'} onClick={(e) => e.stopPropagation()} dir="ltr" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                            {formatPhoneILS(l.phone)}
                          </a>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400">{formatDate(getCloseDateLead(l))}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-zinc-200">{getValueLead(l) > 0 ? formatCurrencyILS(getValueLead(l)) : '—'}</td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-500">—</td>
                        <td className="py-3.5 px-4"><span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">{TREATMENT_STATUS.Closed}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lead drawer */}
          {detailLead && (
            <LeadDrawer
              lead={detailLead}
              onClose={closeDrawer}
              formatDate={formatDate}
              formatCurrency={formatCurrencyILS}
              formatPhone={formatPhoneILS}
              sourceLabel={SOURCE_LABELS[detailLead.source ?? ''] ?? detailLead.source ?? '—'}
              notes={detailNotes}
              onNotesChange={setDetailNotes}
              onWhatsApp={() => window.open(`https://wa.me/972${(detailLead.phone ?? '').replace(/\D/g, '').replace(/^0/, '')}`, '_blank')}
              onBackToLeads={() => { closeDrawer(); router.push('/dashboard'); }}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-6 py-14 text-center shadow-sm" dir="rtl">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500">
          <Hash className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-zinc-100">עדיין אין לקוחות</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-zinc-400">סגור ליד ראשון כדי להתחיל לבנות את רשימת הלקוחות.</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-6 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm transition hover:bg-slate-800 dark:hover:bg-white"
        >
          חזרה ללידים
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-row-reverse" dir="rtl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="חיפוש לפי שם או מספר טלפון..."
            className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-3 pr-10 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:ring-indigo-500/30 text-right"
            dir="rtl"
          />
        </div>
        <span className="text-sm text-slate-500 dark:text-zinc-400">{filteredCount} לקוחות</span>
      </div>

      {/* Collapsible filters */}
      <div ref={filterRef} className="mb-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition"
        >
          <span>סינון ומעבר</span>
          {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {filtersOpen && (
          <div className="border-t border-slate-100 dark:border-zinc-800 px-4 py-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">תאריך סגירה מ־</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" dir="rtl" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">עד־</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" dir="rtl" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">שווי מינימום (₪)</label>
                <input type="number" min={0} value={revenueMinFilter} onChange={(e) => setRevenueMinFilter(e.target.value)} placeholder="0" className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">שווי מקסימום (₪)</label>
                <input type="number" min={0} value={revenueMaxFilter} onChange={(e) => setRevenueMaxFilter(e.target.value)} placeholder="—" className="w-full rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={withRevenueOnly} onChange={(e) => setWithRevenueOnly(e.target.checked)} className="rounded border-slate-300 dark:border-zinc-600" />
                <span className="text-sm text-slate-700 dark:text-zinc-300">לקוחות עם הכנסה</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={withoutValueOnly} onChange={(e) => setWithoutValueOnly(e.target.checked)} className="rounded border-slate-300 dark:border-zinc-600" />
                <span className="text-sm text-slate-700 dark:text-zinc-300">לקוחות ללא שווי</span>
              </label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" dir="rtl">
                <option value="">סטטוס: הכל</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{PATIENT_STATUS_LABELS[s] ?? s}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm" dir="rtl">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={lastVisitOver6} onChange={(e) => setLastVisitOver6(e.target.checked)} className="rounded border-slate-300 dark:border-zinc-600" />
                <span className="text-sm text-slate-700 dark:text-zinc-300">ביקור אחרון לפני 6+ חודשים</span>
              </label>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                  נקה סינון
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {dateFrom && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">מ־ {dateFrom}</span>}
          {dateTo && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">עד {dateTo}</span>}
          {revenueMinFilter !== '' && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">שווי מינ׳ {revenueMinFilter}</span>}
          {revenueMaxFilter !== '' && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">שווי מקס׳ {revenueMaxFilter}</span>}
          {withRevenueOnly && <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-xs text-indigo-700 dark:text-indigo-400">עם הכנסה</span>}
          {withoutValueOnly && <span className="rounded-full bg-amber-50 dark:bg-amber-900/30 px-3 py-1 text-xs text-amber-700 dark:text-amber-400">ללא שווי</span>}
          {statusFilter && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">סטטוס: {PATIENT_STATUS_LABELS[statusFilter] ?? statusFilter}</span>}
          {lastVisitOver6 && <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-xs text-slate-600 dark:text-zinc-400">ביקור 6+ חודשים</span>}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        {[
          { label: 'סה״כ לקוחות', value: String(kpiCustomers.length), icon: Users },
          { label: 'סה״כ הכנסות', value: formatCurrencyILS(kpiTotalRevenueCustomers), icon: DollarSign },
          { label: 'ממוצע הכנסה ללקוח', value: formatCurrencyILS(kpiAvgRevenue), icon: DollarSign },
          { label: 'שטופלו החודש', value: String(kpiThisMonthCustomers), icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-zinc-900 dark:to-zinc-800/80 p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{value}</p>
            <Icon className="mt-2 h-5 w-5 text-slate-300 dark:text-zinc-600" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-2 bg-slate-50/50 dark:bg-zinc-800/30">
          <UserCheck className="h-5 w-5 text-slate-500 dark:text-zinc-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">רשימת לקוחות</h2>
        </div>
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-right min-w-[640px]" dir="rtl">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-zinc-800/95 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr className="border-b border-slate-200 dark:border-zinc-700">
                <th className="py-3.5 px-4">שם</th>
                <th className="py-3.5 px-4">טלפון</th>
                <th className="py-3.5 px-4">תאריך סגירה</th>
                <th className="py-3.5 px-4">שווי</th>
                <th className="py-3.5 px-4">מספר טיפולים</th>
                <th className="py-3.5 px-4">סטטוס טיפול</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-zinc-400">
                      <FileText className="h-10 w-10 text-slate-300 dark:text-zinc-600" />
                      <p className="text-sm">אין תוצאות התואמות את הסינון.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openCustomerDetail(c)}
                    className="border-b border-slate-100 dark:border-zinc-800/80 last:border-0 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-zinc-100">{c.full_name}</td>
                    <td className="py-3.5 px-4">
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} dir="ltr" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        {formatPhoneILS(c.phone)}
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400">{formatDate(getCloseDatePatient(c))}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-zinc-200">{formatCurrencyILS(Number(c.total_revenue))}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400">{c.visits_count}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        c.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                        c.status === 'dormant' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                        'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
                      }`}>
                        {TREATMENT_STATUS[c.status] ?? PATIENT_STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer detail drawer */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50 dark:bg-zinc-950/60 transition-opacity" onClick={closeDrawer} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border-s border-slate-200 dark:border-zinc-800 shadow-2xl overflow-y-auto animate-in slide-in-from-end duration-200" dir="rtl" style={{ animationFillMode: 'forwards' }}>
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-900 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">פרטי לקוח</h2>
              <button type="button" onClick={closeDrawer} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="סגור">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {detailLoading && !detailCustomer ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
                </div>
              ) : detailCustomer ? (
                <>
                  <section>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">פרטים בסיסיים</h3>
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-4 space-y-2">
                      <p className="font-semibold text-slate-900 dark:text-zinc-100 text-lg">{detailCustomer.full_name}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                        <Phone className="h-4 w-4 shrink-0" />
                        <a href={`tel:${detailCustomer.phone}`} dir="ltr" className="text-indigo-600 dark:text-indigo-400 hover:underline">{formatPhoneILS(detailCustomer.phone)}</a>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-zinc-400">מקור: —</p>
                      <p className="text-sm text-slate-600 dark:text-zinc-400">תאריך סגירה: {formatDate(getCloseDatePatient(detailCustomer))}</p>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">סיכום הכנסות</h3>
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-4 space-y-1">
                      <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{formatCurrencyILS(Number(detailCustomer.total_revenue))}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">סה״כ הכנסה · {detailCustomer.visits_count} ביקורים</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">ביקור אחרון: {formatDate(detailCustomer.last_visit_date)}</p>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">תוריים שהסתיימו</h3>
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
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">הערות</h3>
                    <textarea value={detailNotes} onChange={(e) => setDetailNotes(e.target.value)} placeholder="הערות פנימיות..." rows={3} className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" dir="rtl" />
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">פעולות</h3>
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => { closeDrawer(); router.push('/dashboard/calendar'); }} className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                        <Calendar className="h-4 w-4" /> תזמן תור
                      </button>
                      <button type="button" onClick={() => window.open(`https://wa.me/972${(detailCustomer.phone ?? '').replace(/\D/g, '').replace(/^0/, '')}`, '_blank')} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition">
                        <MessageCircle className="h-4 w-4" /> שליחת וואטסאפ
                      </button>
                      <button type="button" onClick={() => { setDeleteId(detailCustomer.id); closeDrawer(); }} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-3 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">
                        <Archive className="h-4 w-4" /> ארכוב לקוח
                      </button>
                    </div>
                  </section>
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
