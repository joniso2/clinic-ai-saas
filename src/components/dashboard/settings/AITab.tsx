'use client';

import { useState } from 'react';
import { BrainCircuit, MessageSquare, Ruler, Clock, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ClinicSettings } from '@/services/settings.service';

type Tone = 'formal' | 'friendly' | 'professional';
type Length = 'brief' | 'standard' | 'detailed';

const TONES: { value: Tone; label: string; description: string }[] = [
  { value: 'formal',       label: 'Formal',       description: 'Polished, clinical language.' },
  { value: 'professional', label: 'Professional',  description: 'Balanced, authoritative.' },
  { value: 'friendly',     label: 'Friendly',      description: 'Warm, personable, casual.' },
];

const LENGTHS: { value: Length; label: string; description: string }[] = [
  { value: 'brief',    label: 'Brief',    description: '1–2 sentences max.' },
  { value: 'standard', label: 'Standard', description: '2–4 sentences, focused.' },
  { value: 'detailed', label: 'Detailed', description: 'Thorough with context.' },
];

function OptionCard<T extends string>({
  value,
  selected,
  label,
  description,
  onSelect,
}: {
  value: T;
  selected: boolean;
  label: string;
  description: string;
  onSelect: (v: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex-1 rounded-xl border px-4 py-3.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 ${
        selected
          ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
      }`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className={`mt-0.5 text-xs ${selected ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>{description}</p>
    </button>
  );
}

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

export function AITab({ settings }: { settings: ClinicSettings }) {
  const [tone, setTone] = useState<Tone>(settings.ai_tone ?? 'professional');
  const [length, setLength] = useState<Length>(settings.ai_response_length ?? 'standard');
  const [strictHours, setStrictHours] = useState(settings.strict_hours_enforcement ?? true);
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
          ai_tone:                  tone,
          ai_response_length:       length,
          strict_hours_enforcement: strictHours,
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
      {/* Tone */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Conversation tone</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Controls the personality of the AI receptionist.</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex flex-wrap gap-3">
            {TONES.map((t) => (
              <OptionCard key={t.value} value={t.value} selected={tone === t.value} label={t.label} description={t.description} onSelect={(v) => { setTone(v); change(); }} />
            ))}
          </div>
        </div>
      </div>

      {/* Response length */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
            <Ruler className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Response length</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">How verbose the AI should be in patient conversations.</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex flex-wrap gap-3">
            {LENGTHS.map((l) => (
              <OptionCard key={l.value} value={l.value} selected={length === l.value} label={l.label} description={l.description} onSelect={(v) => { setLength(v); change(); }} />
            ))}
          </div>
        </div>
      </div>

      {/* Strict hours */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Clinic hours enforcement</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">When enabled, the AI strictly refuses bookings outside working hours.</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/20 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Strict hours mode</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {strictHours
                  ? 'AI will automatically decline requests outside clinic hours.'
                  : 'AI will acknowledge requests outside hours and suggest staff follow-up.'}
              </p>
            </div>
            <Toggle enabled={strictHours} onChange={(v) => { setStrictHours(v); change(); }} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <BrainCircuit className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Active configuration</p>
        </div>
        <p className="text-sm text-indigo-800 dark:text-indigo-300">
          Tone: <span className="font-semibold capitalize">{tone}</span> · Length: <span className="font-semibold capitalize">{length}</span> · Hours: <span className="font-semibold">{strictHours ? 'Strict' : 'Flexible'}</span>
        </p>
        <p className="mt-1 text-xs text-indigo-600/70 dark:text-indigo-400/70">Changes take effect on the next Discord message after saving.</p>
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
