'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Power, PowerOff, X, Search, Package,
  Clock, DollarSign, Layers, Zap, Copy, ChevronDown, Filter,
  SortAsc, CheckCircle2, XCircle,
} from 'lucide-react';
import { formatCurrencyILS } from '@/lib/hebrew';
import { ConfirmDeleteModal } from '@/components/dashboard/ConfirmDeleteModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClinicService = {
  id: string;
  clinic_id: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  aliases: string[];
  is_active: boolean;
  description?: string | null;
  category?: string | null;
  created_at?: string;
  updated_at?: string;
  bookings_count?: number;
  total_revenue?: number;
};

type Role = 'CLINIC_ADMIN' | 'STAFF' | 'SUPER_ADMIN';
type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'newest' | 'price_desc' | 'price_asc' | 'duration_asc' | 'duration_desc' | 'name_az';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',        label: 'החדש ביותר' },
  { value: 'price_desc',    label: 'מחיר — גבוה לנמוך' },
  { value: 'price_asc',     label: 'מחיר — נמוך לגבוה' },
  { value: 'duration_asc',  label: 'משך — קצר לארוך' },
  { value: 'duration_desc', label: 'משך — ארוך לקצר' },
  { value: 'name_az',       label: 'שם א–ת' },
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: 'indigo' | 'emerald' | 'violet' | 'amber';
}) {
  const s = {
    indigo:  { border: 'border-indigo-100 dark:border-indigo-900/40',  bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',  icon: 'text-indigo-600 dark:text-indigo-400' },
    emerald: { border: 'border-emerald-100 dark:border-emerald-900/40', bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', icon: 'text-emerald-600 dark:text-emerald-400' },
    violet:  { border: 'border-violet-100 dark:border-violet-900/40',  bg: 'bg-violet-500/10 dark:bg-violet-500/15',  icon: 'text-violet-600 dark:text-violet-400' },
    amber:   { border: 'border-amber-100 dark:border-amber-900/40',    bg: 'bg-amber-500/10 dark:bg-amber-500/15',    icon: 'text-amber-600 dark:text-amber-400' },
  }[accent];

  return (
    <div className={`rounded-2xl border ${s.border} bg-white dark:bg-zinc-900/80 p-5 shadow-sm`} dir="rtl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
          <Icon className={`h-5 w-5 ${s.icon}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Inline editable cell ─────────────────────────────────────────────────────

function InlineEdit({
  value, display, onSave,
}: {
  value: number;
  display: string;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isNaN(n) && n >= 0 && n !== value) onSave(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-24 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="group/ie inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
      title="לחץ לעריכה מהירה"
    >
      <span className="tabular-nums text-slate-700 dark:text-zinc-300">{display}</span>
      <Pencil className="h-3 w-3 text-slate-300 dark:text-zinc-600 opacity-0 group-hover/ie:opacity-100 transition" />
    </button>
  );
}

// ─── Service Drawer ───────────────────────────────────────────────────────────

function ServiceDrawer({
  service, canEdit, onClose, onEdit, onToggle, onDelete,
}: {
  service: ClinicService;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const isPopular = (service.aliases?.length ?? 0) >= 3;

  return (
    <div className="fixed inset-0 z-40 flex" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-zinc-950/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative mr-auto w-full max-w-sm bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700 shadow-2xl flex flex-col"
        style={{ animation: 'slideInDrawer 200ms ease-out forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isPopular && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/40 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-400">
                🔥 פופולרי
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              service.is_active
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
            }`}>
              {service.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {service.is_active ? 'פעיל' : 'מושבת'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name + icon */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20">
              <Package className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 leading-tight">{service.service_name}</h2>
              {service.description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{service.description}</p>
              )}
            </div>
          </div>

          {/* Category */}
          {service.category && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1.5">קטגוריה</p>
              <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300">
                {service.category}
              </span>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">מחיר</p>
              <p className="text-xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{formatCurrencyILS(service.price)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">משך טיפול</p>
              <p className="text-xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{service.duration_minutes} דק׳</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">תורים</p>
              <p className="text-xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{service.bookings_count ?? 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">הכנסות</p>
              <p className="text-xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{formatCurrencyILS(service.total_revenue ?? 0)}</p>
            </div>
          </div>

          {/* Aliases */}
          {Array.isArray(service.aliases) && service.aliases.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2">כינויים לבוט</p>
              <div className="flex flex-wrap gap-1.5">
                {service.aliases.map((a) => (
                  <span key={a} className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          {service.created_at && (
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              נוסף: {new Date(service.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="border-t border-slate-100 dark:border-zinc-800 p-4 space-y-2 shrink-0">
            <button type="button" onClick={onEdit}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition">
              <Pencil className="h-4 w-4" /> ערוך שירות
            </button>
            <button type="button" onClick={onToggle}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition">
              {service.is_active
                ? <><PowerOff className="h-4 w-4" /> השבת שירות</>
                : <><Power className="h-4 w-4" /> הפעל שירות</>}
            </button>
            <button type="button" onClick={onDelete}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800/40 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
              <Trash2 className="h-4 w-4" /> מחק שירות
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInDrawer {
          from { transform: translateX(-20px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
}

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="mb-8 flex items-end justify-between" dir="rtl">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">ניהול</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 sm:text-3xl">שירותים ותמחור</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">הגדרת שירותים, מחירים וכינויים לבוט.</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => { setEditService(null); setModal('add'); }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            הוסף שירות
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200/80 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400 text-right">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-indigo-500" />
        </div>

      ) : error ? null : services.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 px-8 py-24 text-center" dir="rtl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
            <Package className="h-8 w-8 text-slate-400 dark:text-zinc-500" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-zinc-100">טרם הוגדרו שירותים</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-zinc-400">הוסף שירות ראשון כדי להתחיל בניהול תמחור ובוט.</p>
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
        <div className="space-y-6" dir="rtl">

          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="סה״כ שירותים"   value={String(kpiTotal)}               icon={Layers}      accent="indigo" />
            <KpiCard label="שירותים פעילים" value={String(kpiActive)}              sub={`${kpiTotal - kpiActive} מושבתים`} icon={Zap} accent="emerald" />
            <KpiCard label="מחיר ממוצע"     value={formatCurrencyILS(kpiAvgPrice)} icon={DollarSign}  accent="violet" />
            <KpiCard label="משך ממוצע"      value={`${kpiAvgDuration} דק׳`}       icon={Clock}       accent="amber" />
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם או כינוי..."
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pe-10 ps-4 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-600 transition"
              />
            </div>

            {/* Status pills */}
            <div className="flex rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5 gap-0.5">
              {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    statusFilter === f
                      ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'
                  }`}
                >
                  {f === 'all' ? 'הכל' : f === 'active' ? 'פעיל' : 'מושבת'}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative">
              <SortAsc className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                dir="rtl"
                className="appearance-none rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pr-9 pl-8 text-sm text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Filter */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  hasActiveFilters
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                סינון
                {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
              </button>

              {filterOpen && (
                <div className="absolute left-0 top-full mt-2 z-30 w-72 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-4 space-y-4" dir="rtl">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">סינון מתקדם</p>

                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mb-2">טווח מחיר (₪)</p>
                    <div className="flex items-center gap-2">
                      <input type="number" placeholder="מינ׳" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      <span className="text-slate-400 text-xs shrink-0">–</span>
                      <input type="number" placeholder="מקס׳" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mb-2">טווח משך (דק׳)</p>
                    <div className="flex items-center gap-2">
                      <input type="number" placeholder="מינ׳" value={durMin} onChange={(e) => setDurMin(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      <span className="text-slate-400 text-xs shrink-0">–</span>
                      <input type="number" placeholder="מקס׳" value={durMax} onChange={(e) => setDurMax(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button type="button"
                      onClick={() => { setPriceMin(''); setPriceMax(''); setDurMin(''); setDurMax(''); }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition">
                      נקה סינון
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/80 shadow-sm overflow-hidden">
            {/* Table header bar */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-800/40">
              <div className="flex items-center gap-2.5">
                <Package className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">רשימת שירותים</span>
                <span className="rounded-full bg-slate-100 dark:bg-zinc-700/80 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-zinc-400 tabular-nums">{filteredServices.length}</span>
              </div>
              {filteredServices.length !== services.length && (
                <span className="text-xs text-slate-400 dark:text-zinc-500">מתוך {services.length}</span>
              )}
            </div>

            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-right" dir="rtl">
                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-zinc-800/95 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  <tr className="border-b border-slate-100 dark:border-zinc-800">
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
                        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-zinc-500">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800">
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
                        className="border-b border-slate-50 dark:border-zinc-800/60 last:border-0 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 cursor-pointer transition-colors group"
                      >
                        {/* Name */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              s.is_active
                                ? 'bg-indigo-500/10 dark:bg-indigo-500/20'
                                : 'bg-slate-100 dark:bg-zinc-800'
                            }`}>
                              <Package className={`h-4 w-4 ${s.is_active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 dark:text-zinc-100">{s.service_name}</span>
                                {isPopular && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/40 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-400">
                                    🔥 פופולרי
                                  </span>
                                )}
                              </div>
                              {Array.isArray(s.aliases) && s.aliases.length > 0 && (
                                <p className="mt-0.5 text-xs text-slate-400 dark:text-zinc-500 truncate max-w-[280px]">
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
                            <span className="text-sm tabular-nums text-slate-700 dark:text-zinc-300 px-2">{formatCurrencyILS(s.price)}</span>
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-zinc-300">
                              ⏱ {s.duration_minutes} דק׳
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 w-28">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            s.is_active
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                          }`}>
                            {s.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {s.is_active ? 'פעיל' : 'מושבת'}
                          </span>
                        </td>

                        {/* Row actions */}
                        <td className="py-3.5 px-4 w-28" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition">
                            {canEdit && (
                              <>
                                <button type="button"
                                  onClick={() => { setEditService(s); setModal('edit'); }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                                  title="ערוך">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button type="button"
                                  onClick={() => handleDuplicate(s)}
                                  disabled={submitting}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                                  title="שכפל">
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button type="button"
                                  onClick={() => handleToggleActive(s)}
                                  disabled={submitting}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
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
              : 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog" aria-modal="true" aria-labelledby="service-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-5 py-4 flex-row-reverse">
          <h2 id="service-modal-title" className="text-lg font-semibold text-slate-900 dark:text-zinc-100 text-right">
            {service ? 'ערוך שירות' : 'הוסף שירות'}
          </h2>
          <button type="button" onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-slate-400/30 ms-auto"
            aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              שם שירות <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
              className={`w-full rounded-xl border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors ${fieldErrors.name ? 'border-red-400 dark:border-red-600' : 'border-slate-200 dark:border-zinc-700'}`}
              placeholder="לדוגמה: טיפול שורש" />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400 text-right">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              מחיר (₪) <span className="text-red-500">*</span>
            </label>
            <input type="number" min={0} step={1} value={price || ''}
              onChange={(e) => { setPrice(e.target.value === '' ? 0 : Number(e.target.value)); setFieldErrors((p) => ({ ...p, price: undefined })); }}
              className={`w-full rounded-xl border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right tabular-nums placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors ${fieldErrors.price ? 'border-red-400 dark:border-red-600' : 'border-slate-200 dark:border-zinc-700'}`}
              placeholder="0" />
            {fieldErrors.price && <p className="mt-1 text-xs text-red-600 dark:text-red-400 text-right">{fieldErrors.price}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              משך הטיפול (דקות) <span className="text-red-500">*</span>
            </label>
            <input type="number" min={1} max={480} step={1} value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value === '' ? 30 : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right tabular-nums placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors"
              placeholder="30" />
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 text-right">1–480 דקות</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              כינויים לחיפוש (מופרדים בפסיק)
            </label>
            <input type="text" value={aliasesStr} onChange={(e) => setAliasesStr(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors"
              placeholder="טיפול שורש, שורש, רוט" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              קטגוריה (אופציונלי)
            </label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors"
              placeholder="לדוגמה: שיניים, עיניים, כירורגיה" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              תיאור (אופציונלי)
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors resize-none"
              placeholder="תיאור קצר לשירות" />
          </div>
          <div className="flex items-center gap-2 flex-row-reverse justify-end pt-1">
            <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">פעיל</label>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)}
              className="rounded border-slate-300 dark:border-zinc-600 text-slate-900 focus:ring-slate-400" />
          </div>
          <div className="flex gap-3 pt-2 flex-row-reverse justify-start">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-slate-400/30">
              ביטול
            </button>
            <button type="submit" disabled={submitting}
              className="rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
              {submitting ? 'שומר…' : service ? 'שמור שינויים' : 'הוסף שירות'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
