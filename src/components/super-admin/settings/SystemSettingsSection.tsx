'use client';

/**
 * Section 8 — System Settings
 * Feature flags, maintenance mode, rate limits, email config, API keys.
 * All state is local (no backend schema for settings yet).
 */

import { useState } from 'react';
import { Flag, Shield, Mail, Key, Activity, AlertTriangle, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { btn, input, inputLabel } from '@/lib/ui-classes';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeatureFlag {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  category: 'feature' | 'experimental' | 'maintenance';
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }) {
  const s = size === 'sm';
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex rounded-full transition-colors shrink-0 ${s ? 'h-4 w-8' : 'h-5 w-9'} ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}>
      <span className={`absolute top-0.5 rounded-full bg-slate-200 shadow transition-all ${s ? 'h-3 w-3' : 'h-4 w-4'} ${checked ? 'end-0.5' : 'start-0.5'}`} />
    </button>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SettingsCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="flex items-center gap-2.5 flex-row-reverse px-5 py-4 border-b border-slate-800 bg-slate-800/40">
        <Icon className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Masked API key ────────────────────────────────────────────────────────────
function ApiKeyRow({ label, value }: { label: string; value: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const masked = value.slice(0, 8) + '•'.repeat(24) + value.slice(-4);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-800 last:border-0 flex-row-reverse">
      <span className="text-sm text-slate-300 w-32 shrink-0 text-right">{label}</span>
      <code className="flex-1 text-xs font-mono text-slate-400 bg-slate-800 rounded-lg px-3 py-1.5 text-right overflow-x-auto">
        {visible ? value : masked}
      </code>
      <div className="flex gap-1 shrink-0">
        <button type="button" onClick={() => setVisible(!visible)} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors">
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={copy} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors" title="העתק">
          {copied ? <span className="text-emerald-400 text-[10px]">✓</span> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SystemSettingsSection() {
  const [saved, setSaved] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('המערכת בתחזוקה. נחזור בקרוב.');

  const [flags, setFlags] = useState<FeatureFlag[]>([
    { id: 'ai_streaming',     label: 'AI Streaming',        description: 'הצגת תגובות AI בזמן אמת (streaming)',           enabled: true,  category: 'feature' },
    { id: 'whatsapp_beta',    label: 'WhatsApp Beta',       description: 'גישה מוקדמת לאינטגרציית WhatsApp',              enabled: false, category: 'experimental' },
    { id: 'new_dashboard',    label: 'Dashboard V2',        description: 'ממשק לוח מחוונים חדש ללקוחות',                  enabled: false, category: 'experimental' },
    { id: 'audit_logging',    label: 'Audit Logging',       description: 'תיעוד מפורט של כל פעולות המשתמשים',             enabled: true,  category: 'feature' },
    { id: 'multi_model',      label: 'Multi-Model Support', description: 'בחירת מודל שונה לכל קליניקה',                  enabled: false, category: 'experimental' },
    { id: 'rate_limiting',    label: 'Rate Limiting',       description: 'הגבלת קצב קריאות API לפי לקוח',                 enabled: true,  category: 'feature' },
    { id: 'maintenance_mode', label: 'Maintenance Mode',    description: 'הצגת הודעת תחזוקה לכלל המשתמשים',              enabled: maintenanceMode, category: 'maintenance' },
  ]);

  const [rateLimits, setRateLimits] = useState({
    apiRequestsPerMin: 60,
    aiCallsPerDay: 500,
    webhookTimeoutMs: 5000,
  });

  const [emailConfig, setEmailConfig] = useState({
    smtpHost: 'smtp.resend.com',
    smtpPort: '465',
    fromEmail: 'noreply@clinic-ai.app',
    replyTo: 'support@clinic-ai.app',
  });

  const toggleFlag = (id: string) => {
    if (id === 'maintenance_mode') setMaintenanceMode((v) => !v);
    setFlags((prev) => prev.map((f) => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const featuresByCategory = {
    feature:      flags.filter((f) => f.category === 'feature'),
    experimental: flags.filter((f) => f.category === 'experimental'),
    maintenance:  flags.filter((f) => f.category === 'maintenance'),
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="min-w-0 flex-1 text-right">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-right">הגדרות מערכת</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 text-right">דגלי פיצ׳רים, מצב תחזוקה, מגבלות קצב, הגדרות אימייל ומפתחות API.</p>
        </div>
        <button type="button" onClick={handleSave}
          className={`${btn.primary} ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
          {saved ? '✓ נשמר!' : 'שמור הכל'}
        </button>
      </div>

      {/* Maintenance banner */}
      {maintenanceMode && (
        <div className="flex items-center gap-3 flex-row-reverse rounded-xl bg-amber-400/10 border border-amber-500/30 px-5 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1 text-right">
            <p className="text-sm font-semibold text-amber-300">מצב תחזוקה פעיל</p>
            <p className="text-xs text-amber-400/70 mt-0.5">המשתמשים רואים הודעת תחזוקה כעת</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Feature flags */}
        <SettingsCard title="דגלי פיצ׳רים" icon={Flag}>
          <div className="space-y-1">
            {Object.entries(featuresByCategory).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 mt-3 first:mt-0">
                  {cat === 'feature' ? 'פעיל' : cat === 'experimental' ? 'ניסיוני' : 'תחזוקה'}
                </p>
                {items.map((flag) => (
                  <div key={flag.id} className="flex items-center gap-3 py-2 flex-row-reverse border-b border-slate-800 last:border-0">
                    <Toggle checked={flag.enabled} onChange={() => toggleFlag(flag.id)} size="sm" />
                    <div className="flex-1 text-right">
                      <p className="text-sm text-slate-200">{flag.label}</p>
                      <p className="text-[11px] text-slate-500">{flag.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Maintenance message */}
          {maintenanceMode && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <label className={inputLabel}>הודעת תחזוקה</label>
              <textarea value={maintenanceMsg} onChange={(e) => setMaintenanceMsg(e.target.value)} rows={2} dir="rtl"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 resize-none" />
            </div>
          )}
        </SettingsCard>

        {/* Rate limits */}
        <SettingsCard title="מגבלות קצב" icon={Activity}>
          <div className="space-y-4">
            {[
              { label: 'בקשות API לדקה (לכל לקוח)', key: 'apiRequestsPerMin' as const, min: 10, max: 1000 },
              { label: 'קריאות AI ליום (לכל לקוח)', key: 'aiCallsPerDay' as const, min: 50, max: 5000 },
              { label: 'Webhook timeout (ms)', key: 'webhookTimeoutMs' as const, min: 1000, max: 30000 },
            ].map(({ label, key, min, max }) => (
              <div key={key} className="text-right">
                <div className="flex items-center justify-between flex-row-reverse mb-1.5">
                  <label className={inputLabel}>{label}</label>
                  <span className="text-sm font-bold text-indigo-300 tabular-nums">{rateLimits[key].toLocaleString()}</span>
                </div>
                <input type="range" min={min} max={max} step={min} value={rateLimits[key]}
                  onChange={(e) => setRateLimits((r) => ({ ...r, [key]: Number(e.target.value) }))}
                  className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-indigo-500 cursor-pointer" />
              </div>
            ))}
          </div>
        </SettingsCard>

        {/* Email config */}
        <SettingsCard title="הגדרות אימייל (SMTP)" icon={Mail}>
          <div className="space-y-3">
            {[
              { label: 'SMTP Host', key: 'smtpHost' as const },
              { label: 'SMTP Port', key: 'smtpPort' as const },
              { label: 'From Email', key: 'fromEmail' as const },
              { label: 'Reply-To', key: 'replyTo' as const },
            ].map(({ label, key }) => (
              <div key={key} className="text-right">
                <label className={inputLabel}>{label}</label>
                <input type="text" value={emailConfig[key]} onChange={(e) => setEmailConfig((c) => ({ ...c, [key]: e.target.value }))}
                  className={input} />
              </div>
            ))}
            <button type="button" onClick={() => alert('טסט אימייל נשלח (מוק)')}
              className={`${btn.secondary} w-full flex-row-reverse`}>
              <Mail className="h-4 w-4" />שלח אימייל בדיקה
            </button>
          </div>
        </SettingsCard>

        {/* API keys */}
        <SettingsCard title="מפתחות API" icon={Key}>
          <div className="space-y-1 -mx-1">
            <ApiKeyRow label="OpenAI API Key" value="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
            <ApiKeyRow label="Supabase Service Key" value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxx" />
            <ApiKeyRow label="Webhook Secret" value="whsec_abcdefghijklmnopqrstuvwxyz123456" />
          </div>
          <div className="mt-4 flex gap-2 flex-row-reverse">
            <button type="button" onClick={() => alert('סיבוב מפתחות — ידרוש אישור (מוק)')}
              className={`${btn.secondary} flex-row-reverse`}>
              <RefreshCw className="h-3.5 w-3.5" />סובב מפתחות
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 flex-row-reverse">
            <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>המפתחות מוצגים בצורה מוסתרת ולא נשמרים בצד הלקוח</span>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
