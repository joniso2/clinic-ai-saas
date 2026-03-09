'use client';

import { useState } from 'react';
import { Zap, Phone, UserPlus, Clock, CheckCircle, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ClinicSettings } from '@/services/settings.service';

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 ${enabled ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-600'}`}
      aria-pressed={enabled}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-slate-950 shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function RuleRow({
  icon: Icon,
  title,
  description,
  enabled,
  onChange,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-4 transition-colors ${enabled ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50' : 'border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-700/20'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${enabled ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
            {badge && (
              <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{badge}</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

export function AutomationTab({ settings }: { settings: ClinicSettings }) {
  const [requirePhone, setRequirePhone] = useState(settings.require_phone_before_booking ?? true);
  const [autoCreate, setAutoCreate] = useState(settings.auto_create_lead_on_first_message ?? false);
  const [slaMinutes, setSlaMinutes] = useState(settings.sla_target_minutes ?? 60);
  const [autoMarkContacted, setAutoMarkContacted] = useState(settings.auto_mark_contacted ?? false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  function change() { setStatus('idle'); }

  async function handleSave() {
    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          require_phone_before_booking:      requirePhone,
          auto_create_lead_on_first_message: autoCreate,
          sla_target_minutes:                slaMinutes,
          auto_mark_contacted:               autoMarkContacted,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Rules */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Lead & booking rules</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Control how the AI handles leads and bookings automatically.</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-3">
          <RuleRow
            icon={Phone}
            title="Require phone before booking"
            description="Block appointment creation unless the patient provides a phone number."
            badge="Recommended"
            enabled={requirePhone}
            onChange={(v) => { setRequirePhone(v); change(); }}
          />
          <RuleRow
            icon={UserPlus}
            title="Auto-create lead on first message"
            description="Create a lead record immediately on the first Discord message, even before a phone number is collected."
            enabled={autoCreate}
            onChange={(v) => { setAutoCreate(v); change(); }}
          />
          <RuleRow
            icon={CheckCircle}
            title="Auto-mark as contacted"
            description="Set new leads to Contacted status automatically when created via Discord."
            enabled={autoMarkContacted}
            onChange={(v) => { setAutoMarkContacted(v); change(); }}
          />
        </div>
      </div>

      {/* SLA target */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">SLA target</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Target response time for all new leads. Overrides urgency-based SLA calculation.</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={5}
              max={1440}
              step={5}
              value={slaMinutes}
              onChange={(e) => { setSlaMinutes(parseInt(e.target.value, 10)); change(); }}
              className="flex-1 accent-slate-900 dark:accent-slate-100"
            />
            <div className="w-32 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {slaMinutes < 60
                  ? `${slaMinutes} min`
                  : `${(slaMinutes / 60).toFixed(slaMinutes % 60 === 0 ? 0 : 1)} hr`}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>5 min (urgent)</span>
            <span>24 hr (standard)</span>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {status === 'success' && <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
        {status === 'error' && <span className="flex items-center gap-1.5 text-sm text-red-500 dark:text-red-400"><AlertCircle className="h-4 w-4" /> Failed to save</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
