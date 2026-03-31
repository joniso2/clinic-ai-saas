'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Receipt,
  Plus,
  AlertCircle,
  Settings2,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  XCircle,
  ReceiptText,
} from 'lucide-react';
import type { BillingDocumentWithItems, BillingDocType, BillingSettings } from '@/types/billing';
import { DOC_TYPE_LABELS } from '@/types/billing';
import BillingSettingsForm from '@/components/billing/BillingSettingsForm';
import { DocumentDrawer } from '@/components/billing/DocumentDrawer';
import { CreateDocumentModal } from '@/components/billing/CreateDocumentModal';
// KPI cards inline (no KpiCard import needed)
import type { KPIs } from './receipts-helpers';
import { fmt, fmtFull, fmtDate, DOC_TYPE_FILTER_OPTIONS, PAGE_SIZE } from './receipts-helpers';

// ── Main component ────────────────────────────────────────────────────────────

export function ReceiptsPageClient() {
  const [documents, setDocuments] = useState<BillingDocumentWithItems[]>([]);
  const [settings, setSettings]   = useState<BillingSettings | null>(null);
  const [kpis, setKpis]           = useState<KPIs | null>(null);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Filters
  const [search, setSearch]       = useState('');
  const [docType, setDocType]     = useState<BillingDocType | ''>('');
  const [status, setStatus]       = useState<'issued' | 'cancelled' | ''>('');
  const [page, setPage]           = useState(0);

  // UI state
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [createOpen, setCreateOpen]       = useState(false);
  const [selectedDoc, setSelectedDoc]     = useState<BillingDocumentWithItems | null>(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [exporting, setExporting]         = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadDocuments = useCallback(async (reset = false) => {
    const targetPage = reset ? 0 : page;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page:  String(targetPage + 1), // API is 1-indexed
      });
      if (docType) params.set('doc_type', docType);
      if (status)  params.set('status', status);

      const res = await fetch(`/api/billing-documents?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בטעינה');

      const docs: BillingDocumentWithItems[] = data.documents ?? [];
      setDocuments(docs);
      setTotal(data.total ?? 0);

      // Compute KPIs from the full result set (first page approximation)
      if (reset || targetPage === 0) {
        const issued = docs.filter((d) => d.status === 'issued');
        setKpis({
          total_issued:    data.total_issued    ?? issued.length,
          total_revenue:   data.total_revenue   ?? issued.reduce((s, d) => s + Number(d.total), 0),
          total_cancelled: data.total_cancelled ?? docs.filter((d) => d.status === 'cancelled').length,
          total_vat:       data.total_vat       ?? issued.reduce((s, d) => s + Number(d.vat_amount), 0),
        });
      }
    } catch {
      setError('שגיאה בטעינת המסמכים');
    } finally {
      setLoading(false);
    }
  }, [page, docType, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/billing-settings');
    const data = await res.json();
    if (res.ok) setSettings(data.settings ?? null);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadDocuments(page === 0);
  }, [loadDocuments]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => {
    setPage(0);
    loadDocuments(true);
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      const now   = new Date();
      const year  = now.getFullYear();
      const from  = `${year}-01-01`;
      const to    = `${year}-12-31`;
      const params = new URLSearchParams({ from, to });
      if (docType) params.set('doc_type', docType);

      const res  = await fetch(`/api/billing-documents/export?${params}`);
      if (!res.ok) { alert('שגיאה בייצוא'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `billing-export-${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const handleDocumentIssued = (newDoc: BillingDocumentWithItems) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setTotal((t) => t + 1);
    setCreateOpen(false);
  };

  const handleDocumentCancelled = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => d.id === docId ? { ...d, status: 'cancelled' as const } : d)
    );
  };

  const openDrawer = (doc: BillingDocumentWithItems) => {
    setSelectedDoc(doc);
    setDrawerOpen(true);
  };

  // ── Filtered (client-side search on loaded page) ──────────────────────────

  const filtered = search.trim()
    ? documents.filter((d) =>
        d.doc_number.includes(search) ||
        d.customer_name.includes(search) ||
        d.customer_phone?.includes(search) ||
        d.customer_email?.toLowerCase().includes(search.toLowerCase())
      )
    : documents;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="-mx-4 -mt-5 md:-mx-8 md:-mt-8 bg-[#EEEEED] dark:bg-slate-950 min-h-full scrollbar-hide" dir="rtl" style={{ scrollbarWidth: 'none' }}>

      {/* ═══ Header: KPI + Toolbar ═══ */}
      <div className="bg-white dark:bg-slate-900 px-5 pt-4 pb-3" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)' }}>

        {/* Settings warning */}
        {!loading && !settings && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200 mb-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-[13px]">פרטי עסק חסרים</p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-300 text-[12px]">
                <button onClick={() => setSettingsOpen(true)} className="underline hover:no-underline font-medium">הגדר עכשיו</button>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-3 text-[13px] text-red-700 dark:text-red-300 mb-3">{error}</div>
        )}

        {/* KPI row */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
            <div className="rounded-2xl px-5 py-4 flex items-center gap-3.5 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', boxShadow: '0 4px 16px rgba(30,27,75,0.25)' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-indigo-300/80 uppercase tracking-[0.06em] leading-none">סה״כ הכנסות</p>
                <p className="text-[24px] font-black text-white tabular-nums leading-none mt-1.5 tracking-tight">{fmt(kpis.total_revenue)}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800 px-5 py-4 flex items-center gap-3.5"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] leading-none">מסמכים</p>
                <p className="text-[24px] font-bold text-slate-900 dark:text-white tabular-nums leading-none mt-1.5">{kpis.total_issued}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800 px-5 py-4 flex items-center gap-3.5"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 shrink-0">
                <ReceiptText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] leading-none">מע״מ</p>
                <p className="text-[24px] font-bold text-slate-900 dark:text-white tabular-nums leading-none mt-1.5">{fmt(kpis.total_vat)}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800 px-5 py-4 flex items-center gap-3.5"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 shrink-0">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.06em] leading-none">בוטלו</p>
                <p className="text-[24px] font-bold text-slate-900 dark:text-white tabular-nums leading-none mt-1.5">{kpis.total_cancelled}</p>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="rounded-xl bg-[#F7F7F6] dark:bg-slate-800/50"
          style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>

          {/* ── Mobile ── */}
          <div className="flex flex-col gap-2 px-3 py-2.5 sm:hidden">
            {/* Row 1: Filters + actions */}
            <div className="flex items-center gap-1.5">
              <select value={docType} onChange={(e) => { setDocType(e.target.value as BillingDocType | ''); setPage(0); }}
                className="appearance-none rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-2 text-[12px] font-semibold text-slate-600 cursor-pointer transition focus:outline-none">
                {DOC_TYPE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={status} onChange={(e) => { setStatus(e.target.value as 'issued' | 'cancelled' | ''); setPage(0); }}
                className="appearance-none rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-2 text-[12px] font-semibold text-slate-600 cursor-pointer transition focus:outline-none">
                <option value="">כל הסטטוסים</option>
                <option value="issued">הופק</option>
                <option value="cancelled">בוטל</option>
              </select>
              <button onClick={handleExport} disabled={exporting}
                className="inline-flex flex-row-reverse items-center gap-1 rounded-lg px-2.5 py-2 text-[12px] font-semibold text-slate-600 hover:bg-white transition disabled:opacity-50">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-white transition">
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Row 2: Search + create */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="חיפוש..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg bg-white dark:bg-slate-800 pe-10 ps-3 py-2 text-[13px] text-slate-900 dark:text-slate-50 placeholder:text-slate-400 border border-slate-200/80 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  dir="rtl"
                />
              </div>
              <button onClick={() => setCreateOpen(true)} disabled={!settings}
                className="inline-flex flex-row-reverse items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-white px-3.5 py-2 text-[12px] font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm shrink-0 disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" /> מסמך חדש
              </button>
            </div>
          </div>

          {/* ── Desktop ── */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2">
            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="חיפוש..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-slate-800 pe-10 ps-3 py-2 text-[13px] text-slate-900 dark:text-slate-50 placeholder:text-slate-400 border border-slate-200/80 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                dir="rtl"
              />
            </div>
            <div className="h-5 w-px bg-slate-200/60 dark:bg-slate-700 shrink-0" />
            <select value={docType} onChange={(e) => { setDocType(e.target.value as BillingDocType | ''); setPage(0); }}
              className="appearance-none rounded-lg bg-transparent px-2.5 py-2 text-[12px] font-semibold text-slate-600 hover:bg-white hover:shadow-sm cursor-pointer transition focus:outline-none">
              {DOC_TYPE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value as 'issued' | 'cancelled' | ''); setPage(0); }}
              className="appearance-none rounded-lg bg-transparent px-2.5 py-2 text-[12px] font-semibold text-slate-600 hover:bg-white hover:shadow-sm cursor-pointer transition focus:outline-none">
              <option value="">כל הסטטוסים</option>
              <option value="issued">הופק</option>
              <option value="cancelled">בוטל</option>
            </select>
            <button onClick={applyFilters}
              className="inline-flex flex-row-reverse items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-white hover:shadow-sm transition">
              <Search className="h-3.5 w-3.5" /> חפש
            </button>
            <div className="flex-1" />
            <button onClick={handleExport} disabled={exporting}
              className="inline-flex flex-row-reverse items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-white hover:shadow-sm transition disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> {exporting ? 'מייצא...' : 'CSV'}
            </button>
            <button onClick={() => setSettingsOpen(true)}
              className="inline-flex flex-row-reverse items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-white hover:shadow-sm transition">
              <Settings2 className="h-3.5 w-3.5" /> הגדרות
            </button>
            <button onClick={() => setCreateOpen(true)} disabled={!settings}
              className="inline-flex flex-row-reverse items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-white px-3.5 py-2 text-[12px] font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm disabled:opacity-40">
              <Plus className="h-3.5 w-3.5" /> מסמך חדש
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile card list ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="md:hidden p-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-200 mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500">טוען מסמכים...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="md:hidden p-12 text-center">
          <Receipt className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {search || docType || status ? 'לא נמצאו מסמכים התואמים לחיפוש' : 'אין מסמכים עדיין'}
          </p>
        </div>
      ) : (
        <div className="md:hidden space-y-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              onClick={() => openDrawer(doc)}
              className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900
                shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 cursor-pointer
                active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
            >
              {/* Top row: doc number + type badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                    {doc.doc_number}
                  </span>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
                    bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {DOC_TYPE_LABELS[doc.doc_type]}
                  </span>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                  ${doc.status === 'issued'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                  {doc.status === 'issued' ? 'הופק' : 'בוטל'}
                </span>
              </div>

              {/* Middle: customer, date, total */}
              <div className="space-y-1.5">
                <p className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                  {doc.customer_name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {fmtDate(doc.issued_at)}
                  </span>
                  <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
                    {fmtFull(doc.total)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Mobile pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                מציג {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} מתוך {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100
                    dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 px-2 tabular-nums">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100
                    dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Table (desktop) ─────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-4">
      <div className="hidden md:block w-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900"
        style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-200 mb-3" />
            <p className="text-sm text-slate-400 dark:text-slate-500">טוען מסמכים...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {search || docType || status ? 'לא נמצאו מסמכים התואמים לחיפוש' : 'אין מסמכים עדיין'}
            </p>
            {!search && !docType && !status && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                הפק מסמך ראשון מכאן או מתוך תור שהושלם
              </p>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm" dir="rtl">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#FAFAF9] dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">
                  <th className="py-3 px-4 text-right">מס׳ מסמך</th>
                  <th className="py-3 px-4 text-right">סוג</th>
                  <th className="py-3 px-4 text-right">לקוח</th>
                  <th className="py-3 px-4 text-right hidden sm:table-cell">טלפון</th>
                  <th className="py-3 px-4 text-right">תאריך</th>
                  <th className="py-3 px-4 text-right">סה״כ</th>
                  <th className="py-3 px-4 text-right hidden md:table-cell">מע״מ</th>
                  <th className="py-3 px-4 text-right">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => openDrawer(doc)}
                    className="border-b border-slate-100 dark:border-slate-800/30 hover:bg-indigo-50/30
                      dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                      {doc.doc_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                      {DOC_TYPE_LABELS[doc.doc_type]}
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                      {doc.customer_name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell tabular-nums dir-ltr">
                      {doc.customer_phone ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs tabular-nums">
                      {fmtDate(doc.issued_at)}
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-50 font-semibold tabular-nums">
                      {fmtFull(doc.total)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs tabular-nums hidden md:table-cell">
                      {fmtFull(doc.vat_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${doc.status === 'issued'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {doc.status === 'issued' ? 'הופק' : 'בוטל'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  מציג {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} מתוך {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100
                      dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 px-2 tabular-nums">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100
                      dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>{/* close px wrapper */}

      {/* ── Modals + Drawer ───────────────────────────────────────────────── */}

      {settingsOpen && (
        <BillingSettingsForm
          initial={settings}
          onClose={() => setSettingsOpen(false)}
          onSaved={(s) => { setSettings(s); setSettingsOpen(false); }}
        />
      )}

      {createOpen && settings && (
        <CreateDocumentModal
          settings={settings}
          onClose={() => setCreateOpen(false)}
          onIssued={handleDocumentIssued}
        />
      )}

      <DocumentDrawer
        doc={selectedDoc}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCancelled={handleDocumentCancelled}
      />
    </div>
  );
}
