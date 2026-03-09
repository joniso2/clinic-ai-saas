'use client';

import React from 'react';
import {
  Search, X, Filter, Download, Upload, ArrowRight, ChevronDown, Trash2, Archive,
} from 'lucide-react';
import { getSourceBadgeStyle } from './customers-helpers';

// ─── Source Badge ─────────────────────────────────────────────────────────────

export function SourceBadge({ source }: { source: string | null | undefined }) {
  const s = getSourceBadgeStyle(source);
  if (!s) return <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
      {label}
      <button type="button" onClick={onRemove} className="ml-0.5 hover:text-indigo-900 dark:hover:text-indigo-100 transition">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

export function Toolbar({
  searchInput, onSearch,
  filtersOpen, onToggleFilters, hasActiveFilters,
  downloadingTemplate, onDownload, onImport, onBackToLeads,
  filterPanelRef, filterPanelContent,
}: {
  searchInput: string; onSearch: (v: string) => void;
  filtersOpen: boolean; onToggleFilters: () => void; hasActiveFilters: boolean;
  downloadingTemplate: boolean; onDownload: () => void; onImport: () => void; onBackToLeads: () => void;
  filterPanelRef: React.RefObject<HTMLDivElement | null>;
  filterPanelContent: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" dir="rtl">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 pr-11 pl-3 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 text-right shadow-sm transition"
          dir="rtl"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative" ref={filterPanelRef}>
          <button
            type="button"
            onClick={onToggleFilters}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium shadow-sm transition ${
              hasActiveFilters
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            סינון
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold">!</span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          {filtersOpen && filterPanelContent}
        </div>

        <button
          type="button"
          onClick={onDownload}
          disabled={downloadingTemplate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition disabled:opacity-60"
        >
          {downloadingTemplate
            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            : <Download className="h-3.5 w-3.5" />}
          הורד תבנית Excel
        </button>

        <button
          type="button"
          onClick={onImport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
        >
          <Upload className="h-3.5 w-3.5" /> ייבוא לקוחות
        </button>

        <button
          type="button"
          onClick={onBackToLeads}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
        >
          חזרה ללידים <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

export function DeleteConfirm({ title, body, onCancel, onConfirm, loading, confirmLabel, confirmIcon }: {
  title: string; body: string;
  onCancel: () => void; onConfirm: () => void;
  loading: boolean; confirmLabel: string; confirmIcon: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70" onClick={onCancel} aria-hidden="true" />
      <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-xl text-right max-w-sm w-full" dir="rtl">
        <h3 className="font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{body}</p>
        <div className="mt-5 flex gap-2 justify-start">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">ביטול</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-xl bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-60 flex items-center gap-2">
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : confirmIcon}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
