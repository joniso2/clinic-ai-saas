'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, MessageCircle, Send, Clock, Calendar, Repeat, CheckCircle2,
  Users, ChevronDown, Smartphone, AlertCircle, RefreshCw,
} from 'lucide-react';
import type { Patient } from '@/types/patients';
import type { Campaign } from '@/types/campaigns';
import { formatPhoneILS } from '@/lib/hebrew';
import type { Channel, AudienceType, ScheduleType } from './messaging-helpers';
import { DAYS_HE, VARIABLES, daysSince, formatDate, getStatusBadge, getChannelBadge } from './messaging-helpers';

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">
      {children}
    </p>
  );
}

// ─── Compose tab ──────────────────────────────────────────────────────────────

function ComposeTab({
  customers,
  selectedIds,
  onSent,
}: {
  customers: Patient[];
  selectedIds: Set<string>;
  onSent: (campaign: Campaign) => void;
}) {
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>(selectedIds.size > 0 ? 'custom' : 'all');
  const [lastVisitDays, setLastVisitDays] = useState(30);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('now');
  const [scheduleDay, setScheduleDay] = useState('1');       // 1-7 for weekly, 1-28 for monthly
  const [autoDays, setAutoDays] = useState('7');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Audience computation
  const audienceCustomers = (() => {
    if (audienceType === 'all') return customers;
    if (audienceType === 'custom') return customers.filter((c) => selectedIds.has(c.id));
    if (audienceType === 'last_visit_filter') {
      return customers.filter((c) => {
        const d = daysSince(c.last_visit_date);
        return d === null || d >= lastVisitDays;
      });
    }
    return [];
  })();

  const audienceSize = audienceCustomers.length;

  const insertVariable = useCallback((variable: string) => {
    const el = textareaRef.current;
    if (!el) { setMessage((m) => m + variable); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = message.slice(0, start) + variable + message.slice(end);
    setMessage(next);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + variable.length;
      el.focus();
    }, 0);
  }, [message]);

  const getScheduleValue = (): string | null => {
    if (scheduleType === 'weekly') return scheduleDay;
    if (scheduleType === 'monthly') return scheduleDay;
    if (scheduleType === 'auto_days_after') return autoDays;
    return null;
  };

  const handleSend = async () => {
    if (!message.trim()) { setError('אנא כתוב הודעה'); return; }
    if (audienceSize === 0) { setError('לא נמצאו לקוחות לשליחה'); return; }
    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channel,
          message: message.trim(),
          audience_type: audienceType,
          audience_ids: audienceType === 'custom' ? audienceCustomers.map((c) => c.id) : [],
          audience_size: audienceSize,
          schedule_type: scheduleType,
          schedule_value: getScheduleValue(),
        }),
      });
      const json = await res.json().catch(() => ({})) as { campaign?: Campaign; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'שגיאה בשמירת הקמפיין');
      if (json.campaign) onSent(json.campaign);
      setMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 p-5">
      {/* Channel selector */}
      <section>
        <SectionLabel>ערוץ שליחה</SectionLabel>
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50 p-1 gap-1">
          {(['whatsapp', 'sms'] as Channel[]).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                channel === ch
                  ? ch === 'whatsapp'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {ch === 'whatsapp' ? <MessageCircle className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              {ch === 'whatsapp' ? 'WhatsApp' : 'SMS'}
            </button>
          ))}
        </div>
      </section>

      {/* Message composer */}
      <section>
        <SectionLabel>הודעה</SectionLabel>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 transition">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתוב את ההודעה כאן..."
            rows={5}
            dir="rtl"
            className="w-full bg-white dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none text-right"
          />
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-2 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 ml-1">הוסף משתנה:</span>
              {VARIABLES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  title={v.title}
                  onClick={() => insertVariable(v.value)}
                  className="rounded-md border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 text-xs font-mono font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                >
                  {v.label}
                </button>
              ))}
            </div>
            <span className={`text-[11px] tabular-nums ${message.length > 140 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {message.length} / 160
            </span>
          </div>
        </div>
      </section>

      {/* Audience selector */}
      <section>
        <SectionLabel>קהל יעד</SectionLabel>
        <div className="space-y-2">
          {[
            { value: 'all',               label: `כל הלקוחות`, count: customers.length },
            { value: 'custom',            label: `לקוחות נבחרים`, count: customers.filter((c) => selectedIds.has(c.id)).length, disabled: selectedIds.size === 0 },
            { value: 'last_visit_filter', label: null, count: null },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                audienceType === opt.value
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
              } ${(opt as { disabled?: boolean }).disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="audience"
                value={opt.value}
                checked={audienceType === opt.value}
                disabled={(opt as { disabled?: boolean }).disabled}
                onChange={() => setAudienceType(opt.value as AudienceType)}
                className="text-indigo-500 focus:ring-indigo-500/30"
              />
              {opt.value === 'last_visit_filter' ? (
                <span className="flex items-center gap-2 flex-1 text-sm text-slate-700 dark:text-slate-300">
                  <span>לא ביקרו ב-</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={lastVisitDays}
                    onChange={(e) => setLastVisitDays(Math.max(1, Number(e.target.value) || 1))}
                    onClick={() => setAudienceType('last_visit_filter')}
                    className="w-14 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <span>ימים אחרונים</span>
                  <span className="mr-auto rounded-full bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                    {customers.filter((c) => { const d = daysSince(c.last_visit_date); return d === null || d >= lastVisitDays; }).length} לקוחות
                  </span>
                </span>
              ) : (
                <span className="flex items-center justify-between flex-1">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
                  {opt.count != null && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                      {opt.count} לקוחות
                    </span>
                  )}
                </span>
              )}
            </label>
          ))}
        </div>
      </section>

      {/* Schedule */}
      <section>
        <SectionLabel>תזמון שליחה</SectionLabel>
        <div className="space-y-2">
          <label className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition ${scheduleType === 'now' ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <input type="radio" name="schedule" value="now" checked={scheduleType === 'now'} onChange={() => setScheduleType('now')} className="text-indigo-500" />
            <Send className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-300">שלח עכשיו</span>
          </label>

          <label className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition ${scheduleType === 'weekly' ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <input type="radio" name="schedule" value="weekly" checked={scheduleType === 'weekly'} onChange={() => setScheduleType('weekly')} className="text-indigo-500" />
            <Repeat className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="flex items-center gap-2 flex-1 text-sm text-slate-700 dark:text-slate-300">
              <span>שבועי — יום</span>
              <div className="relative">
                <select
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(e.target.value)}
                  onClick={() => setScheduleType('weekly')}
                  className="appearance-none rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pr-7 pl-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  dir="rtl"
                >
                  {DAYS_HE.map((d, i) => <option key={i} value={String(i + 1)}>{d}</option>)}
                </select>
                <ChevronDown className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
              <span>בשבוע</span>
            </span>
          </label>

          <label className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition ${scheduleType === 'monthly' ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <input type="radio" name="schedule" value="monthly" checked={scheduleType === 'monthly'} onChange={() => setScheduleType('monthly')} className="text-indigo-500" />
            <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="flex items-center gap-2 flex-1 text-sm text-slate-700 dark:text-slate-300">
              <span>חודשי — יום</span>
              <input
                type="number"
                min={1}
                max={28}
                value={scheduleDay}
                onChange={(e) => setScheduleDay(String(Math.min(28, Math.max(1, Number(e.target.value) || 1))))}
                onClick={() => setScheduleType('monthly')}
                className="w-14 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <span>בחודש</span>
            </span>
          </label>

          <label className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition ${scheduleType === 'auto_days_after' ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <input type="radio" name="schedule" value="auto_days_after" checked={scheduleType === 'auto_days_after'} onChange={() => setScheduleType('auto_days_after')} className="text-indigo-500" />
            <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="flex items-center gap-2 flex-1 text-sm text-slate-700 dark:text-slate-300">
              <span>אוטומטי —</span>
              <input
                type="number"
                min={1}
                max={365}
                value={autoDays}
                onChange={(e) => setAutoDays(String(Math.max(1, Number(e.target.value) || 1)))}
                onClick={() => setScheduleType('auto_days_after')}
                className="w-14 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <span>ימים אחרי טיפול אחרון</span>
            </span>
          </label>
        </div>
      </section>

      {/* Audience preview */}
      {audienceSize > 0 && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 p-3.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">תצוגה מקדימה — {audienceSize} נמענים</p>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {audienceCustomers.slice(0, 12).map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300">
                {c.full_name.split(' ')[0]}
              </span>
            ))}
            {audienceSize > 12 && (
              <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">+{audienceSize - 12}</span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Send button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !message.trim() || audienceSize === 0}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 text-sm font-semibold shadow-sm disabled:opacity-50 transition"
        >
          {sending ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> שולח...</>
          ) : (
            <><Send className="h-4 w-4" /> שלח הודעה ל-{audienceSize} לקוחות</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Campaign log tab ─────────────────────────────────────────────────────────

function CampaignLogTab({ campaigns, loading, onRefresh }: {
  campaigns: Campaign[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {campaigns.length} קמפיינים
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> רענן
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
            <Send className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">אין קמפיינים עדיין</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">הקמפיינים שתשלח יופיעו כאן</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm" dir="rtl">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4">תאריך</th>
                  <th className="py-3 px-4">ערוץ</th>
                  <th className="py-3 px-4">קהל</th>
                  <th className="py-3 px-4">הודעה</th>
                  <th className="py-3 px-4">תזמון</th>
                  <th className="py-3 px-4">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const statusBadge = getStatusBadge(c.status);
                  const channelBadge = getChannelBadge(c.channel);
                  const scheduleLabel = (() => {
                    if (c.schedule_type === 'now') return 'מיידי';
                    if (c.schedule_type === 'weekly') return `שבועי — יום ${DAYS_HE[(Number(c.schedule_value) || 1) - 1]}`;
                    if (c.schedule_type === 'monthly') return `חודשי — יום ${c.schedule_value}`;
                    if (c.schedule_type === 'auto_days_after') return `${c.schedule_value} ימים לאחר טיפול`;
                    return '—';
                  })();
                  return (
                    <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(c.created_at)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${channelBadge.cls}`}>{channelBadge.label}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 tabular-nums">{c.audience_size}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-200 max-w-[200px]">
                        <span className="truncate block" title={c.message}>{c.message}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">{scheduleLabel}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.cls}`}>
                          {c.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                          {statusBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main MessagingPanel ──────────────────────────────────────────────────────

export function MessagingPanel({
  customers,
  selectedIds,
  onClose,
}: {
  customers: Patient[];
  selectedIds: Set<string>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'compose' | 'log'>('compose');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    const res = await fetch('/api/campaigns', { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as { campaigns?: Campaign[] };
    setCampaigns(json.campaigns ?? []);
    setCampaignsLoading(false);
  }, []);

  useEffect(() => { void fetchCampaigns(); }, [fetchCampaigns]);

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(null), 3500);
    return () => clearTimeout(t);
  }, [successToast]);

  const handleSent = (campaign: Campaign) => {
    setCampaigns((prev) => [campaign, ...prev]);
    const label = campaign.status === 'sent' ? 'ההודעה נשלחה בהצלחה' : 'הקמפיין תוזמן בהצלחה';
    setSuccessToast(label);
    setTab('log');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-4" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100vh - 4rem)', animation: 'slideUpFade 200ms ease-out forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 dark:bg-indigo-500/25">
              <Send className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">מערכת הודעות</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">{customers.length} לקוחות זמינים</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-label="סגור">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
          {[
            { id: 'compose', label: 'כתוב הודעה', icon: <Send className="h-3.5 w-3.5" /> },
            { id: 'log',     label: 'היסטוריה',   icon: <Clock className="h-3.5 w-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as 'compose' | 'log')}
              className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t.icon} {t.label}
              {t.id === 'log' && campaigns.length > 0 && (
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                  {campaigns.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="overflow-y-auto flex-1">
          {tab === 'compose' ? (
            <ComposeTab customers={customers} selectedIds={selectedIds} onSent={handleSent} />
          ) : (
            <CampaignLogTab campaigns={campaigns} loading={campaignsLoading} onRefresh={fetchCampaigns} />
          )}
        </div>
      </div>

      {/* Success toast */}
      {successToast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 inline-flex items-center gap-2 rounded-xl bg-emerald-700 dark:bg-emerald-800 border border-emerald-600 px-4 py-2.5 text-sm text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successToast}
        </div>
      )}

      <style>{`
        @keyframes slideUpFade {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
