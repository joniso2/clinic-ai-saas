'use client';

/**
 * Messaging — Test Console + Conversation Logs
 * Super Admin: send test message, view logs with filters.
 */

import { useState, useEffect, useCallback } from 'react';
import { Send, MessageSquare, Filter, RefreshCw } from 'lucide-react';
import { btn, input, inputLabel } from '@/lib/ui-classes';

interface ClinicOption {
  id: string;
  name: string | null;
}

interface LogRow {
  id: string;
  clinic_id: string;
  clinic_name: string;
  channel: string;
  direction: string;
  phone: string | null;
  message_preview: string;
  status: string;
  created_at: string;
}

export default function MessagingSection() {
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filterClinic, setFilterClinic] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const show = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  useEffect(() => {
    fetch('/api/super-admin/clinics')
      .then((r) => r.json())
      .then((d) => {
        const list = d.clinics ?? [];
        setClinics(list);
        if (list.length && !selectedClinicId) setSelectedClinicId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    const params = new URLSearchParams();
    if (filterClinic) params.set('clinic_id', filterClinic);
    if (filterChannel) params.set('channel', filterChannel);
    if (filterFrom) params.set('from', `${filterFrom}T00:00:00.000Z`);
    if (filterTo) params.set('to', `${filterTo}T23:59:59.999Z`);
    params.set('limit', '100');
    const res = await fetch(`/api/super-admin/messages?${params}`);
    const data = await res.json().catch(() => ({}));
    setLogs(data.messages ?? []);
    setLogsLoading(false);
  }, [filterClinic, filterChannel, filterFrom, filterTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSendTest = async () => {
    if (!selectedClinicId || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: selectedClinicId, channel, phone: phone || undefined, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'שגיאה');
      show('נשלח');
    } catch (e) { show((e as Error).message); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-8" dir="rtl">
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-right mb-2">מסרים</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-right">קונסולת בדיקה ולוג שיחות.</p>
      </div>

      {/* Test Console */}
      <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2 flex-row-reverse">
          <Send className="h-5 w-5" /> Messaging Test Console
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`${inputLabel} text-right`}>קליניקה</label>
            <select value={selectedClinicId} onChange={(e) => setSelectedClinicId(e.target.value)} className={`${input} text-right`}>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
            </select>
          </div>
          <div>
            <label className={`${inputLabel} text-right`}>ערוץ</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${input} text-right`}>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="discord">Discord</option>
              <option value="webchat">Webchat</option>
            </select>
          </div>
          <div>
            <label className={`${inputLabel} text-right`}>מס׳ טלפון</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+972..." className={`${input} text-right`} />
          </div>
          <div>
            <label className={`${inputLabel} text-right`}>הודעה</label>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="תוכן ההודעה" className={`${input} text-right`} />
          </div>
        </div>
        <button type="button" onClick={handleSendTest} disabled={sending || !message.trim()} className={`${btn.primary} flex-row-reverse`}>
          <Send className="h-4 w-4" /> Send Test Message
        </button>
      </div>

      {/* Conversation Logs */}
      <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex flex-wrap items-center gap-2 flex-row-reverse justify-between">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2 flex-row-reverse">
            <MessageSquare className="h-5 w-5" /> Conversation Logs
          </h3>
          <div className="flex flex-wrap items-center gap-2 flex-row-reverse">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={filterClinic} onChange={(e) => setFilterClinic(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
              <option value="">כל הקליניקות</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
            </select>
            <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
              <option value="">כל הערוצים</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="discord">Discord</option>
              <option value="webchat">Webchat</option>
            </select>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200" />
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200" />
            <button type="button" onClick={fetchLogs} className={btn.icon} title="רענן"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                {['זמן', 'קליניקה', 'ערוץ', 'כיוון', 'טלפון', 'תצוגת הודעה', 'סטטוס'].map((h) => (
                  <th key={h} className="py-3 px-4 text-[11px] font-semibold uppercase text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">טוען…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">אין רשומות</td></tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                    <td className="py-2 px-4 text-xs text-slate-400">{new Date(row.created_at).toLocaleString('he-IL')}</td>
                    <td className="py-2 px-4 font-medium text-slate-200">{row.clinic_name}</td>
                    <td className="py-2 px-4 text-slate-300">{row.channel}</td>
                    <td className="py-2 px-4">{row.direction === 'incoming' ? 'נכנס' : 'יוצא'}</td>
                    <td className="py-2 px-4 font-mono text-xs text-slate-400">{row.phone ?? '—'}</td>
                    <td className="py-2 px-4 text-slate-400 max-w-[200px] truncate">{row.message_preview}</td>
                    <td className="py-2 px-4"><span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{row.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 px-4 py-2.5 text-sm shadow-xl">{toast}</div>
      )}
    </div>
  );
}
