'use client';

/**
 * Section 6 — AI Control Center
 * Global model config, temperature/tokens, prompt history, test console, cost monitor.
 */

import { useState, useRef } from 'react';
import { Brain, ChevronDown, Send, Cpu, DollarSign, Clock, Zap } from 'lucide-react';
import { AI_MODELS, DEFAULT_AI_CONFIG, getMockPromptHistory } from '@/services/mock-ai.service';
import type { GlobalAIConfig } from '@/services/mock-ai.service';

// ─── Slider ───────────────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, onChange, format,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="text-right">
      <div className="flex items-center justify-between flex-row-reverse mb-1.5">
        <label className="text-xs font-medium text-zinc-400">{label}</label>
        <span className="text-sm font-semibold text-indigo-300 tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-indigo-500 cursor-pointer" />
      <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5 flex-row-reverse">
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
      <span className="text-sm text-zinc-300">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'right-0.5' : 'left-0.5'}`} />
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
        <h2 className="text-xl font-bold text-zinc-100">מרכז שליטה AI</h2>
        <p className="mt-0.5 text-sm text-zinc-400">בחירת מודל גלובלי, פרמטרים, היסטוריית פרומפטים ו-test console.</p>
      </div>

      {/* Cost monitor strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'עלות היסטורית', value: `$${totalCost.toFixed(4)}`, icon: DollarSign, color: 'text-emerald-400' },
          { label: 'טוקנים', value: totalTokens.toLocaleString('he-IL'), icon: Cpu, color: 'text-indigo-400' },
          { label: 'שיחות', value: String(history.length), icon: Brain, color: 'text-violet-400' },
          { label: 'זמן תגובה ממוצע', value: `${avgLatency}ms`, icon: Clock, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-right">
            <p className="text-[11px] text-zinc-400 mb-1">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Config panel */}
        <div className="space-y-5">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 text-right">הגדרות מודל גלובלי</h3>

            {/* Model selector */}
            <div className="mb-4 text-right">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">מודל ברירת מחדל</label>
              <div className="relative">
                <select value={config.globalModel} onChange={(e) => setConfig((c) => ({ ...c, globalModel: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-800 ps-4 pe-10 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500">
                  {AI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.provider} {m.recommended ? '(מומלץ)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              </div>
              <div className="mt-2 text-[11px] text-zinc-500 space-y-0.5 text-right">
                <p>חלון הקשר: {selectedModel.contextWindow.toLocaleString()} טוקנים</p>
                <p>עלות: ${selectedModel.costPer1kInput}/1k input · ${selectedModel.costPer1kOutput}/1k output</p>
              </div>
            </div>

            <div className="space-y-5 border-t border-zinc-800 pt-4">
              <Slider label="טמפרטורה" value={config.temperature} min={0} max={2} step={0.1}
                onChange={(v) => setConfig((c) => ({ ...c, temperature: v }))}
                format={(v) => v.toFixed(1)} />
              <Slider label="מקסימום טוקנים" value={config.maxTokens} min={100} max={4000} step={50}
                onChange={(v) => setConfig((c) => ({ ...c, maxTokens: v }))}
                format={(v) => v.toLocaleString()} />
            </div>

            <div className="border-t border-zinc-800 pt-4 mt-4 space-y-1">
              <Toggle label="סינון בטיחות" checked={config.safetyFilter} onChange={(v) => setConfig((c) => ({ ...c, safetyFilter: v }))} />
              <Toggle label="Streaming" checked={config.streamingEnabled} onChange={(v) => setConfig((c) => ({ ...c, streamingEnabled: v }))} />
            </div>
          </div>

          {/* System prompt */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-3 text-right">System Prompt גלובלי</h3>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
              rows={5}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none text-right"
              dir="rtl"
            />
            <p className="text-[11px] text-zinc-600 text-right mt-1">{config.systemPrompt.length} תווים</p>
          </div>

          <button type="button" onClick={handleSave}
            className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
            {saved ? '✓ נשמר!' : 'שמור הגדרות'}
          </button>
        </div>

        {/* Test console */}
        <div className="space-y-5">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 text-right">Test Console</h3>
            <div className="flex-1 min-h-[140px] rounded-xl bg-zinc-800 border border-zinc-700 p-4 mb-3 text-sm text-right overflow-y-auto">
              {testOutput ? (
                <div className="space-y-3">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500">משתמש</span>
                    <p className="text-zinc-300 bg-zinc-700 rounded-lg px-3 py-2 mt-1 inline-block">{testInput}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-indigo-400">AI ({selectedModel.label})</span>
                    <p className="text-zinc-100 bg-indigo-950/60 border border-indigo-500/20 rounded-lg px-3 py-2 mt-1">{testOutput}</p>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-600 text-center pt-6">הקלד הודעה ולחץ שלח לבדיקת תגובת ה-AI</p>
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
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 resize-none text-right"
              />
              <button type="button" onClick={handleTest} disabled={testing || !testInput.trim()}
                className="self-end rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 disabled:opacity-50 transition-colors">
                {testing ? <Zap className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Prompt history */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <button type="button" onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between flex-row-reverse px-5 py-3.5 hover:bg-zinc-800/50 transition-colors">
              <span className="text-sm font-semibold text-zinc-200">היסטוריית פרומפטים</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{history.length} רשומות</span>
                <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {historyOpen && (
              <div className="border-t border-zinc-800">
                {history.map((entry) => (
                  <div key={entry.id} className="border-b border-zinc-800/60 px-5 py-3 hover:bg-zinc-800/30 text-right">
                    <div className="flex items-center justify-between flex-row-reverse mb-1">
                      <span className="text-xs font-medium text-zinc-300">{entry.tenantName}</span>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span>{new Date(entry.timestamp).toLocaleTimeString('he-IL')}</span>
                        <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded">{entry.model}</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{entry.userMessage}</p>
                    <div className="flex gap-3 mt-1 text-[11px] text-zinc-600 flex-row-reverse">
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
