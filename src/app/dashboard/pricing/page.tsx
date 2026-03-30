'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Power, PowerOff, X, Search, Package,
  Clock, DollarSign, Layers, Zap, Copy, ChevronDown, Filter,
  SortAsc, CheckCircle2, XCircle,
} from 'lucide-react';
import { formatCurrencyILS } from '@/lib/hebrew';
import { ConfirmDeleteModal } from '@/components/dashboard/ConfirmDeleteModal';
import { KpiCard, KPI_ACCENT } from '@/components/ui/KpiCard';

// Extracted modules
import type { ClinicService, Role, StatusFilter, SortKey } from './pricing-types';
import { SORT_OPTIONS, SERVICE_COLOR_PRESETS } from './pricing-types';
import { InlineEdit } from './InlineEdit';
import { ServiceDrawer } from './ServiceDrawer';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [services, setServices]         = useState<ClinicService[]>([]);
  const [role, setRole]                 = useState<Role | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [toast, setToast]               = useState<string | null>(null);
  const [toastType, setToastType]       = useState<'success' | 'error'>('success');
  const [modal, setModal]               = useState<'add' | 'edit' | null>(null);
  const [editService, setEditService]   = useState<ClinicService | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy]             = useState<SortKey>('newest');
  const [drawerService, setDrawerService] = useState<ClinicService | null>(null);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [priceMin, setPriceMin]         = useState('');
  const [priceMax, setPriceMax]         = useState('');
  const [durMin, setDurMin]             = useState('');
  const [durMax, setDurMax]             = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  const canEdit = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN';
  const hasActiveFilters = priceMin !== '' || priceMax !== '' || durMin !== '' || durMax !== '';

  // Close filter panel on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [filterOpen]);

  // KPIs — computed client-side from loaded data
  const kpiTotal       = services.length;
  const kpiActive      = services.filter((s) => s.is_active).length;
  const kpiAvgPrice    = kpiTotal ? Math.round(services.reduce((acc, s) => acc + s.price, 0) / kpiTotal) : 0;
  const kpiAvgDuration = kpiTotal ? Math.round(services.reduce((acc, s) => acc + s.duration_minutes, 0) / kpiTotal) : 0;

  const filteredServices = useMemo(() => {
    let list = services;
    if (statusFilter === 'active')   list = list.filter((s) => s.is_active);
    if (statusFilter === 'inactive') list = list.filter((s) => !s.is_active);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((s) =>
      s.service_name.toLowerCase().includes(q) ||
      (Array.isArray(s.aliases) && s.aliases.some((a) => a.toLowerCase().includes(q)))
    );
    if (priceMin !== '') list = list.filter((s) => s.price >= Number(priceMin));
    if (priceMax !== '') list = list.filter((s) => s.price <= Number(priceMax));
    if (durMin !== '')   list = list.filter((s) => s.duration_minutes >= Number(durMin));
    if (durMax !== '')   list = list.filter((s) => s.duration_minutes <= Number(durMax));
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'price_desc':    return b.price - a.price;
        case 'price_asc':     return a.price - b.price;
        case 'duration_asc':  return a.duration_minutes - b.duration_minutes;
        case 'duration_desc': return b.duration_minutes - a.duration_minutes;
        case 'name_az':       return a.service_name.localeCompare(b.service_name, 'he');
        case 'newest':        return (b.created_at ?? '').localeCompare(a.created_at ?? '');
        default:              return 0;
      }
    });
  }, [services, search, statusFilter, sortBy, priceMin, priceMax, durMin, durMax]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clinic-services', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'טעינת שירותים נכשלה'); setServices([]); return; }
      setServices(json.services ?? []);
      setRole((json.role ?? 'STAFF') as Role);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleToggleActive = async (s: ClinicService) => {
    const next = !s.is_active;
    setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: next } : x)));
    if (drawerService?.id === s.id) setDrawerService((d) => d ? { ...d, is_active: next } : d);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clinic-services/${s.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ is_active: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(next ? 'השירות הופעל' : 'השירות הושבת');
      } else {
        setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: s.is_active } : x)));
        if (drawerService?.id === s.id) setDrawerService((d) => d ? { ...d, is_active: s.is_active } : d);
        showToast(json.error ?? 'שגיאה בעדכון', 'error');
      }
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clinic-services/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setServices((prev) => prev.filter((x) => x.id !== id));
        setDeleteId(null);
        if (drawerService?.id === id) setDrawerService(null);
        showToast('השירות נמחק');
      } else {
        showToast(json.error ?? 'שגיאה במחיקה', 'error');
      }
    } finally { setSubmitting(false); }
  };

  const handleDuplicate = async (s: ClinicService) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/clinic-services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          service_name: `עותק של ${s.service_name}`,
          price: s.price,
          duration_minutes: s.duration_minutes,
          aliases: s.aliases,
          is_active: false,
          description: s.description ?? null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { setServices((prev) => [json as ClinicService, ...prev]); showToast('השירות שוכפל'); }
      else showToast(json.error ?? 'שגיאה בשכפול', 'error');
    } finally { setSubmitting(false); }
  };

  const handleInlineSave = async (s: ClinicService, field: 'price' | 'duration_minutes', value: number) => {
    const snapshot = { ...s };
    setServices((list) => list.map((x) => (x.id === s.id ? { ...x, [field]: value } : x)));
    const res = await fetch(`/api/clinic-services/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      setServices((list) => list.map((x) => (x.id === s.id ? snapshot : x)));
      showToast('שגיאה בשמירה', 'error');
    } else {
      showToast('נשמר');
    }
  };

  const handleColorChange = async (s: ClinicService, color: string) => {
    setServices((list) => list.map((x) => (x.id === s.id ? { ...x, color } : x)));
    await fetch(`/api/clinic-services/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ color }),
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header — removed, integrated into KPI header below */}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200/80 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400 text-right">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4 py-4">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex gap-4 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/50">
              {['w-32','w-20','w-24','w-16','w-20'].map((w, i) => (
                <div key={i} className={`h-3 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60 ${w}`} />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3.5 border-t border-slate-100 dark:border-slate-800">
                {['w-36','w-24','w-28','w-20','w-24'].map((w, j) => (
                  <div key={j} className={`h-4 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60 ${w}`} />
                ))}
              </div>
            ))}
          </div>
        </div>

      ) : error ? null : services.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 px-8 py-24 text-center" dir="rtl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Package className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-slate-50">טרם הוגדרו שירותים</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">הוסף שירות ראשון כדי להתחיל בניהול תמחור ובוט.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => { setEditService(null); setModal('add'); }}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> הוסף שירות ראשון
            </button>
          )}
        </div>

      ) : (
        <div className="-mx-4 -mt-5 md:-mx-8 md:-mt-8 bg-[#EEEEED] dark:bg-slate-950 min-h-full scrollbar-hide" dir="rtl" style={{ scrollbarWidth: 'none' }}>

          {/* ═══ Header: KPI + Toolbar on white surface ═══ */}
          <div className="bg-white dark:bg-slate-900 px-5 pt-4 pb-3" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)' }}>
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-2.5 mb-3.5">
              <div className="rounded-2xl px-5 py-4 flex items-center gap-3.5 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', boxShadow: '0 4px 16px rgba(30,27,75,0.25)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm shrink-0">
                  <Layers className="h-5 w-5 text-indigo-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-indigo-300/80 uppercase tracking-[0.06em] leading-none">שירותים</p>
                  <p className="text-[24px] font-black text-white tabular-nums leading-none mt-1.5">{kpiActive}<span className="text-[13px] font-normal text-indigo-300/60 ms-1">/ {kpiTotal}</span></p>
                </div>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-800 px-5 py-4 flex items-center gap-3.5"
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] leading-none">מחיר ממוצע</p>
                  <p className="text-[24px] font-bold text-slate-900 dark:text-white tabular-nums leading-none mt-1.5">{formatCurrencyILS(kpiAvgPrice)}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-800 px-5 py-4 flex items-center gap-3.5"
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 shrink-0">
                  <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] leading-none">משך ממוצע</p>
                  <p className="text-[24px] font-bold text-slate-900 dark:text-white tabular-nums leading-none mt-1.5">{kpiAvgDuration} <span className="text-[13px] font-normal text-slate-400">דק׳</span></p>
                </div>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-800 px-5 py-4 flex items-center gap-3.5"
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 shrink-0">
                  <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] leading-none">פעילים</p>
                  <p className="text-[24px] font-bold text-slate-900 dark:text-white tabular-nums leading-none mt-1.5">{kpiActive}</p>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 rounded-xl bg-[#F7F7F6] dark:bg-slate-800/50 px-3 py-2"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש לפי שם או כינוי..."
                  className="w-full rounded-lg bg-white dark:bg-slate-800 pe-10 ps-3 py-2 text-[13px] text-slate-900 dark:text-slate-50 placeholder:text-slate-400 border border-slate-200/80 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  dir="rtl"
                />
              </div>
              <div className="h-5 w-px bg-slate-200/60 dark:bg-slate-700 shrink-0" />
              {/* Status pills */}
              <div className="flex rounded-lg bg-white dark:bg-slate-800 p-0.5 gap-0.5 border border-slate-200/60 dark:border-slate-700">
                {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
                  <button key={f} type="button" onClick={() => setStatusFilter(f)}
                    className={`rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition ${
                      statusFilter === f ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}>
                    {f === 'all' ? 'הכל' : f === 'active' ? 'פעיל' : 'מושבת'}
                  </button>
                ))}
              </div>
              <div className="relative" ref={filterRef}>
                <button type="button" onClick={() => setFilterOpen((o) => !o)}
                  className={`inline-flex flex-row-reverse items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition ${
                    hasActiveFilters ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-white hover:shadow-sm'
                  }`}>
                  <Filter className="h-3.5 w-3.5" /> סינון
                  {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                </button>
                {filterOpen && (
                  <div className="absolute start-0 top-full mt-2 z-30 w-72 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-xl p-4 space-y-4" dir="rtl">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">סינון מתקדם</p>
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">טווח מחיר (₪)</p>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="מינ׳" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        <span className="text-slate-400 text-xs shrink-0">–</span>
                        <input type="number" placeholder="מקס׳" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">טווח משך (דק׳)</p>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="מינ׳" value={durMin} onChange={(e) => setDurMin(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        <span className="text-slate-400 text-xs shrink-0">–</span>
                        <input type="number" placeholder="מקס׳" value={durMax} onChange={(e) => setDurMax(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                    </div>
                    {hasActiveFilters && (
                      <button type="button" onClick={() => { setPriceMin(''); setPriceMax(''); setDurMin(''); setDurMax(''); }}
                        className="text-xs text-indigo-500 hover:text-indigo-700 transition">נקה סינון</button>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} dir="rtl"
                  className="appearance-none rounded-lg bg-transparent px-2.5 py-2 text-[12px] font-semibold text-slate-600 hover:bg-white hover:shadow-sm cursor-pointer transition focus:outline-none">
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex-1" />
              {canEdit && (
                <button type="button" onClick={() => { setEditService(null); setModal('add'); }}
                  className="inline-flex flex-row-reverse items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-white px-3.5 py-2 text-[12px] font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm">
                  <Plus className="h-3.5 w-3.5" /> שירות חדש
                </button>
              )}
            </div>
          </div>

          {/* ═══ Table ═══ */}
          <div className="px-5 pt-4 pb-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">שירותים</span>
                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[12px] font-semibold text-slate-500 tabular-nums">{filteredServices.length}</span>
              </div>
              {filteredServices.length !== services.length && (
                <span className="text-xs text-slate-400">מתוך {services.length}</span>
              )}
            </div>

            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              <table className="w-full text-right" dir="rtl">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#FAFAF9] dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">
                    <th className="py-3 px-5">שם שירות</th>
                    <th className="py-3 px-4 w-36">מחיר</th>
                    <th className="py-3 px-4 w-36">משך</th>
                    <th className="py-3 px-4 w-28">סטטוס</th>
                    <th className="py-3 px-4 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                            <Package className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-medium">אין תוצאות</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredServices.map((s) => {
                    const isPopular = (s.aliases?.length ?? 0) >= 3;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setDrawerService(s)}
                        className="border-b border-slate-100 dark:border-slate-800/30 last:border-0 hover:bg-indigo-50/30 dark:hover:bg-slate-800/30 cursor-pointer transition-all duration-100 group"
                      >
                        {/* Name */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <ServiceColorDot service={s} onColorChange={canEdit ? handleColorChange : undefined} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 dark:text-slate-50">{s.service_name}</span>
                                {isPopular && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/40 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-400">
                                    🔥 פופולרי
                                  </span>
                                )}
                              </div>
                              {Array.isArray(s.aliases) && s.aliases.length > 0 && (
                                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 truncate max-w-[280px]">
                                  {s.aliases.join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Price — inline edit */}
                        <td className="py-3.5 px-4 w-36" onClick={(e) => e.stopPropagation()}>
                          {canEdit ? (
                            <InlineEdit
                              value={s.price}
                              display={formatCurrencyILS(s.price)}
                              onSave={(v) => handleInlineSave(s, 'price', v)}
                            />
                          ) : (
                            <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300 px-2">{formatCurrencyILS(s.price)}</span>
                          )}
                        </td>

                        {/* Duration — inline edit */}
                        <td className="py-3.5 px-4 w-36" onClick={(e) => e.stopPropagation()}>
                          {canEdit ? (
                            <InlineEdit
                              value={s.duration_minutes}
                              display={`⏱ ${s.duration_minutes} דק׳`}
                              onSave={(v) => handleInlineSave(s, 'duration_minutes', Math.max(1, Math.min(480, Math.round(v))))}
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                              ⏱ {s.duration_minutes} דק׳
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 w-28">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            s.is_active
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {s.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {s.is_active ? 'פעיל' : 'מושבת'}
                          </span>
                        </td>

                        {/* Row actions */}
                        <td className="py-3.5 px-4 w-28" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition">
                            {canEdit && (
                              <>
                                <button type="button"
                                  onClick={() => { setEditService(s); setModal('edit'); }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="ערוך">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button type="button"
                                  onClick={() => handleDuplicate(s)}
                                  disabled={submitting}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                                  title="שכפל">
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button type="button"
                                  onClick={() => handleToggleActive(s)}
                                  disabled={submitting}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                                  title={s.is_active ? 'השבת' : 'הפעל'}>
                                  {s.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                                </button>
                                <button type="button"
                                  onClick={() => setDeleteId(s.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                                  title="מחק">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </div>{/* close px wrapper */}
        </div>
      )}

      {/* Service drawer */}
      {drawerService && (
        <ServiceDrawer
          service={drawerService}
          canEdit={canEdit}
          onClose={() => setDrawerService(null)}
          onEdit={() => { setEditService(drawerService); setModal('edit'); setDrawerService(null); }}
          onToggle={() => handleToggleActive(drawerService)}
          onDelete={() => { setDeleteId(drawerService.id); setDrawerService(null); }}
        />
      )}

      {/* Add / Edit modal */}
      {(modal === 'add' || modal === 'edit') && (
        <ServiceFormModal
          service={editService ?? undefined}
          onClose={() => { setModal(null); setEditService(null); }}
          onSaved={(updated) => {
            if (editService) {
              setServices((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
              showToast('השירות עודכן');
            } else {
              setServices((prev) => [updated as ClinicService, ...prev]);
              showToast('השירות נוסף');
            }
            setModal(null);
            setEditService(null);
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDeleteModal
        open={!!deleteId}
        title="מחק שירות"
        message="האם למחוק את השירות? לא ניתן לשחזר."
        confirmLabel="מחק"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={submitting}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${
            toastType === 'error'
              ? 'bg-red-600 text-white dark:bg-red-700'
              : 'bg-indigo-600 text-white dark:bg-indigo-700'
          }`}
          role="status"
        >
          {toast}
        </div>
      )}
    </>
  );
}

