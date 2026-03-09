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
import { KpiCard, KPI_ACCENT } from '@/components/ui/KpiCard';
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
    <div className="space-y-6" dir="rtl">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 dark:text-slate-50 leading-tight tracking-tight">
            קבלות ומסמכים
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ניהול קבלות, חשבוניות ומסמכי ביטול
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700
              px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800
              transition-colors disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'מייצא...' : 'ייצוא CSV'}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700
              px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800
              transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            פרטי עסק
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            disabled={!settings}
            title={!settings ? 'נא להגדיר פרטי עסק תחילה' : undefined}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600
              px-4 py-2 text-sm font-medium text-white
              hover:bg-indigo-700 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            מסמך חדש
          </button>
        </div>
      </div>

      {/* ── Settings warning ──────────────────────────────────────────────── */}
      {!loading && !settings && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50
          dark:border-amber-800 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">פרטי עסק לחשבוניות חסרים</p>
            <p className="mt-1 text-amber-700 dark:text-amber-300 text-xs">
              נא להגדיר פרטי עסק לפני הפקת מסמך ראשון.{' '}
              <button onClick={() => setSettingsOpen(true)} className="underline hover:no-underline font-medium">
                הגדר עכשיו
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800
          dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── KPI bar ───────────────────────────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="מסמכים שהופקו"
            value={String(kpis.total_issued)}
            icon={FileText}
            iconContainerClass={KPI_ACCENT.blue.icon}
            borderAccentClass={KPI_ACCENT.blue.border}
          />
          <KpiCard
            label="סה״כ הכנסות"
            value={fmt(kpis.total_revenue)}
            sub="כולל מע״מ"
            icon={TrendingUp}
            iconContainerClass={KPI_ACCENT.emerald.icon}
            borderAccentClass={KPI_ACCENT.emerald.border}
          />
          <KpiCard
            label="מע״מ שנגבה"
            value={fmt(kpis.total_vat)}
            icon={ReceiptText}
            iconContainerClass="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
            borderAccentClass="border-s-violet-500 dark:border-s-violet-400"
          />
          <KpiCard
            label="מסמכים שבוטלו"
            value={String(kpis.total_cancelled)}
            icon={XCircle}
            iconContainerClass={KPI_ACCENT.red.icon}
            borderAccentClass={KPI_ACCENT.red.border}
          />
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, מספר מסמך, טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950
              pe-9 ps-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400
              dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300
              dark:focus:ring-slate-600"
          />
        </div>

        <select
          value={docType}
          onChange={(e) => { setDocType(e.target.value as BillingDocType | ''); setPage(0); }}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950
            px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none
            focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
        >
          {DOC_TYPE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as 'issued' | 'cancelled' | ''); setPage(0); }}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950
            px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none
            focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
        >
          <option value="">כל הסטטוסים</option>
          <option value="issued">הופק</option>
          <option value="cancelled">בוטל</option>
        </select>

        <button
          onClick={applyFilters}
          className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium
            text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          חפש
        </button>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06)] bg-white dark:bg-slate-900">
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
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    מס׳ מסמך
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    סוג
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    לקוח
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                    טלפון
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    תאריך
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    סה״כ
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    מע״מ
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    סטטוס
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => openDrawer(doc)}
                    className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50
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
