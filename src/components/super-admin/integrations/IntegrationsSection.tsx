'use client';

/**
 * Section 4 — Integrations
 * Discord guild mappings, WhatsApp status, Webhook overview.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Bot, Webhook, RefreshCw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DiscordMapping {
  id: string;
  guild_id: string;
  clinic_id: string;
  clinic_name: string;
}

interface TenantOption {
  id: string;
  name: string | null;
}

// ─── Mock webhook log (replace with real API) ─────────────────────────────────
interface WebhookLogEntry {
  readonly id: string;
  readonly tenantName: string;
  readonly event: string;
  readonly status: 'success' | 'failed' | 'pending';
  readonly timestamp: string;
  readonly responseMs: number;
}

const MOCK_WEBHOOK_LOGS: WebhookLogEntry[] = [
  { id: '1', tenantName: 'קליניקת ד"ר לוי', event: 'lead.created', status: 'success', timestamp: new Date(Date.now() - 60_000).toISOString(), responseMs: 145 },
  { id: '2', tenantName: 'מרפאת שלום', event: 'appointment.booked', status: 'success', timestamp: new Date(Date.now() - 180_000).toISOString(), responseMs: 212 },
  { id: '3', tenantName: 'קליניקת חיוך', event: 'lead.created', status: 'failed', timestamp: new Date(Date.now() - 320_000).toISOString(), responseMs: 3010 },
  { id: '4', tenantName: 'מרפאת השיניים', event: 'appointment.cancelled', status: 'success', timestamp: new Date(Date.now() - 600_000).toISOString(), responseMs: 98 },
  { id: '5', tenantName: 'קליניקת ד"ר לוי', event: 'lead.updated', status: 'pending', timestamp: new Date(Date.now() - 30_000).toISOString(), responseMs: 0 },
];

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);
  return { toast, show };
}

function StatusIcon({ status }: { status: 'healthy' | 'warning' | 'critical' | 'coming_soon' }) {
  if (status === 'healthy') return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  if (status === 'warning') return <AlertCircle className="h-5 w-5 text-amber-400" />;
  if (status === 'coming_soon') return <AlertCircle className="h-5 w-5 text-zinc-500" />;
  return <XCircle className="h-5 w-5 text-red-400" />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IntegrationsSection() {
  const { toast, show } = useToast();

  const [mappings, setMappings] = useState<DiscordMapping[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [fGuildId, setFGuildId] = useState('');
  const [fClinicId, setFClinicId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        fetch('/api/super-admin/discord'),
        fetch('/api/super-admin/clinics'),
      ]);
      const [mData, cData] = await Promise.all([mRes.json().catch(() => ({})), cRes.json().catch(() => ({}))]);
      setMappings(mData.mappings ?? []);
      setTenants(cData.clinics ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async () => {
    if (!fGuildId.trim() || !fClinicId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/super-admin/discord', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: fGuildId.trim(), clinic_id: fClinicId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'שגיאה');
      show('המיפוי נוסף'); setModalOpen(false); setFGuildId(''); setFClinicId('');
      fetchAll();
    } catch (e) { show((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('להסיר מיפוי Discord?')) return;
    await fetch(`/api/super-admin/discord?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    show('המיפוי הוסר'); fetchAll();
  };

  const discordConnected = mappings.length;
  const discordTotal = tenants.length;
  const discordStatus = discordConnected === discordTotal && discordTotal > 0 ? 'healthy' : discordConnected > 0 ? 'warning' : 'critical';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">מרכז אינטגרציות</h2>
        <p className="text-sm text-zinc-400 mb-6">סטטוס חיבורים פלטפורמה-רחבים — Discord, WhatsApp, ו-Webhooks.</p>
      </div>

      {/* Platform status cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Discord */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 hover:border-zinc-600 transition-all duration-200">
          <div className="flex items-center justify-between flex-row-reverse mb-3">
            <div className="flex items-center gap-2.5 flex-row-reverse">
              <Bot className="h-6 w-6 text-indigo-400" />
              <span className="font-semibold text-zinc-100">Discord</span>
            </div>
            <StatusIcon status={discordStatus} />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-zinc-100 tabular-nums tracking-tight">{discordConnected}/{discordTotal}</p>
            <p className="text-xs text-zinc-500">לקוחות מחוברים</p>
          </div>
          <div className="mt-3 bg-zinc-800 rounded-full h-1.5 overflow-hidden border border-zinc-700">
            <div className="h-full rounded-full bg-indigo-500 transition-all duration-700"
              style={{ width: discordTotal > 0 ? `${(discordConnected / discordTotal) * 100}%` : '0%' }} />
          </div>
        </div>

        {/* WhatsApp */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 hover:border-zinc-600 transition-all duration-200">
          <div className="flex items-center justify-between flex-row-reverse mb-3">
            <div className="flex items-center gap-2.5 flex-row-reverse">
              <div className="h-6 w-6 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">W</span>
              </div>
              <span className="font-semibold text-zinc-100">WhatsApp</span>
            </div>
            <StatusIcon status="coming_soon" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-zinc-500 tabular-nums tracking-tight">0/{discordTotal}</p>
            <p className="text-xs text-zinc-500">לא מוגדר עדיין</p>
          </div>
          <div className="mt-3 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-[11px] text-zinc-500">
            יוגדר בגרסה הבאה
          </div>
        </div>

        {/* Webhooks */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 hover:border-zinc-600 transition-all duration-200">
          <div className="flex items-center justify-between flex-row-reverse mb-3">
            <div className="flex items-center gap-2.5 flex-row-reverse">
              <Webhook className="h-6 w-6 text-violet-400" />
              <span className="font-semibold text-zinc-100">Webhooks</span>
            </div>
            <StatusIcon status="warning" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-zinc-100 tabular-nums tracking-tight">{MOCK_WEBHOOK_LOGS.filter((l) => l.status === 'success').length}/{MOCK_WEBHOOK_LOGS.length}</p>
            <p className="text-xs text-zinc-500">הצלחות ב-24 שעות</p>
          </div>
          <p className="mt-2 text-[11px] text-amber-400">
            {MOCK_WEBHOOK_LOGS.filter((l) => l.status === 'failed').length} כשלונות
          </p>
        </div>
      </div>

      {/* Discord mappings */}
      <div>
        <div className="flex items-center justify-between flex-row-reverse mb-4">
          <h3 className="text-sm font-semibold text-zinc-300">מיפויי Discord</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchAll} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" title="רענן">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { setModalOpen(true); setFClinicId(tenants[0]?.id ?? ''); setFGuildId(''); }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 text-sm font-semibold transition-colors flex-row-reverse">
              <Plus className="h-4 w-4" />הוסף מיפוי
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-700 overflow-hidden bg-zinc-900">
          {loading ? (
            <div className="py-10 text-center text-zinc-500 text-sm">טוען…</div>
          ) : (
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800">
                  {['מזהה שרת (Guild ID)','שם לקוח','סטטוס','פעולות'].map((h) => (
                    <th key={h} className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <Bot className="h-8 w-8 text-zinc-500 ms-auto me-auto mb-2 block" />
                      <p className="text-sm text-zinc-400">אין מיפויי Discord עדיין</p>
                      <p className="text-xs text-zinc-600 mt-1">הוסף מיפוי שרת כדי להתחיל</p>
                    </td>
                  </tr>
                ) : mappings.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-700 hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-zinc-300">{m.guild_id}</td>
                    <td className="py-3 px-4 font-medium text-zinc-100">{m.clinic_name}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />מחובר
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button type="button" onClick={() => handleDelete(m.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />הסר
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Webhook activity log */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">לוג פעילות Webhooks (מוק)</h3>
        <div className="rounded-2xl border border-zinc-700 overflow-hidden bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-800">
                {['לקוח','אירוע','סטטוס','זמן תגובה','זמן'].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_WEBHOOK_LOGS.map((log) => (
                <tr key={log.id} className="border-b border-zinc-700 hover:bg-zinc-800/50">
                  <td className="py-3 px-4 font-medium text-zinc-200">{log.tenantName}</td>
                  <td className="py-3 px-4 font-mono text-xs text-zinc-400">{log.event}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${
                      log.status === 'success' ? 'bg-emerald-400/10 text-emerald-400' :
                      log.status === 'failed' ? 'bg-red-400/10 text-red-400' :
                      'bg-amber-400/10 text-amber-400'
                    }`}>
                      {log.status === 'success' ? 'הצליח' : log.status === 'failed' ? 'נכשל' : 'ממתין'}
                    </span>
                  </td>
                  <td className="py-3 px-4 tabular-nums text-xs text-zinc-400">
                    {log.responseMs > 0 ? `${log.responseMs}ms` : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-500">
                    {new Date(log.timestamp).toLocaleTimeString('he-IL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Discord modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalOpen(false)}>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl max-w-sm w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-100 mb-5">הוסף מיפוי Discord</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">מזהה שרת (Guild ID)</label>
                <input type="text" value={fGuildId} onChange={(e) => setFGuildId(e.target.value)} placeholder="1234567890123456789"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-mono text-zinc-100 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">לקוח</label>
                <select value={fClinicId} onChange={(e) => setFClinicId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500">
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name ?? t.id}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm">ביטול</button>
              <button type="button" onClick={handleAdd} disabled={saving || !fGuildId.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                {saving ? 'שומר…' : 'הוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-2.5 text-sm font-medium shadow-xl">{toast}</div>
      )}
    </div>
  );
}