// ─── ServiceFormModal (unchanged) ─────────────────────────────────────────────

function ServiceFormModal({
  service,
  onClose,
  onSaved,
  onError,
}: {
  service?: ClinicService;
  onClose: () => void;
  onSaved: (s: Partial<ClinicService> & { id: string }) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName]                   = useState(service?.service_name ?? '');
  const [price, setPrice]                 = useState(service?.price ?? 0);
  const [durationMinutes, setDurationMinutes] = useState(service?.duration_minutes ?? 30);
  const [aliasesStr, setAliasesStr]       = useState(Array.isArray(service?.aliases) ? service.aliases.join(', ') : '');
  const [category, setCategory]           = useState(service?.category ?? '');
  const [description, setDescription]     = useState(service?.description ?? '');
  const [active, setActive]               = useState(service?.is_active ?? true);
  const [submitting, setSubmitting]       = useState(false);
  const [fieldErrors, setFieldErrors]     = useState<{ name?: string; price?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const trimmed = name.trim();
    if (!trimmed) { setFieldErrors((p) => ({ ...p, name: 'שם שירות חובה' })); return; }
    const numPrice = Number(price);
    if (Number.isNaN(numPrice) || numPrice < 0) { setFieldErrors((p) => ({ ...p, price: 'יש להזין מחיר תקין (מספר אי־שלילי)' })); return; }
    const duration = Math.max(1, Math.min(480, Math.round(Number(durationMinutes)) || 30));
    const aliases = aliasesStr.split(',').map((s) => s.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      const payload = {
        service_name: trimmed, price: numPrice, duration_minutes: duration,
        aliases, is_active: active, description: description.trim() || null,
        category: category.trim() || null,
      };
      if (service) {
        const res = await fetch(`/api/clinic-services/${service.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) onSaved({ ...service, ...payload });
        else onError(json.error ?? 'שגיאה בעדכון');
      } else {
        const res = await fetch('/api/clinic-services', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) onSaved(json as ClinicService);
        else onError(json.error ?? 'שגיאה בהוספה');
      }
    } finally { setSubmitting(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="service-modal-title"
    >
      <div className="modal-enter w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex-row-reverse">
          <h2 id="service-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50 text-right">
            {service ? 'ערוך שירות' : 'הוסף שירות'}
          </h2>
          <button type="button" onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/30 ms-auto"
            aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">
              שם שירות <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
              className={`w-full h-11 rounded-lg border bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-50 text-right placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-colors ${fieldErrors.name ? 'border-red-400 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'}`}
              placeholder="לדוגמה: פגישת ייעוץ, טיפול בסיסי" />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400 text-right">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">
              מחיר (₪) <span className="text-red-500">*</span>
            </label>
            <input type="number" min={0} step={1} value={price || ''}
              onChange={(e) => { setPrice(e.target.value === '' ? 0 : Number(e.target.value)); setFieldErrors((p) => ({ ...p, price: undefined })); }}
              className={`w-full h-11 rounded-lg border bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-50 text-right tabular-nums placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-colors ${fieldErrors.price ? 'border-red-400 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'}`}
              placeholder="0" />
            {fieldErrors.price && <p className="mt-1 text-xs text-red-600 dark:text-red-400 text-right">{fieldErrors.price}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">
              משך הטיפול (דקות) <span className="text-red-500">*</span>
            </label>
            <input type="number" min={1} max={480} step={1} value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value === '' ? 30 : Number(e.target.value))}
              className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-50 text-right tabular-nums placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-colors"
              placeholder="30" />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-right">1–480 דקות</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">
              כינויים לחיפוש (מופרדים בפסיק)
            </label>
            <input type="text" value={aliasesStr} onChange={(e) => setAliasesStr(e.target.value)}
              className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-50 text-right placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-colors"
              placeholder="מילות חיפוש או כינויים, מופרדים בפסיק" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">
              קטגוריה (אופציונלי)
            </label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-50 text-right placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-colors"
              placeholder="לדוגמה: קטגוריה א׳, קטגוריה ב׳" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">
              תיאור (אופציונלי)
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-50 text-right placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-colors resize-none"
              placeholder="תיאור קצר לשירות" />
          </div>
          <div className="flex items-center gap-2 flex-row-reverse justify-end pt-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">פעיל</label>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-slate-400" />
          </div>
          <div className="flex gap-3 pt-2 flex-row-reverse justify-start">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/30">
              ביטול
            </button>
            <button type="submit" disabled={submitting}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors">
              {submitting ? 'שומר…' : service ? 'שמור שינויים' : 'הוסף שירות'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Service color dot with picker ────────────────────────────────────────────

function ServiceColorDot({ service, onColorChange }: { service: ClinicService; onColorChange?: (s: ClinicService, color: string) => void }) {
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const color = service.color || SERVICE_COLOR_PRESETS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Generate rainbow hue spectrum (36 colors across the hue wheel)
  const rainbow = Array.from({ length: 36 }, (_, i) => {
    const hue = i * 10;
    return `hsl(${hue}, 75%, 55%)`;
  });
  // Lighter row
  const rainbowLight = Array.from({ length: 36 }, (_, i) => {
    const hue = i * 10;
    return `hsl(${hue}, 70%, 72%)`;
  });
  // Darker row
  const rainbowDark = Array.from({ length: 36 }, (_, i) => {
    const hue = i * 10;
    return `hsl(${hue}, 80%, 40%)`;
  });

  const selectColor = (c: string) => {
    onColorChange?.(service, c);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (onColorChange) setOpen(!open); }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-transform hover:scale-110"
        style={{ backgroundColor: color + '20', borderColor: color }}
        title="בחר צבע"
      >
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      </button>
      {open && (
        <div
          className="fixed z-[100] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-4 w-[320px]"
          style={{ top: ref.current ? ref.current.getBoundingClientRect().bottom + 4 : 0, left: ref.current ? Math.max(8, ref.current.getBoundingClientRect().left - 140) : 0 }}
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Preset colors */}
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">צבעים מוכנים</p>
          <div className="grid grid-cols-10 gap-1.5 mb-3">
            {SERVICE_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => selectColor(c)}
                className={`h-6 w-6 rounded-full transition-transform hover:scale-125 ${c === color ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white scale-110' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Rainbow spectrum */}
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">קשת צבעים</p>
          <div className="space-y-1 mb-3">
            {/* Light row */}
            <div className="flex gap-px rounded-md overflow-hidden">
              {rainbowLight.map((c, i) => (
                <button key={'l' + i} type="button" onClick={() => selectColor(c)}
                  className="flex-1 h-5 hover:scale-y-150 transition-transform origin-bottom" style={{ backgroundColor: c }} />
              ))}
            </div>
            {/* Main row */}
            <div className="flex gap-px rounded-md overflow-hidden">
              {rainbow.map((c, i) => (
                <button key={'m' + i} type="button" onClick={() => selectColor(c)}
                  className="flex-1 h-6 hover:scale-y-150 transition-transform origin-center" style={{ backgroundColor: c }} />
              ))}
            </div>
            {/* Dark row */}
            <div className="flex gap-px rounded-md overflow-hidden">
              {rainbowDark.map((c, i) => (
                <button key={'d' + i} type="button" onClick={() => selectColor(c)}
                  className="flex-1 h-5 hover:scale-y-150 transition-transform origin-top" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Custom hex input */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg shrink-0 border border-slate-200 dark:border-slate-700" style={{ backgroundColor: customColor || color }} />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#hex"
              dir="ltr"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => { if (/^#[0-9a-fA-F]{3,6}$/.test(customColor) || /^hsl/.test(customColor)) selectColor(customColor); }}
              disabled={!customColor}
              className="rounded-lg bg-slate-900 dark:bg-white px-3 py-1.5 text-[11px] font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition disabled:opacity-30"
            >
              בחר
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
