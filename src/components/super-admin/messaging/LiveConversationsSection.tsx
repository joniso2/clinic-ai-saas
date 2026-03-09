'use client';

/**
 * Live Conversations — real-time view of recent messages for monitoring/debugging.
 */

import { useState, useEffect, useCallback } from 'react';
import { Radio, RefreshCw } from 'lucide-react';

interface LogRow {
  id: string;
  clinic_name: string;
  channel: string;
  direction: string;
  phone: string | null;
  message_preview: string;
  status: string;
  created_at: string;
}

export default function LiveConversationsSection() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/super-admin/messages?limit=50');
    const data = await res.json().catch(() => ({}));
    setLogs(data.messages ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => {
    const t = setInterval(fetchLogs, 15000);
    return () => clearInterval(t);
  }, [fetchLogs]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-right mb-2">שיחות חיות</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-right">צפייה בזמן אמת בהודעות נכנסות ותגובות AI (מתעדכן כל 15 שניות).</p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between flex-row-reverse">
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2 flex-row-reverse"><Radio className="h-5 w-5" /> עדכון אחרון</h3>
          <button type="button" onClick={fetchLogs} disabled={loading} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-50 flex items-center gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> רענן
          </button>
        </div>
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm text-right">
            <thead className="sticky top-0 bg-zinc-800 z-10">
              <tr className="border-b border-zinc-700">
                {['זמן', 'קליניקה', 'ערוץ', 'כיוון', 'טלפון', 'הודעה', 'סטטוס'].map((h) => (
                  <th key={h} className="py-3 px-4 text-[11px] font-semibold uppercase text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-zinc-500">טוען…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-zinc-500">אין הודעות לאחרונה</td></tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-700 hover:bg-zinc-800/50">
                    <td className="py-2 px-4 text-xs text-zinc-400 whitespace-nowrap">{new Date(row.created_at).toLocaleString('he-IL')}</td>
                    <td className="py-2 px-4 font-medium text-zinc-200">{row.clinic_name}</td>
                    <td className="py-2 px-4 text-zinc-300">{row.channel}</td>
                    <td className="py-2 px-4">{row.direction === 'incoming' ? 'נכנס' : 'יוצא'}</td>
                    <td className="py-2 px-4 font-mono text-xs text-zinc-400">{row.phone ?? '—'}</td>
                    <td className="py-2 px-4 text-zinc-400 max-w-[220px] truncate">{row.message_preview}</td>
                    <td className="py-2 px-4"><span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">{row.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
