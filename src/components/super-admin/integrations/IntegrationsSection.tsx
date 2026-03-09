'use client';

/**
 * Section — Integrations (per-clinic)
 * Clinic selector + per-clinic integration cards (WhatsApp, SMS, Discord, Webhook).
 * Connect / Reconnect / Disconnect / Send Test; metrics per clinic.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CheckCircle2, XCircle, Bot, Webhook, RefreshCw, Send } from 'lucide-react';
import { btn, input, inputLabel } from '@/lib/ui-classes';
import type { DiscordMapping, TenantOption, ClinicIntegration, ClinicMetrics } from './integrations-types';
import { MOCK_WEBHOOK_LOGS, CHANNEL_LABELS, PROVIDERS } from './integrations-types';
import { useToast, StatusIcon, ConnectModal } from './integrations-shared';

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IntegrationsSection() {
  const { toast, show } = useToast();

  const [mappings, setMappings] = useState<DiscordMapping[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<ClinicIntegration[]>([]);
  const [metrics, setMetrics] = useState<ClinicMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [connectModal, setConnectModal] = useState<'whatsapp' | 'sms' | 'discord' | 'webhook' | null>(null);
  const [fGuildId, setFGuildId] = useState('');
  const [fClinicId, setFClinicId] = useState('');
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testChannel, setTestChannel] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [connectConfig, setConnectConfig] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        fetch('/api/super-admin/discord'),
        fetch('/api/super-admin/clinics'),
      ]);
      const [mData, cData] = await Promise.all([mRes.json().catch(() => ({})), cRes.json().catch(() => ({}))]);
      setMappings(mData.mappings ?? []);
      const clinics = cData.clinics ?? [];
      setTenants(clinics);
      if (!selectedClinicId && clinics.length) setSelectedClinicId(clinics[0].id);
    } finally { setLoading(false); }
  }, [selectedClinicId]);

  const fetchPerClinic = useCallback(async () => {
    if (!selectedClinicId) return;
    const [intRes, metRes] = await Promise.all([
      fetch(`/api/super-admin/clinic-integrations?clinic_id=${encodeURIComponent(selectedClinicId)}`),
      fetch(`/api/super-admin/clinic-integrations/metrics?clinic_id=${encodeURIComponent(selectedClinicId)}`),
    ]);
    const [intData, metData] = await Promise.all([intRes.json().catch(() => ({})), metRes.json().catch(() => ({}))]);
    setIntegrations(intData.integrations ?? []);
    setMetrics(metData.messages_today !== undefined ? metData : null);
  }, [selectedClinicId]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchPerClinic(); }, [fetchPerClinic]);

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

  const handleConnect = async (type: 'whatsapp' | 'sms' | 'discord' | 'webhook', provider: string, config: Record<string, unknown>) => {
    if (!selectedClinicId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/super-admin/clinic-integrations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: selectedClinicId, type, provider, config }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'שגיאה');
      show('חובר'); setConnectModal(null); fetchPerClinic();
    } catch (e) { show((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('לנתק אינטגרציה?')) return;
    const res = await fetch('/api/super-admin/clinic-integrations', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'disconnected' }),
    });
    if (!res.ok) { show((await res.json()).error ?? 'שגיאה'); return; }
    show('נותק'); fetchPerClinic();
  };

  const handleSendTest = async (channel: string, phone: string, message: string) => {
    if (!selectedClinicId || !message.trim()) return;
    setSendingTest(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: selectedClinicId, channel, phone: phone || undefined, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'שגיאה');
      show('נשלח');
    } catch (e) { show((e as Error).message); }
    finally { setSendingTest(false); }
  };

  const discordConnected = mappings.length;
  const discordTotal = tenants.length;
  const discordStatus = discordConnected === discordTotal && discordTotal > 0 ? 'healthy' : discordConnected > 0 ? 'warning' : 'critical';

  const getIntegration = (type: string) => integrations.find((i) => i.type === type);

  return (
    <div className="space-y-8">
      {/* Header + Clinic selector */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-right mb-2">מרכז אינטגרציות</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-right mb-4">אינטגרציות לפי קליניקה — בחר קליניקה להצגת חיבורים ומדדים.</p>
        <div className="flex items-center gap-2 flex-row-reverse justify-end">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">בחר קליניקה:</label>
          <select
            value={selectedClinicId ?? ''}
            onChange={(e) => setSelectedClinicId(e.target.value || null)}
            className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate-900 dark:text-slate-50 min-w-[200px]"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name ?? t.id}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Per-clinic metrics + integration cards */}
      {selectedClinicId && (
        <div className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">הודעות היום</p>
                <p className="text-xl font-bold text-slate-100">{metrics.messages_today}</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">הודעות החודש</p>
                <p className="text-xl font-bold text-slate-100">{metrics.messages_this_month}</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">הודעה אחרונה</p>
                <p className="text-sm font-medium text-slate-300">
                  {metrics.last_message_at ? new Date(metrics.last_message_at).toLocaleString('he-IL') : '—'}
                </p>
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['whatsapp', 'sms', 'discord', 'webhook'] as const).map((type) => {
              const int = getIntegration(type);
              const isConnected = int?.status === 'connected';
              return (
                <div key={type} className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between flex-row-reverse mb-3">
                    <span className="font-semibold text-slate-900 dark:text-slate-50">{CHANNEL_LABELS[type] ?? type}</span>
                    {isConnected ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-slate-500" />}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{isConnected ? `${int?.provider}` : 'לא מחובר'}</p>
                  <div className="flex flex-col gap-2">
                    {!isConnected ? (
                      <button type="button" onClick={() => setConnectModal(type)} className={`${btn.primary} w-full`}>
                        התחבר
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => handleDisconnect(int!.id)} className={`${btn.secondary} w-full`}>
                          נתק
                        </button>
                        {(type === 'whatsapp' || type === 'sms') && (
                          <button type="button" onClick={() => { setTestPhone(''); setTestMessage('בדיקה'); setTestChannel(type); }} className="w-full rounded-lg border border-slate-600 text-slate-300 py-2 text-sm flex items-center justify-center gap-1">
                            <Send className="h-3.5 w-3.5" /> שלח הודעת בדיקה
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform status cards (global summary) */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Discord */}
        <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200">
          <div className="flex items-center justify-between flex-row-reverse mb-3">
            <div className="flex items-center gap-2.5 flex-row-reverse">
              <Bot className="h-6 w-6 text-indigo-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-50">Discord</span>
            </div>
            <StatusIcon status={discordStatus} />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">{discordConnected}/{discordTotal}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">לקוחות מחוברים</p>
          </div>
          <div className="mt-3 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="h-full rounded-full bg-indigo-500 transition-all duration-700"
              style={{ width: discordTotal > 0 ? `${(discordConnected / discordTotal) * 100}%` : '0%' }} />
          </div>
        </div>

        {/* WhatsApp */}
        <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200">
          <div className="flex items-center justify-between flex-row-reverse mb-3">
            <div className="flex items-center gap-2.5 flex-row-reverse">
              <div className="h-6 w-6 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">W</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-50">WhatsApp</span>
            </div>
            <StatusIcon status="coming_soon" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-500 dark:text-slate-500 tabular-nums tracking-tight">0/{discordTotal}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">לא מוגדר עדיין</p>
          </div>
          <div className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-[11px] text-slate-500 dark:text-slate-500">
            יוגדר בגרסה הבאה
          </div>
        </div>

        {/* Webhooks */}
        <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200">
          <div className="flex items-center justify-between flex-row-reverse mb-3">
            <div className="flex items-center gap-2.5 flex-row-reverse">
              <Webhook className="h-6 w-6 text-violet-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-50">Webhooks</span>
            </div>
            <StatusIcon status="warning" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">{MOCK_WEBHOOK_LOGS.filter((l) => l.status === 'success').length}/{MOCK_WEBHOOK_LOGS.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">הצלחות ב-24 שעות</p>
          </div>
          <p className="mt-2 text-[11px] text-amber-400">
            {MOCK_WEBHOOK_LOGS.filter((l) => l.status === 'failed').length} כשלונות
          </p>
        </div>
      </div>

      {/* Discord mappings */}
      <div>
        <div className="flex items-center justify-between flex-row-reverse mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">מיפויי Discord</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchAll} className={btn.icon} title="רענן">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { setModalOpen(true); setFClinicId(tenants[0]?.id ?? ''); setFGuildId(''); }}
              className={`${btn.primary} flex-row-reverse`}>
              <Plus className="h-4 w-4" />הוסף מיפוי
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950">
          {loading ? (
            <div className="py-10 text-center text-slate-500 dark:text-slate-500 text-sm">טוען…</div>
          ) : (
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800">
                  {['מזהה שרת (Guild ID)','שם לקוח','סטטוס','פעולות'].map((h) => (
                    <th key={h} className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <Bot className="h-8 w-8 text-slate-500 ms-auto me-auto mb-2 block" />
                      <p className="text-sm text-slate-400">אין מיפויי Discord עדיין</p>
                      <p className="text-xs text-slate-600 mt-1">הוסף מיפוי שרת כדי להתחיל</p>
                    </td>
                  </tr>
                ) : mappings.map((m) => (
                  <tr key={m.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">{m.guild_id}</td>
                    <td className="py-3 px-4 font-medium text-slate-100">{m.clinic_name}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />מחובר
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button type="button" onClick={() => handleDelete(m.id)}
                        className={`${btn.danger} text-xs px-2.5 py-1.5`}>
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
        <h3 className="text-sm font-semibold text-slate-300 mb-4">לוג פעילות Webhooks (מוק)</h3>
        <div className="rounded-2xl border border-slate-700 overflow-hidden bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                {['לקוח','אירוע','סטטוס','זמן תגובה','זמן'].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_WEBHOOK_LOGS.map((log) => (
                <tr key={log.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                  <td className="py-3 px-4 font-medium text-slate-200">{log.tenantName}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">{log.event}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${
                      log.status === 'success' ? 'bg-emerald-400/10 text-emerald-400' :
                      log.status === 'failed' ? 'bg-red-400/10 text-red-400' :
                      'bg-amber-400/10 text-amber-400'
                    }`}>
                      {log.status === 'success' ? 'הצליח' : log.status === 'failed' ? 'נכשל' : 'ממתין'}
                    </span>
                  </td>
                  <td className="py-3 px-4 tabular-nums text-xs text-slate-400">
                    {log.responseMs > 0 ? `${log.responseMs}ms` : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString('he-IL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connect integration modal */}
      {connectModal && (
        <ConnectModal
          type={connectModal}
          providerOptions={PROVIDERS[connectModal] ?? []}
          config={connectConfig}
          setConfig={setConnectConfig}
          saving={saving}
          onSave={(provider, config) => handleConnect(connectModal, provider, config)}
          onClose={() => { setConnectModal(null); setConnectConfig({}); }}
        />
      )}

      {/* Send test message modal */}
      {testChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setTestChannel(null)}>
          <div className="modal-enter rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl max-w-sm w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-100 mb-4">שלח הודעת בדיקה</h3>
            <div className="space-y-3">
              <div>
                <label className={inputLabel}>מס׳ טלפון</label>
                <input type="text" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+972..."
                  className={input} />
              </div>
              <div>
                <label className={inputLabel}>הודעה</label>
                <input type="text" value={testMessage} onChange={(e) => setTestMessage(e.target.value)}
                  className={input} />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button type="button" onClick={() => setTestChannel(null)} className={btn.secondary}>ביטול</button>
              <button type="button" onClick={() => handleSendTest(testChannel, testPhone, testMessage)} disabled={sendingTest || !testMessage.trim()}
                className={btn.primary}>
                {sendingTest ? 'שולח…' : 'שלח'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Discord modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="modal-enter rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl max-w-sm w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-100 mb-5">הוסף מיפוי Discord</h3>
            <div className="space-y-3">
              <div>
                <label className={inputLabel}>מזהה שרת (Guild ID)</label>
                <input type="text" value={fGuildId} onChange={(e) => setFGuildId(e.target.value)} placeholder="1234567890123456789"
                  className={`${input} font-mono`} />
              </div>
              <div>
                <label className={inputLabel}>לקוח</label>
                <select value={fClinicId} onChange={(e) => setFClinicId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name ?? t.id}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button type="button" onClick={() => setModalOpen(false)} className={btn.secondary}>ביטול</button>
              <button type="button" onClick={handleAdd} disabled={saving || !fGuildId.trim()}
                className={btn.primary}>
                {saving ? 'שומר…' : 'הוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 px-4 py-2.5 text-sm font-medium shadow-xl">{toast}</div>
      )}
    </div>
  );
}
