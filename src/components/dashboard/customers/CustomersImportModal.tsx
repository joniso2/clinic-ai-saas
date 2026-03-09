'use client';

import { useState, useCallback } from 'react';
import { X, Upload, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ParsedImportRow = {
  name: string;
  phone: string;
  email: string;
  last_visit: string;
  revenue: number;
};

function normalizeHeader(h: string): string {
  return (h ?? '').toString().trim();
}

type ParseResult = { rows: ParsedImportRow[]; missingColumns: boolean };

function parseFile(file: File): Promise<ParseResult> {
  const ext = (file.name || '').toLowerCase();
  if (ext.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete(result) {
          const rows = (result.data ?? []) as Record<string, unknown>[];
          const headers = result.meta.fields ?? [];
          const normalized = headers.map(normalizeHeader);
          const nameIdx = normalized.findIndex((h) => h === 'Name');
          const phoneIdx = normalized.findIndex((h) => h === 'Phone');
          if (nameIdx === -1 || phoneIdx === -1) {
            resolve({ rows: [], missingColumns: true });
            return;
          }
          const out: ParsedImportRow[] = rows
            .filter((r) => {
              const name = (r[headers[nameIdx]] ?? r.Name ?? '').toString().trim();
              const phone = (r[headers[phoneIdx]] ?? r.Phone ?? '').toString().trim();
              return name || phone;
            })
            .map((r) => {
              const get = (key: string, alt: string) => (r[key] ?? (r as Record<string, unknown>)[alt] ?? '').toString().trim();
              const rev = r.Revenue ?? r.revenue;
              const revNum = typeof rev === 'number' ? rev : Number(rev);
              return {
                name: get('Name', 'name'),
                phone: get('Phone', 'phone'),
                email: get('Email', 'email'),
                last_visit: get('LastVisit', 'last_visit'),
                revenue: Number.isFinite(revNum) && revNum >= 0 ? revNum : 0,
              };
            });
          resolve({ rows: out, missingColumns: false });
        },
        error(err) {
          reject(err);
        },
      });
    });
  }
  if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data || typeof data !== 'object') {
            resolve({ rows: [], missingColumns: false });
            return;
          }
          const wb = XLSX.read(data, { type: 'array' });
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          if (!firstSheet) {
            resolve({ rows: [], missingColumns: false });
            return;
          }
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
          const headers = rows.length ? Object.keys(rows[0] ?? {}) : [];
          const normalized = headers.map(normalizeHeader);
          const nameIdx = normalized.findIndex((h) => h === 'Name');
          const phoneIdx = normalized.findIndex((h) => h === 'Phone');
          if (nameIdx === -1 || phoneIdx === -1) {
            resolve({ rows: [], missingColumns: true });
            return;
          }
          const out: ParsedImportRow[] = rows
            .filter((r) => {
              const name = (r[headers[nameIdx]] ?? r.Name ?? '').toString().trim();
              const phone = (r[headers[phoneIdx]] ?? r.Phone ?? '').toString().trim();
              return name || phone;
            })
            .map((r) => {
              const get = (key: string, alt: string) => (r[key] ?? (r as Record<string, unknown>)[alt] ?? '').toString().trim();
              const rev = r.Revenue ?? r.revenue;
              const revNum = typeof rev === 'number' ? rev : Number(rev);
              return {
                name: get('Name', 'name'),
                phone: get('Phone', 'phone'),
                email: get('Email', 'email'),
                last_visit: get('LastVisit', 'last_visit'),
                revenue: Number.isFinite(revNum) && revNum >= 0 ? revNum : 0,
              };
            });
          resolve({ rows: out, missingColumns: false });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }
  return Promise.resolve({ rows: [], missingColumns: true });
}

export function CustomersImportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedImportRow[] | null>(null);
  const [columnError, setColumnError] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File | null) => {
    setFile(f);
    setParsed(null);
    setColumnError(false);
    if (!f) return;
    const ext = (f.name || '').toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      setColumnError(true);
      return;
    }
    parseFile(f).then(({ rows, missingColumns }) => {
      setColumnError(missingColumns);
      setParsed(rows);
    }).catch(() => {
      setColumnError(true);
      setParsed([]);
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const doImport = async () => {
    if (!parsed || parsed.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsed.map((r) => ({
            name: r.name,
            phone: r.phone,
            email: r.email,
            last_visit: r.last_visit || undefined,
            revenue: r.revenue,
          })),
        }),
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } finally {
      setImporting(false);
    }
  };

  const previewRows = parsed?.slice(0, 10) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/60" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-lg overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <h2 id="import-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">ייבוא לקוחות מקובץ Excel / CSV</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="סגור">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">שלב 1 — העלאת קובץ</p>
            <label
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 px-4 cursor-pointer transition-colors ${
                dragOver
                  ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50'
              }`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <Upload className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-2" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">גרור קובץ לכאן או לחץ לבחירה</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">CSV או Excel</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">השתמש בתבנית שהורדת כדי למנוע שגיאות.</p>
          </div>

          {columnError && file && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
              חסרות עמודות בקובץ. אנא השתמש בתבנית.
            </div>
          )}

          {parsed && parsed.length > 0 && (
            <>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">תצוגה מקדימה (10 שורות ראשונות)</p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
                    <table className="w-full text-right text-sm" dir="rtl">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">שם</th>
                          <th className="py-2.5 px-3">טלפון</th>
                          <th className="py-2.5 px-3">אימייל</th>
                          <th className="py-2.5 px-3">ביקור אחרון</th>
                          <th className="py-2.5 px-3">הכנסה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r, i) => (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-2 px-3 text-slate-900 dark:text-slate-50">{r.name || '—'}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400" dir="ltr">{r.phone || '—'}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.email || '—'}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.last_visit || '—'}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.revenue ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">סה״כ {parsed.length} שורות לייבוא</p>
              </div>

              <div className="flex gap-3 justify-start pt-2">
                <button
                  type="button"
                  onClick={doImport}
                  disabled={importing}
                  className="inline-flex items-center gap-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-60 transition"
                >
                  {importing ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  ייבוא נתונים
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  ביטול
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
