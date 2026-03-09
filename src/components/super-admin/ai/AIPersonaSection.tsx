'use client';

/**
 * AI Persona & Behavior — Super Admin panel
 *
 * Split-view (Intercom-style):
 *   Right (60%) — Configuration form, RTL Hebrew
 *   Left  (40%) — Sticky dark "Live Prompt Preview" that updates in real-time
 *
 * Saves to clinic_settings via /api/super-admin/ai-persona (GET + PATCH).
 * No existing AI Models, Integrations, or Services/Pricing features are modified.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HeartPulse, Scale, Briefcase,
  MessageSquare, Zap, BookOpen,
  Save, RefreshCw, Bot, Eye,
  CheckCircle2,
} from 'lucide-react';

import {
  buildBasePrompt,
  getIndustryRules,
  getStrategyRules,
  getToneAndLengthSection,
  getClinicContextSection,
  getCustomOverrideSection,
  type IndustryType,
  type ConversationStrategy,
} from '@/prompts/discord.prompt';

// ─── Types ────────────────────────────────────────────────────────────────────

type AiTone           = 'formal' | 'friendly' | 'professional';
type AiResponseLength = 'brief' | 'standard' | 'detailed';

interface AIPersonaForm {
  ai_tone: AiTone;
  ai_response_length: AiResponseLength;
  strict_hours_enforcement: boolean;
  business_description: string;
  industry_type: IndustryType;
  conversation_strategy: ConversationStrategy;
  custom_prompt_override: string;
}

const DEFAULT_FORM: AIPersonaForm = {
  ai_tone: 'professional',
  ai_response_length: 'standard',
  strict_hours_enforcement: true,
  business_description: '',
  industry_type: 'general_business',
  conversation_strategy: 'consultative',
  custom_prompt_override: '',
};

// ─── Preview segment ─────────────────────────────────────────────────────────

interface PreviewSegment {
  key: string;
  label: string;
  content: string;
  colorClass: string;
  bgClass: string;
}

function buildPreviewSegments(form: AIPersonaForm, clinicName: string): PreviewSegment[] {
  const label = clinicName ? `"${clinicName}"` : '"המרפאה"';
  return [
    {
      key: 'base',
      label: '// CORE RULES',
      content: buildBasePrompt(label),
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-500/5 border-blue-500/20',
    },
    {
      key: 'industry',
      label: '// INDUSTRY RULES',
      content: getIndustryRules(form.industry_type),
      colorClass: 'text-violet-400',
      bgClass: 'bg-violet-500/5 border-violet-500/20',
    },
    {
      key: 'strategy',
      label: '// STRATEGY RULES',
      content: getStrategyRules(form.conversation_strategy),
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/5 border-amber-500/20',
    },
    {
      key: 'tone',
      label: '// TONE & LENGTH',
      content: getToneAndLengthSection(form.ai_tone, form.ai_response_length),
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/5 border-emerald-500/20',
    },
    {
      key: 'context',
      label: '// CLINIC CONTEXT',
      content: getClinicContextSection(form.business_description || null, form.strict_hours_enforcement) || '(no description set)',
      colorClass: 'text-sky-400',
      bgClass: 'bg-sky-500/5 border-sky-500/20',
    },
    {
      key: 'pricing',
      label: '// PRICING (dynamic — injected from clinic services)',
      content: '[ price list injected server-side from clinic_services ]',
      colorClass: 'text-teal-400',
      bgClass: 'bg-teal-500/5 border-teal-500/20',
    },
    {
      key: 'custom',
      label: '// CUSTOM INSTRUCTIONS',
      content: form.custom_prompt_override.trim() || '(no custom instructions)',
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-500/5 border-orange-500/20',
    },
  ];
}

// ─── Radio card ───────────────────────────────────────────────────────────────

function RadioCard<T extends string>({
  value, selected, onSelect, icon: Icon, title, description,
}: {
  value: T;
  selected: boolean;
  onSelect: (v: T) => void;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={[
        'relative flex flex-col items-start gap-2 rounded-xl border p-4 text-right transition-all duration-150 w-full',
        'hover:border-indigo-500/60 hover:bg-indigo-500/5',
        selected
          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.4)]'
          : 'border-zinc-700 bg-zinc-900',
      ].join(' ')}
    >
      <div className={`rounded-lg p-2 ${selected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-400'} transition-colors`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className={`text-sm font-semibold ${selected ? 'text-zinc-100' : 'text-zinc-300'}`}>{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      {selected && (
        <span className="absolute top-3 start-3 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_6px_2px_rgba(99,102,241,0.5)]" />
      )}
    </button>
  );
}

// ─── Strategy toggle ──────────────────────────────────────────────────────────

function StrategyToggle<T extends string>({
  value, selected, onSelect, icon: Icon, label,
}: {
  value: T;
  selected: boolean;
  onSelect: (v: T) => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={[
        'flex items-center justify-center gap-2 flex-1 rounded-xl py-2.5 px-3 text-sm font-medium transition-all duration-150 border',
        selected
          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

// ─── Shared select ────────────────────────────────────────────────────────────

function FieldSelect<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 text-right appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIPersonaSection() {
  const [clinics, setClinics] = useState<{ id: string; name: string | null }[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedClinicName, setSelectedClinicName] = useState('');
  const [form, setForm] = useState<AIPersonaForm>({ ...DEFAULT_FORM });
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'loaded'>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchClinics = useCallback(async () => {
    const res = await fetch('/api/super-admin/clinics');
    const d = await res.json().catch(() => ({}));
    const list: { id: string; name: string | null }[] = d.clinics ?? [];
    setClinics(list);
    if (list.length && !selectedClinicId) {
      setSelectedClinicId(list[0].id);
      setSelectedClinicName(list[0].name ?? '');
    }
  }, [selectedClinicId]);

  const fetchPersona = useCallback(async (clinicId: string) => {
    if (!clinicId) return;
    setLoadStatus('loading');
    try {
      const res = await fetch(`/api/super-admin/ai-persona?clinic_id=${encodeURIComponent(clinicId)}`);
      const d = await res.json().catch(() => ({}));
      setForm({
        ai_tone:                  d.ai_tone                  ?? 'professional',
        ai_response_length:       d.ai_response_length       ?? 'standard',
        strict_hours_enforcement: d.strict_hours_enforcement ?? true,
        business_description:     d.business_description     ?? '',
        industry_type:            d.industry_type            ?? 'general_business',
        conversation_strategy:    d.conversation_strategy    ?? 'consultative',
        custom_prompt_override:   d.custom_prompt_override   ?? '',
      });
    } catch {
      showToast('שגיאה בטעינת הגדרות');
    } finally {
      setLoadStatus('loaded');
    }
  }, [showToast]);

  useEffect(() => { fetchClinics(); }, []);
  useEffect(() => {
    if (selectedClinicId) fetchPersona(selectedClinicId);
  }, [selectedClinicId, fetchPersona]);

  const handleClinicChange = (id: string) => {
    setSelectedClinicId(id);
    const clinic = clinics.find((c) => c.id === id);
    setSelectedClinicName(clinic?.name ?? '');
    setLoadStatus('idle');
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!selectedClinicId) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/super-admin/ai-persona', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: selectedClinicId,
          ...form,
          business_description:   form.business_description   || null,
          custom_prompt_override: form.custom_prompt_override || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'שגיאה');
      }
      setSaveStatus('saved');
      showToast('הגדרות AI נשמרו בהצלחה');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      setSaveStatus('error');
      showToast((e as Error).message);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const setField = <K extends keyof AIPersonaForm>(key: K, value: AIPersonaForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const previewSegments = useMemo(
    () => buildPreviewSegments(form, selectedClinicName),
    [form, selectedClinicName],
  );

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-row-reverse gap-4 flex-wrap">
        <div className="text-right">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">AI Persona &amp; Behavior</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            התאם את אישיות ה-AI, הסגנון, האסטרטגיה והוראות מותאמות אישית לכל קליניקה.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-row-reverse">
          <Bot className="h-6 w-6 text-indigo-400" />
        </div>
      </div>

      {/* Clinic selector */}
      {clinics.length > 0 && (
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-4 flex-row-reverse flex-wrap">
            <label className="text-xs font-medium text-zinc-400 shrink-0">קליניקה</label>
            <select
              value={selectedClinicId}
              onChange={(e) => handleClinicChange(e.target.value)}
              className="flex-1 min-w-[200px] rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 text-right"
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
              ))}
            </select>
            {loadStatus === 'loading' && (
              <RefreshCw className="h-4 w-4 text-zinc-500 animate-spin shrink-0" />
            )}
          </div>
        </div>
      )}

      {/* Main split-view grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* ── Right column: Configuration form (60%) ─────────────────────────── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Industry type */}
          <section className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="mb-4 text-right">
              <h3 className="text-sm font-semibold text-zinc-100">סוג עסק / תעשייה</h3>
              <p className="text-xs text-zinc-500 mt-0.5">בחר את ההקשר שבו פועלת הקליניקה — ה-AI יתאים את ההתנהגות בהתאם.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <RadioCard
                value="medical"
                selected={form.industry_type === 'medical'}
                onSelect={(v) => setField('industry_type', v)}
                icon={HeartPulse}
                title="רפואה / שיניים"
                description="טריאז' כאב, רגישות ופרטיות מטופל מובנים מראש"
              />
              <RadioCard
                value="legal"
                selected={form.industry_type === 'legal'}
                onSelect={(v) => setField('industry_type', v)}
                icon={Scale}
                title="שירותים משפטיים"
                description="חיסיון, ייעוץ לפני פרטי קשר, דחיפות עניינים משפטיים"
              />
              <RadioCard
                value="general_business"
                selected={form.industry_type === 'general_business'}
                onSelect={(v) => setField('industry_type', v)}
                icon={Briefcase}
                title="עסק כללי"
                description="הגדרות ברירת מחדל גמישות לכל סוג עסק"
              />
            </div>
          </section>

          {/* Conversation strategy */}
          <section className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="mb-4 text-right">
              <h3 className="text-sm font-semibold text-zinc-100">אסטרטגיית שיחה</h3>
              <p className="text-xs text-zinc-500 mt-0.5">כיצד ה-AI מוביל את השיחה לפעולה הבאה.</p>
            </div>
            <div className="flex gap-2 flex-row-reverse">
              <StrategyToggle
                value="consultative"
                selected={form.conversation_strategy === 'consultative'}
                onSelect={(v) => setField('conversation_strategy', v)}
                icon={MessageSquare}
                label="ייעוצי"
              />
              <StrategyToggle
                value="direct"
                selected={form.conversation_strategy === 'direct'}
                onSelect={(v) => setField('conversation_strategy', v)}
                icon={Zap}
                label="ישיר"
              />
              <StrategyToggle
                value="educational"
                selected={form.conversation_strategy === 'educational'}
                onSelect={(v) => setField('conversation_strategy', v)}
                icon={BookOpen}
                label="חינוכי"
              />
            </div>
            <div className="mt-3 rounded-lg bg-zinc-800/60 px-4 py-2.5 text-xs text-zinc-400 text-right leading-relaxed">
              {form.conversation_strategy === 'consultative' && 'ה-AI שואל שאלות הבהרה לפני שממליץ על הצעד הבא, ומתאים את עצמו לצרכי המטופל.'}
              {form.conversation_strategy === 'direct' && 'ה-AI מגיע לעניין מהר — אוסף שם וטלפון כבר בהודעה השנייה אם הכוונה ברורה.'}
              {form.conversation_strategy === 'educational' && 'ה-AI מסביר שירותים ותהליכים לפני שמבקש פרטי קשר, בונה אמון דרך ידע.'}
            </div>
          </section>

          {/* Tone & length */}
          <section className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-zinc-100 mb-4 text-right">טון ואורך תגובה</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldSelect
                label="טון"
                value={form.ai_tone}
                onChange={(v) => setField('ai_tone', v)}
                options={[
                  { value: 'professional', label: 'מקצועי (מאוזן)' },
                  { value: 'formal',       label: 'רשמי ומכובד' },
                  { value: 'friendly',     label: 'חם וידידותי' },
                ]}
              />
              <FieldSelect
                label="אורך תגובה"
                value={form.ai_response_length}
                onChange={(v) => setField('ai_response_length', v)}
                options={[
                  { value: 'standard', label: 'סטנדרטי (2–4 משפטים)' },
                  { value: 'brief',    label: 'קצר (1–2 משפטים)' },
                  { value: 'detailed', label: 'מפורט ומקיף' },
                ]}
              />
            </div>

            {/* Strict hours toggle */}
            <div className="flex items-center justify-between flex-row-reverse mt-4 pt-4 border-t border-zinc-800">
              <div className="text-right">
                <span className="text-sm text-zinc-300 font-medium">אכיפת שעות עבודה קפדנית</span>
                <p className="text-xs text-zinc-500 mt-0.5">כבוי = ה-AI מפנה ללא סירוב כשפונים מחוץ לשעות</p>
              </div>
              <button
                type="button"
                onClick={() => setField('strict_hours_enforcement', !form.strict_hours_enforcement)}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 ${
                  form.strict_hours_enforcement ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-zinc-200 shadow transition-all duration-200 ${
                    form.strict_hours_enforcement ? 'end-0.5' : 'start-0.5'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Business description */}
          <section className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1 text-right">תיאור העסק</h3>
            <p className="text-xs text-zinc-500 mb-3 text-right">תיאור קצר של הקליניקה, מומחיות ייחודית, ושירותים מרכזיים — ה-AI ישתמש בזה כהקשר.</p>
            <textarea
              value={form.business_description}
              onChange={(e) => setField('business_description', e.target.value)}
              rows={3}
              dir="rtl"
              placeholder="לדוגמה: מרפאת שיניים מתקדמת המתמחה בטיפולי ילדים ואורתודנטיה, פתוחה ראשון–שישי."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none text-right leading-relaxed"
            />
            <p className="text-[11px] text-zinc-600 mt-1 text-right">{form.business_description.length} תווים</p>
          </section>

          {/* Custom prompt override */}
          <section className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between flex-row-reverse mb-1 gap-2">
              <h3 className="text-sm font-semibold text-zinc-100 text-right">הוראות מותאמות אישית</h3>
              <span className="shrink-0 rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold px-2 py-0.5 border border-indigo-500/20">Advanced</span>
            </div>
            <p className="text-xs text-zinc-500 mb-3 text-right">הוראות נוספות שיתווספו בסוף ה-system prompt. משמשות לחריגות ספציפיות, מוצרים חדשים, או הנחיות עונתיות.</p>
            <textarea
              value={form.custom_prompt_override}
              onChange={(e) => setField('custom_prompt_override', e.target.value)}
              rows={4}
              dir="ltr"
              placeholder={`// Example: custom instructions\nAlways mention our new whitening promotion when price is asked.\nIf the patient mentions Dr. Cohen — note that he is available on Sundays only.`}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 resize-none font-mono leading-relaxed"
            />
            <p className="text-[11px] text-zinc-600 mt-1 text-right">{form.custom_prompt_override.length} תווים</p>
          </section>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving' || !selectedClinicId}
            className={[
              'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              saveStatus === 'saved'
                ? 'bg-emerald-600 text-white'
                : saveStatus === 'error'
                  ? 'bg-red-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white shadow-lg shadow-indigo-900/30',
            ].join(' ')}
          >
            {saveStatus === 'saving' ? (
              <><RefreshCw className="h-4 w-4 animate-spin" />שומר…</>
            ) : saveStatus === 'saved' ? (
              <><CheckCircle2 className="h-4 w-4" />נשמר בהצלחה!</>
            ) : (
              <><Save className="h-4 w-4" />שמור הגדרות AI</>
            )}
          </button>
        </div>

        {/* ── Left column: Live Preview (40%) ────────────────────────────────── */}
        <div className="xl:col-span-2">
          <div className="sticky top-6 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
            {/* Preview header */}
            <div className="flex items-center justify-between flex-row-reverse px-4 py-3 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2 flex-row-reverse">
                <Eye className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-semibold text-zinc-300">Live Prompt Preview</span>
              </div>
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
            </div>

            {/* Preview body */}
            <div className="bg-zinc-950 overflow-y-auto max-h-[calc(100vh-12rem)] p-4 space-y-3">
              {previewSegments.map((seg) => (
                <div
                  key={seg.key}
                  className={`rounded-lg border p-3 ${seg.bgClass}`}
                >
                  <p className={`text-[10px] font-mono font-bold mb-1.5 ${seg.colorClass}`}>
                    {seg.label}
                  </p>
                  <pre
                    className="text-[11px] text-zinc-400 whitespace-pre-wrap break-words font-mono leading-relaxed"
                    dir={seg.key === 'pricing' || seg.key === 'custom' ? 'ltr' : 'ltr'}
                  >
                    {seg.content.length > 400
                      ? seg.content.slice(0, 400) + '\n…(truncated for preview)'
                      : seg.content}
                  </pre>
                </div>
              ))}

              <div className="rounded-lg border border-zinc-800 p-3 bg-zinc-900/60">
                <p className="text-[10px] font-mono font-bold mb-1 text-zinc-600">// TOTAL SEGMENTS</p>
                <p className="text-[11px] font-mono text-zinc-600">
                  {previewSegments.length} segments assembled dynamically
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-[70] rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 px-5 py-2.5 text-sm font-medium shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
