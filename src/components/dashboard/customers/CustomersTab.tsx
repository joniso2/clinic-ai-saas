'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2, X, DollarSign, ArrowRight, UserCheck, Users,
  Calendar, Archive, FileText, Send, SortAsc, BellRing, TrendingUp,
} from 'lucide-react';
import { CustomersImportModal } from './CustomersImportModal';
import { MessagingPanel } from './MessagingPanel';
import type { Patient } from '@/types/patients';
import type { Lead } from '@/types/leads';
import type { CompletedAppointmentRow } from '@/repositories/appointment.repository';
import { formatCurrencyILS, formatPhoneILS, PATIENT_STATUS_LABELS } from '@/lib/hebrew';
import { KpiCard, KPI_ACCENT } from '@/components/ui/KpiCard';

// Extracted modules
import {
  STATUS_OPTIONS,
  SORT_OPTIONS,
  type SortKey,
  type RecallEntry,
  getStatusBadgeStyle,
  getAvatarColor,
  getInitials,
  formatDate,
  daysSince,
  isThisMonth,
  getCloseDatePatient,
  getCloseDateLead,
  getValuePatient,
  getValueLead,
} from './customers-helpers';
import { CustomerDrawer } from './CustomerDrawer';
import { LeadDrawer } from './LeadDrawer';
import { SourceBadge, FilterChip, Toolbar, DeleteConfirm } from './CustomersSharedUI';

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomersTab() {
  const router = useRouter();

  // Data state
  const [customers, setCustomers] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [closedLeads, setClosedLeads] = useState<Lead[]>([]);
  const [closedLeadsLoading, setClosedLeadsLoading] = useState(false);

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput), 250);
    return () => clearTimeout(id);
  }, [searchInput]);
  const [revenueMinInput, setRevenueMinInput] = useState('');
  const [lastVisitOver6, setLastVisitOver6] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [revenueMinFilter, setRevenueMinFilter] = useState('');
  const [revenueMaxFilter, setRevenueMaxFilter] = useState('');
  const [withRevenueOnly, setWithRevenueOnly] = useState(false);
  const [withoutValueOnly, setWithoutValueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('date_desc');
  const [sourceFilter, setSourceFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  // Detail / drawer state
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Patient | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailAppointments, setDetailAppointments] = useState<CompletedAppointmentRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Recall state (in-memory per session)
  const [recallMap, setRecallMap] = useState<Map<string, RecallEntry>>(new Map());

  // Messaging state
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));
  const clearSelected = () => setSelectedIds(new Set());

  // ── API calls ────────────────────────────────────────────────────────────────

  const downloadTemplate = useCallback(async () => {
    setDownloadingTemplate(true);
    try {
      const res = await fetch('/api/customers/export-template', { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'customers_import_template.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast('שגיאה בהורדת התבנית');
    } finally {
      setDownloadingTemplate(false);
    }
  }, []);

  const fetchClosedLeads = useCallback(async () => {
    setClosedLeadsLoading(true);
    const res = await fetch('/api/leads', { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as { leads?: Lead[] };
    setClosedLeads(res.ok && Array.isArray(json.leads) ? json.leads.filter((l) => l.status === 'Closed') : []);
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

  useEffect(() => { setLoading(true); fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { if (!loading && customers.length === 0) void fetchClosedLeads(); }, [loading, customers.length, fetchClosedLeads]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  useEffect(() => {
    if (!detailId) { setDetailCustomer(null); setDetailAppointments([]); return; }
    setDetailLoading(true);
    fetch(`/api/customers/${detailId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { customer?: Patient; appointments?: CompletedAppointmentRow[] }) => {
        setDetailCustomer(d.customer ?? null);
        setDetailAppointments(d.appointments ?? []);
      })
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  useEffect(() => {
    if (!filtersOpen) return;
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [filtersOpen]);

  // ── Filtered lists ───────────────────────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = customers.filter((c) => {
      if (q) {
        const qd = q.replace(/\D/g, '');
        const name = (c.full_name ?? '').toLowerCase();
        const ph = (c.phone ?? '').replace(/\D/g, '');
        if (!name.includes(q) && !(qd ? ph.includes(qd) : (c.phone ?? '').toLowerCase().includes(q))) return false;
      }
      const ts = getCloseDatePatient(c) ? new Date(getCloseDatePatient(c)!).getTime() : 0;
      if (dateFrom && ts < new Date(dateFrom).setHours(0,0,0,0)) return false;
      if (dateTo   && ts > new Date(dateTo).setHours(23,59,59,999)) return false;
      const val = getValuePatient(c);
      if (revenueMinFilter !== '' && !Number.isNaN(+revenueMinFilter) && val < +revenueMinFilter) return false;
      if (revenueMaxFilter !== '' && !Number.isNaN(+revenueMaxFilter) && val > +revenueMaxFilter) return false;
      if (withRevenueOnly && val <= 0) return false;
      if (withoutValueOnly && val > 0) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      const da = new Date(getCloseDatePatient(a) ?? 0).getTime();
      const db = new Date(getCloseDatePatient(b) ?? 0).getTime();
      const va = getValuePatient(a), vb = getValuePatient(b);
      const na = (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he');
      switch (sortBy) {
        case 'date_desc': return db - da; case 'date_asc': return da - db;
        case 'value_desc': return vb - va; case 'value_asc': return va - vb;
        case 'name_az': return na; case 'name_za': return -na;
        default: return db - da;
      }
    });
  }, [customers, debouncedSearch, dateFrom, dateTo, revenueMinFilter, revenueMaxFilter, withRevenueOnly, withoutValueOnly, sortBy]);

  const filteredClosedLeads = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = closedLeads.filter((l) => {
      if (q) {
        const qd = q.replace(/\D/g, '');
        const name = (l.full_name ?? '').toLowerCase();
        const ph = (l.phone ?? '').replace(/\D/g, '');
        if (!name.includes(q) && !(qd ? ph.includes(qd) : (l.phone ?? '').toLowerCase().includes(q))) return false;
      }
      if (sourceFilter && l.source !== sourceFilter) return false;
      const ts = getCloseDateLead(l) ? new Date(getCloseDateLead(l)!).getTime() : 0;
      if (dateFrom && ts < new Date(dateFrom).setHours(0,0,0,0)) return false;
      if (dateTo   && ts > new Date(dateTo).setHours(23,59,59,999)) return false;
      const val = getValueLead(l);
      if (revenueMinFilter !== '' && !Number.isNaN(+revenueMinFilter) && val < +revenueMinFilter) return false;
      if (revenueMaxFilter !== '' && !Number.isNaN(+revenueMaxFilter) && val > +revenueMaxFilter) return false;
      if (withRevenueOnly && val <= 0) return false;
      if (withoutValueOnly && val > 0) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      const da = new Date(getCloseDateLead(a) ?? 0).getTime();
      const db = new Date(getCloseDateLead(b) ?? 0).getTime();
      const va = getValueLead(a), vb = getValueLead(b);
      const na = (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he');
      switch (sortBy) {
        case 'date_desc': return db - da; case 'date_asc': return da - db;
        case 'value_desc': return vb - va; case 'value_asc': return va - vb;
        case 'name_az': return na; case 'name_za': return -na;
        default: return db - da;
      }
    });
  }, [closedLeads, debouncedSearch, sourceFilter, dateFrom, dateTo, revenueMinFilter, revenueMaxFilter, withRevenueOnly, withoutValueOnly, sortBy]);

  const hasActiveFilters = !!dateFrom || !!dateTo || revenueMinFilter !== '' || revenueMaxFilter !== ''
    || withRevenueOnly || withoutValueOnly || !!statusFilter || lastVisitOver6 || !!sourceFilter;

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setRevenueMinFilter(''); setRevenueMaxFilter('');
    setWithRevenueOnly(false); setWithoutValueOnly(false); setStatusFilter('');
    setLastVisitOver6(false); setSourceFilter(''); setSortBy('date_desc');
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const closeDrawer = () => { setDetailId(null); setDetailLead(null); setDetailCustomer(null); setDetailAppointments([]); };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/customers/${deleteId}`, { method: 'DELETE', credentials: 'include' });
    setDeleting(false); setDeleteId(null);
    if (res.ok) { setCustomers((p) => p.filter((c) => c.id !== deleteId)); if (detailId === deleteId) closeDrawer(); }
  };

  const handleDeleteLead = async () => {
    if (!deleteLeadId) return;
    setDeleting(true);
    const res = await fetch(`/api/leads/${deleteLeadId}`, { method: 'DELETE', credentials: 'include' });
    setDeleting(false); setDeleteLeadId(null);
    if (res.ok) { setClosedLeads((p) => p.filter((l) => l.id !== deleteLeadId)); if (detailLead?.id === deleteLeadId) closeDrawer(); }
  };

  const getRecall = (id: string): RecallEntry => recallMap.get(id) ?? { active: false, reminderDate: '' };
  const setRecall = (id: string, entry: RecallEntry) => setRecallMap((p) => new Map(p).set(id, entry));

  // ── KPI values ───────────────────────────────────────────────────────────────

  const kpiRevCustomers = filteredCustomers.reduce((s, c) => s + getValuePatient(c), 0);
  const kpiAvgCustomers = filteredCustomers.length > 0 ? kpiRevCustomers / filteredCustomers.length : 0;
  const kpiMonthCustomers = filteredCustomers.filter((c) => isThisMonth(getCloseDatePatient(c))).length;
  const kpiRevLeads = filteredClosedLeads.reduce((s, l) => s + getValueLead(l), 0);
  const kpiMonthLeads = filteredClosedLeads.filter((l) => isThisMonth(getCloseDateLead(l))).length;

  // ── Filter panel (shared) ────────────────────────────────────────────────────

  const filterPanel = (
    <div className="absolute left-0 top-full mt-2 z-30 w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-2xl p-4 space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'תאריך מ-', type: 'date', value: dateFrom, onChange: setDateFrom },
          { label: 'עד-',       type: 'date', value: dateTo,   onChange: setDateTo },
          { label: 'הכנסה מינ׳ (₪)', type: 'number', value: revenueMinFilter, onChange: setRevenueMinFilter, placeholder: '0' },
          { label: 'הכנסה מקס׳ (₪)', type: 'number', value: revenueMaxFilter, onChange: setRevenueMaxFilter, placeholder: '—' },
        ].map(({ label, type, value, onChange, placeholder }) => (
          <div key={label}>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
            <input
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              dir="rtl"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">סטטוס</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none" dir="rtl">
            <option value="">הכל</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{PATIENT_STATUS_LABELS[s] ?? s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">מיון לפי</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none" dir="rtl">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {[
          { label: 'עם הכנסה בלבד', checked: withRevenueOnly, onChange: setWithRevenueOnly },
          { label: 'ביקור אחרון 6+ חודשים', checked: lastVisitOver6, onChange: setLastVisitOver6 },
        ].map(({ label, checked, onChange }) => (
          <label key={label} className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600 text-indigo-500 focus:ring-indigo-500/30" />
            <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
          </label>
        ))}
      </div>

      {hasActiveFilters && (
        <button type="button" onClick={clearFilters} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
          נקה סינון
        </button>
      )}
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-6 py-4" dir="rtl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="h-10 w-10 rounded-full animate-pulse bg-slate-200/70 dark:bg-slate-800/60" />
              <div className="h-7 w-20 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60" />
              <div className="h-4 w-28 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex gap-4 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/50">
            {['w-28','w-20','w-24','w-16'].map((w, i) => (
              <div key={i} className={`h-3 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60 ${w}`} />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3.5 border-t border-slate-100 dark:border-slate-800">
              {['w-32','w-24','w-28','w-20'].map((w, j) => (
                <div key={j} className={`h-4 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60 ${w}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty / fallback to closed leads ─────────────────────────────────────────

  if (!loading && customers.length === 0) {
    if (closedLeadsLoading) {
      return (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500" />
        </div>
      );
    }

    if (closedLeads.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 px-8 py-20 text-center" dir="rtl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Users className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-slate-50">עדיין אין לקוחות</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">סגור ליד ראשון כדי להתחיל לבנות את רשימת הלקוחות שלך.</p>
          <button type="button" onClick={() => router.push('/dashboard')}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-6 py-3 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white transition">
            <ArrowRight className="h-4 w-4" /> חזרה ללידים
          </button>
        </div>
      );
    }

    // Closed leads fallback table
    return (
      <div className="space-y-6" dir="rtl">
        <Toolbar
          searchInput={searchInput} onSearch={setSearchInput}
          filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen(!filtersOpen)} hasActiveFilters={hasActiveFilters}
          downloadingTemplate={downloadingTemplate} onDownload={downloadTemplate}
          onImport={() => setImportModalOpen(true)} onBackToLeads={() => router.push('/dashboard')}
          filterPanelRef={filterRef} filterPanelContent={filterPanel}
        />

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {dateFrom && <FilterChip label={`מ- ${dateFrom}`} onRemove={() => setDateFrom('')} />}
            {dateTo && <FilterChip label={`עד ${dateTo}`} onRemove={() => setDateTo('')} />}
            {revenueMinFilter !== '' && <FilterChip label={`מינ׳ ₪${revenueMinFilter}`} onRemove={() => setRevenueMinFilter('')} />}
            {revenueMaxFilter !== '' && <FilterChip label={`מקס׳ ₪${revenueMaxFilter}`} onRemove={() => setRevenueMaxFilter('')} />}
            {withRevenueOnly && <FilterChip label="עם הכנסה" onRemove={() => setWithRevenueOnly(false)} />}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="סה״כ לקוחות"   value={String(filteredClosedLeads.length)}         icon={Users}       iconContainerClass={KPI_ACCENT.indigo.icon}  borderAccentClass={KPI_ACCENT.indigo.border} />
          <KpiCard label="סה״כ הכנסות"   value={formatCurrencyILS(kpiRevLeads)}              icon={DollarSign}  iconContainerClass={KPI_ACCENT.emerald.icon} borderAccentClass={KPI_ACCENT.emerald.border} />
          <KpiCard label="ממוצע ללקוח"   value={filteredClosedLeads.length ? formatCurrencyILS(kpiRevLeads / filteredClosedLeads.length) : '—'} icon={TrendingUp} iconContainerClass={KPI_ACCENT.purple.icon} borderAccentClass={KPI_ACCENT.purple.border} />
          <KpiCard label="טופלו החודש"   value={String(kpiMonthLeads)}                       icon={Calendar}    iconContainerClass={KPI_ACCENT.amber.icon}   borderAccentClass={KPI_ACCENT.amber.border} />
        </div>

        <div className="w-full overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] bg-white dark:bg-slate-900">
          <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <UserCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">לידים שטופלו</span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">{filteredClosedLeads.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMessagingOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                שלח הודעה
              </button>
              <SortAsc className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none" dir="rtl">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-right table-fixed" dir="rtl">
              <thead className="sticky top-0 z-10 bg-slate-50/70 dark:bg-slate-800/50 backdrop-blur-sm text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-3 w-[5%] text-center">
                    <input
                      type="checkbox"
                      checked={filteredClosedLeads.length > 0 && filteredClosedLeads.every((l) => selectedIds.has(l.id))}
                      onChange={(e) => e.target.checked ? selectAll(filteredClosedLeads.map((l) => l.id)) : clearSelected()}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-500 focus:ring-indigo-500/30"
                    />
                  </th>
                  <th className="py-3 pl-2 pr-3 w-[22%] text-right">לקוח</th>
                  <th className="py-3 pr-2 pl-3 w-[16%] text-right">טלפון</th>
                  <th className="py-3 px-3 w-[11%] text-right">מקור</th>
                  <th className="py-3 px-3 w-[14%] text-right">תאריך</th>
                  <th className="py-3 px-3 w-[14%] text-right">ביקור אחרון</th>
                  <th className="py-3 px-3 w-[12%] text-right">שווי</th>
                  <th className="py-3 px-2 w-[6%]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredClosedLeads.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">אין תוצאות</td></tr>
                ) : filteredClosedLeads.map((l) => {
                  const recall = getRecall(l.id);
                  const isSelected = selectedIds.has(l.id);
                  return (
                  <tr key={l.id} onClick={() => { setDetailLead(l); }}
                    className={`border-b border-slate-100 dark:border-slate-800/60 last:border-0 cursor-pointer transition-colors group ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/15' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(l.id)}
                        className="rounded border-slate-300 dark:border-slate-600 text-indigo-500 focus:ring-indigo-500/30"
                      />
                    </td>
                    <td className="py-3.5 pl-2 pr-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getAvatarColor(l.id)} text-white text-xs font-bold`}>
                          {getInitials(l.full_name)}
                          {recall.active && (
                            <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 border-2 border-white dark:border-slate-900">
                              <BellRing className="h-2 w-2 text-white" />
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-50 truncate">{l.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-2 pl-3 min-w-0">
                      <a href={l.phone ? `tel:${l.phone}` : '#'} onClick={(e) => e.stopPropagation()} dir="ltr" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate block">{formatPhoneILS(l.phone)}</a>
                    </td>
                    <td className="py-3.5 px-3"><SourceBadge source={l.source} /></td>
                    <td className="py-3.5 px-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(getCloseDateLead(l))}</td>
                    <td className="py-3.5 px-3 text-sm text-slate-500 dark:text-slate-400">—</td>
                    <td className="py-3.5 px-3 text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{getValueLead(l) > 0 ? formatCurrencyILS(getValueLead(l)) : '—'}</td>
                    <td className="py-3.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setDeleteLeadId(l.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {detailLead && (
          <LeadDrawer lead={detailLead} onClose={closeDrawer}
            onWhatsApp={() => window.open(`https://wa.me/972${(detailLead.phone ?? '').replace(/\D/g, '').replace(/^0/, '')}`, '_blank')}
            onBackToLeads={() => { closeDrawer(); router.push('/dashboard'); }}
            onDelete={() => { setDeleteLeadId(detailLead.id); closeDrawer(); }}
          />
        )}
        {deleteLeadId && (
          <DeleteConfirm title="מחיקת ליד" body="הליד יוסר מהרשימה. פעולה זו לא ניתנת לשחזור."
            onCancel={() => setDeleteLeadId(null)} onConfirm={handleDeleteLead} loading={deleting}
            confirmLabel="מחק" confirmIcon={<Trash2 className="h-4 w-4" />} />
        )}
        {messagingOpen && (
          <MessagingPanel customers={[]} selectedIds={new Set()} onClose={() => setMessagingOpen(false)} />
        )}
        {importModalOpen && <CustomersImportModal onClose={() => setImportModalOpen(false)} onSuccess={() => { setToast('ייבוא הושלם בהצלחה'); fetchCustomers(); }} />}
        {toast && <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-slate-800 dark:bg-slate-700 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 shadow-xl">{toast}</div>}
      </div>
    );
  }

  // ── Main customers view ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toolbar */}
      <Toolbar
        searchInput={searchInput} onSearch={setSearchInput}
        filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen(!filtersOpen)} hasActiveFilters={hasActiveFilters}
        downloadingTemplate={downloadingTemplate} onDownload={downloadTemplate}
        onImport={() => setImportModalOpen(true)} onBackToLeads={() => router.push('/dashboard')}
        filterPanelRef={filterRef} filterPanelContent={filterPanel}
      />

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {dateFrom && <FilterChip label={`מ- ${dateFrom}`} onRemove={() => setDateFrom('')} />}
          {dateTo && <FilterChip label={`עד ${dateTo}`} onRemove={() => setDateTo('')} />}
          {revenueMinFilter !== '' && <FilterChip label={`מינ׳ ₪${revenueMinFilter}`} onRemove={() => setRevenueMinFilter('')} />}
          {revenueMaxFilter !== '' && <FilterChip label={`מקס׳ ₪${revenueMaxFilter}`} onRemove={() => setRevenueMaxFilter('')} />}
          {withRevenueOnly && <FilterChip label="עם הכנסה" onRemove={() => setWithRevenueOnly(false)} />}
          {statusFilter && <FilterChip label={PATIENT_STATUS_LABELS[statusFilter] ?? statusFilter} onRemove={() => setStatusFilter('')} />}
          {lastVisitOver6 && <FilterChip label="ביקור 6+ חודשים" onRemove={() => setLastVisitOver6(false)} />}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="סה״כ לקוחות" value={String(filteredCustomers.length)} sub={`${customers.length} במערכת`} icon={Users}      iconContainerClass={KPI_ACCENT.indigo.icon}  borderAccentClass={KPI_ACCENT.indigo.border} />
        <KpiCard label="סה״כ הכנסות" value={formatCurrencyILS(kpiRevCustomers)}                                    icon={DollarSign} iconContainerClass={KPI_ACCENT.emerald.icon} borderAccentClass={KPI_ACCENT.emerald.border} />
        <KpiCard label="ממוצע ללקוח" value={formatCurrencyILS(kpiAvgCustomers)}                                    icon={TrendingUp} iconContainerClass={KPI_ACCENT.purple.icon} borderAccentClass={KPI_ACCENT.purple.border} />
        <KpiCard label="ביקורים החודש" value={String(kpiMonthCustomers)}                                           icon={Calendar}   iconContainerClass={KPI_ACCENT.amber.icon}   borderAccentClass={KPI_ACCENT.amber.border} />
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <UserCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">רשימת לקוחות</span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">{filteredCustomers.length}</span>
            {selectedIds.size > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                {selectedIds.size} נבחרו
                <button type="button" onClick={clearSelected} className="hover:text-indigo-900 dark:hover:text-indigo-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMessagingOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition shadow-sm ${
                selectedIds.size > 0
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              {selectedIds.size > 0 ? `שלח ל-${selectedIds.size}` : 'שלח הודעה'}
            </button>
            <SortAsc className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none" dir="rtl">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-right" style={{ minWidth: '860px' }} dir="rtl">
            <thead className="sticky top-0 z-10 bg-slate-50/70 dark:bg-slate-800/50 backdrop-blur-sm text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 pr-4 pl-3 w-10" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.has(c.id))}
                    onChange={(e) => e.target.checked ? selectAll(filteredCustomers.map((c) => c.id)) : clearSelected()}
                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-500 focus:ring-indigo-500/30"
                  />
                </th>
                <th className="py-3 px-4 min-w-[180px] text-right">לקוח</th>
                <th className="py-3 px-4 w-36 text-right">טלפון</th>
                <th className="py-3 px-4 w-32 text-right">ביקור אחרון</th>
                <th className="py-3 px-4 w-28 text-right">הכנסה</th>
                <th className="py-3 px-4 w-24 text-right">ביקורים</th>
                <th className="py-3 px-4 w-24 text-right">סטטוס</th>
                <th className="py-3 px-4 w-10" />
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">אין תוצאות</p>
                      {hasActiveFilters && <button type="button" onClick={clearFilters} className="text-xs text-indigo-500 hover:underline">נקה סינון</button>}
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.map((c) => {
                const recall = getRecall(c.id);
                const statusBadge = getStatusBadgeStyle(c.status);
                const isSelected = selectedIds.has(c.id);
                return (
                  <tr key={c.id} onClick={() => { setDetailLead(null); setDetailId(c.id); }}
                    className={`border-b border-slate-100 dark:border-slate-800/60 last:border-0 cursor-pointer transition-colors group ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/15' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
                    <td className="py-3.5 pr-4 pl-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(c.id)}
                        className="rounded border-slate-300 dark:border-slate-600 text-indigo-500 focus:ring-indigo-500/30"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getAvatarColor(c.id)} text-white text-xs font-bold`}>
                          {getInitials(c.full_name)}
                          {recall.active && (
                            <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 border-2 border-white dark:border-slate-900">
                              <BellRing className="h-2 w-2 text-white" />
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-50 truncate max-w-[160px]">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 w-36">
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} dir="ltr" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">{formatPhoneILS(c.phone)}</a>
                    </td>
                    <td className="py-3.5 px-4 w-32 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(c.last_visit_date)}</td>
                    <td className="py-3.5 px-4 w-28 text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap">{formatCurrencyILS(Number(c.total_revenue))}</td>
                    <td className="py-3.5 px-4 w-24 text-sm text-slate-500 dark:text-slate-400 tabular-nums">{c.visits_count}</td>
                    <td className="py-3.5 px-4 w-24">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.cls}`}>{statusBadge.label}</span>
                    </td>
                    <td className="py-3.5 px-4 w-10" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setDeleteId(c.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer drawer */}
      {detailId && (
        <CustomerDrawer
          customer={detailCustomer} appointments={detailAppointments} loading={detailLoading} allCustomers={customers}
          recall={getRecall(detailId)} onRecallChange={(r) => setRecall(detailId, r)}
          onClose={closeDrawer} onSchedule={() => { closeDrawer(); router.push('/dashboard/calendar'); }}
          onDelete={() => { setDeleteId(detailId); closeDrawer(); }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <DeleteConfirm title="ארכוב לקוח" body="הלקוח יועבר לארכיון (מחיקה רכה). ניתן לשחזר בהמשך."
          onCancel={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting}
          confirmLabel="ארכב" confirmIcon={<Archive className="h-4 w-4" />} />
      )}

      {/* Messaging panel */}
      {messagingOpen && (
        <MessagingPanel
          customers={customers}
          selectedIds={selectedIds}
          onClose={() => setMessagingOpen(false)}
        />
      )}

      {/* Import modal */}
      {importModalOpen && (
        <CustomersImportModal onClose={() => setImportModalOpen(false)} onSuccess={() => { setToast('ייבוא הושלם בהצלחה'); fetchCustomers(); }} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-slate-800 dark:bg-slate-700 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
