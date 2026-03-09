'use client';

/**
 * Section — AI Control Center
 * Per-clinic AI provider/model (ai_models table) + global mock config, test console, cost monitor.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, ChevronDown, Send, Cpu, DollarSign, Clock, Zap, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { btn, input, inputLabel } from '@/lib/ui-classes';
import { AI_MODELS, DEFAULT_AI_CONFIG, getMockPromptHistory } from '@/services/mock-ai.service';
import type { GlobalAIConfig } from '@/services/mock-ai.service';

const AI_PROVIDERS = [{ id: 'google', label: 'Google Gemini (מומלץ)', defaultModel: 'gemini-2.5-flash' }, { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini' }, { id: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-haiku' }] as const;
const PROVIDER_MODELS: Record<string, string[]> = {
  google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  anthropic: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'],
};

// ─── Slider ───────────────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, onChange, format,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="text-right">
      <div className="flex items-center justify-between flex-row-reverse mb-1.5">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        <span className="text-sm font-semibold text-indigo-300 tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-indigo-500 cursor-pointer" />
      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 flex-row-reverse">
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between flex-row-reverse py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-slate-200 shadow transition-all ${checked ? 'end-0.5' : 'start-0.5'}`} />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AIControlSection() {
  const [config, setConfig] = useState<GlobalAIConfig>({ ...DEFAULT_AI_CONFIG });
  const [saved, setSaved] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [clinics, setClinics] = useState<{ id: string; name: string | null }[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [aiPerClinic, setAiPerClinic] = useState<{ provider: string; model: string; temperature: number; max_tokens: number }>({ provider: 'google', model: 'gemini-2.5-flash', temperature: 0.7, max_tokens: 2048 });
  const [aiSaveStatus, setAiSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [clinicStatuses, setClinicStatuses] = useState<{ clinic_id: string; clinic_name: string | null; provider: string; model: string; status: 'up' | 'down' }[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchClinics = useCallback(async () => {
    const res = await fetch('/api/super-admin/clinics');
    const d = await res.json().catch(() => ({}));
    const list = d.clinics ?? [];
    setClinics(list);
    if (list.length && !selectedClinicId) setSelectedClinicId(list[0].id);
  }, [selectedClinicId]);

  const fetchAiModels = useCallback(async () => {
    if (!selectedClinicId) return;
    const res = await fetch(`/api/super-admin/ai-models?clinic_id=${encodeURIComponent(selectedClinicId)}`);
    const d = await res.json().catch(() => ({}));
    setAiPerClinic({ provider: d.provider ?? 'google', model: d.model ?? 'gemini-2.5-flash', temperature: Number(d.temperature) ?? 0.7, max_tokens: Number(d.max_tokens) ?? 2048 });
  }, [selectedClinicId]);

  const fetchClinicStatuses = useCallback(async () => {
    setStatusLoading(true);
    const res = await fetch('/api/super-admin/ai-models/status');
    const d = await res.json().catch(() => ({}));
    setClinicStatuses(d.clinics ?? []);
    setStatusLoading(false);
  }, []);

  useEffect(() => { fetchClinics(); }, []);
  useEffect(() => { fetchAiModels(); }, [fetchAiModels]);
  useEffect(() => { fetchClinicStatuses(); }, [fetchClinicStatuses]);

  const saveAiPerClinic = async () => {
    if (!selectedClinicId) return;
    setAiSaveStatus('saving');
    const res = await fetch('/api/super-admin/ai-models', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clinic_id: selectedClinicId, ...aiPerClinic }) });
    if (!res.ok) { setAiSaveStatus('idle'); return; }
    setAiSaveStatus('saved');
    fetchClinicStatuses();
    fetchAiModels();
    setTimeout(() => setAiSaveStatus('idle'), 2000);
  };

  const history = getMockPromptHistory();
  const selectedModel = AI_MODELS.find((m) => m.id === config.globalModel) ?? AI_MODELS[0];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!testInput.trim()) return;
    setTesting(true);
    setTestOutput('');
    // Simulate streaming response
    await new Promise((r) => setTimeout(r, 800));
    const mockResponse = `[${selectedModel.label}] שלום! קיבלתי את ההודעה שלך: "${testInput.slice(0, 40)}${testInput.length > 40 ? '...' : ''}". זוהי תגובת בדיקה מדומה מה-test console.`;
    setTestOutput(mockResponse);
    setTesting(false);
  };

  const totalCost = history.reduce((s, e) => s + e.costUsd, 0);
  const totalTokens = history.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0);
  const avgLatency = Math.round(history.reduce((s, e) => s + e.durationMs, 0) / history.length);

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="text-right">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-right">מרכז שליטה AI</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 text-right">מודל לפי קליניקה (OpenAI, Google, Anthropic), פרמטרים, test console.</p>
      </div>

      {/* Clinic → LLM status (which clinic uses which model, and if API key is set) */}
      <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between flex-row-reverse mb-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-right">סטטוס LLM לפי קליניקה (בוט דיסקורד)</h3>
          <button type="button" onClick={fetchClinicStatuses} disabled={statusLoading} className={`${btn.icon} disabled:opacity-50`} title="רענן">
            <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 text-right">איזה קליניקה על איזה מודל כרגע, והאם המפתח של הספק מוגדר (ירוק = הבוט יעבוד, אדום = חסר API key ב-Railway / .env).</p>
        {statusLoading ? (
          <p className="text-sm text-slate-500 text-right py-4">טוען…</p>
        ) : clinicStatuses.length === 0 ? (
          <p className="text-sm text-slate-500 text-right py-4">אין קליניקות.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="py-2 px-3 font-medium text-slate-400">קליניקה</th>
                  <th className="py-2 px-3 font-medium text-slate-400">ספק</th>
                  <th className="py-2 px-3 font-medium text-slate-400">מודל</th>
                  <th className="py-2 px-3 font-medium text-slate-400">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {clinicStatuses.map((row) => (
                  <tr key={row.clinic_id} className="border-b border-slate-800">
                    <td className="py-2.5 px-3 text-slate-200">{row.clinic_name ?? row.clinic_id}</td>
                    <td className="py-2.5 px-3 text-slate-300">{row.provider}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{row.model}</td>
                    <td className="py-2.5 px-3">
                      {row.status === 'up' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="h-4 w-4" /> Up
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <XCircle className="h-4 w-4" /> Down (add API key)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-clinic AI (ai_models) */}
      {clinics.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 text-right">מודל AI לפי קליניקה</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`${inputLabel} text-right`}>קליניקה</label>
              <select value={selectedClinicId} onChange={(e) => setSelectedClinicId(e.target.value)} className={`${input} text-right`}>
                {clinics.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
              </select>
            </div>
            <div>
              <label className={`${inputLabel} text-right`}>ספק</label>
              <select value={aiPerClinic.provider} onChange={(e) => setAiPerClinic((a) => ({ ...a, provider: e.target.value, model: PROVIDER_MODELS[e.target.value]?.[0] ?? a.model }))} className={`${input} text-right`}>
                {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`${inputLabel} text-right`}>מודל</label>
              <select value={aiPerClinic.model} onChange={(e) => setAiPerClinic((a) => ({ ...a, model: e.target.value }))} className={`${input} text-right`}>
                {(PROVIDER_MODELS[aiPerClinic.provider] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className={`${inputLabel} text-right`}>טמפרטורה</label>
                <input type="number" min={0} max={2} step={0.1} value={aiPerClinic.temperature} onChange={(e) => setAiPerClinic((a) => ({ ...a, temperature: Number(e.target.value) }))} className={`${input} text-right`} />
              </div>
              <div className="flex-1">
                <label className={`${inputLabel} text-right`}>מקס טוקנים</label>
                <input type="number" min={100} max={128000} value={aiPerClinic.max_tokens} onChange={(e) => setAiPerClinic((a) => ({ ...a, max_tokens: Number(e.target.value) }))} className={`${input} text-right`} />
              </div>
            </div>
          </div>
          <button type="button" onClick={saveAiPerClinic} disabled={aiSaveStatus === 'saving'} className={btn.primary}>
            {aiSaveStatus === 'saving' ? 'שומר…' : aiSaveStatus === 'saved' ? '✓ נשמר' : 'שמור הגדרות קליניקה'}
          </button>
        </div>
      )}

      {/* Cost monitor strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'עלות היסטורית', value: `$${totalCost.toFixed(4)}`, icon: DollarSign, color: 'text-emerald-400' },
          { label: 'טוקנים', value: totalTokens.toLocaleString('he-IL'), icon: Cpu, color: 'text-indigo-400' },
          { label: 'שיחות', value: String(history.length), icon: Brain, color: 'text-violet-400' },
          { label: 'זמן תגובה ממוצע', value: `${avgLatency}ms`, icon: Clock, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-right">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Config panel */}
        <div className="space-y-5">
          <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 text-right">הגדרות מודל גלובלי</h3>

            {/* Model selector */}
            <div className="mb-4 text-right">
              <label className={inputLabel}>מודל ברירת מחדל</label>
              <div className="relative">
                <select value={config.globalModel} onChange={(e) => setConfig((c) => ({ ...c, globalModel: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800 ps-4 pe-10 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">
                  {AI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.provider} {m.recommended ? '(מומלץ)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              </div>
              <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 text-right">
                <p>חלון הקשר: {selectedModel.contextWindow.toLocaleString()} טוקנים</p>
                <p>עלות: ${selectedModel.costPer1kInput}/1k input · ${selectedModel.costPer1kOutput}/1k output</p>
              </div>
            </div>

            <div className="space-y-5 border-t border-slate-800 pt-4">
              <Slider label="טמפרטורה" value={config.temperature} min={0} max={2} step={0.1}
                onChange={(v) => setConfig((c) => ({ ...c, temperature: v }))}
                format={(v) => v.toFixed(1)} />
              <Slider label="מקסימום טוקנים" value={config.maxTokens} min={100} max={4000} step={50}
                onChange={(v) => setConfig((c) => ({ ...c, maxTokens: v }))}
                format={(v) => v.toLocaleString()} />
            </div>

            <div className="border-t border-slate-800 pt-4 mt-4 space-y-1">
              <Toggle label="סינון בטיחות" checked={config.safetyFilter} onChange={(v) => setConfig((c) => ({ ...c, safetyFilter: v }))} />
              <Toggle label="Streaming" checked={config.streamingEnabled} onChange={(v) => setConfig((c) => ({ ...c, streamingEnabled: v }))} />
            </div>
          </div>

          {/* System prompt */}
          <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 text-right">System Prompt גלובלי</h3>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
              rows={5}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none text-right"
              dir="rtl"
            />
            <p className="text-[11px] text-slate-500 text-right mt-1">{config.systemPrompt.length} תווים</p>
          </div>

          <button type="button" onClick={handleSave}
            className={`${saved ? btn.primary : btn.primary} w-full ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
            {saved ? '✓ נשמר!' : 'שמור הגדרות'}
          </button>
        </div>

        {/* Test console */}
        <div className="space-y-5">
          <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 text-right">Test Console</h3>
            <div className="flex-1 min-h-[140px] rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 mb-3 text-sm text-right overflow-y-auto">
              {testOutput ? (
                <div className="space-y-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500">משתמש</span>
                    <p className="text-slate-300 bg-slate-700 rounded-lg px-3 py-2 mt-1 inline-block">{testInput}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-indigo-400">AI ({selectedModel.label})</span>
                    <p className="text-slate-100 bg-indigo-950/60 border border-indigo-500/20 rounded-lg px-3 py-2 mt-1">{testOutput}</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-right pt-6">הקלד הודעה ולחץ שלח לבדיקת תגובת ה-AI</p>
              )}
            </div>
            <div className="flex gap-2 flex-row-reverse">
              <textarea
                ref={textareaRef}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTest(); } }}
                placeholder="הקלד הודעת בדיקה..."
                rows={2}
                dir="rtl"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none text-right"
              />
              <button type="button" onClick={handleTest} disabled={testing || !testInput.trim()}
                className={`${btn.primary} self-end`}>
                {testing ? <Zap className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Prompt history */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <button type="button" onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between flex-row-reverse px-5 py-3.5 hover:bg-slate-800/50 transition-colors">
              <span className="text-sm font-semibold text-slate-200">היסטוריית פרומפטים</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{history.length} רשומות</span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {historyOpen && (
              <div className="border-t border-slate-800">
                {history.map((entry) => (
                  <div key={entry.id} className="border-b border-slate-800/60 px-5 py-3 hover:bg-slate-800/30 text-right">
                    <div className="flex items-center justify-between flex-row-reverse mb-1">
                      <span className="text-xs font-medium text-slate-300">{entry.tenantName}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{new Date(entry.timestamp).toLocaleTimeString('he-IL')}</span>
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">{entry.model}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{entry.userMessage}</p>
                    <div className="flex gap-3 mt-1 text-[11px] text-slate-600 flex-row-reverse">
                      <span>{entry.inputTokens + entry.outputTokens} tokens</span>
                      <span>${entry.costUsd.toFixed(5)}</span>
                      <span>{entry.durationMs}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
