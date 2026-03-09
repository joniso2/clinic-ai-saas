'use client';

import { useEffect } from 'react';
import { Phone, AlertTriangle, Clock, Sparkles } from 'lucide-react';
import type { Lead } from '@/types/leads';
import { formatDateTime, URGENCY_STYLES, PRIORITY_LEVEL_STYLES } from './lead-drawer-helpers';

// ─── SLA Deadline ─────────────────────────────────────────────────────────────

export function SlaDeadline({ value }: { value: string }) {
  const deadline = new Date(value);
  const passed = deadline < new Date();
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
      passed
        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50'
        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
    }`}>
      {passed && <AlertTriangle className="h-3 w-3 shrink-0" />}
      {!passed && <Clock className="h-3 w-3 shrink-0" />}
      <span>{passed ? 'באיחור · ' : ''}{formatDateTime(value)}</span>
    </div>
  );
}

// ─── Phone Contact Modal ─────────────────────────────────────────────────────

export function PhoneContactModal({ phone, onClose }: { phone: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const waNumber = phone.replace(/\D/g, '').replace(/^0/, '972');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xs rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-950 shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-right" dir="rtl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">יצירת קשר</h2>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition flex-row-reverse justify-end text-right"
          >
            <Phone className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
            שיחה
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition flex-row-reverse justify-end text-right"
          >
            <svg className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            וואטסאפ
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── AI Intelligence Section ─────────────────────────────────────────────────

export function AIIntelligenceSection({ lead }: { lead: Lead }) {
  const hasAny =
    lead.conversation_summary ||
    lead.urgency_level ||
    lead.priority_level ||
    lead.sla_deadline ||
    lead.follow_up_recommended_at ||
    lead.callback_recommendation;

  if (!hasAny) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3">ניתוח AI</p>
      <div className="border border-purple-200/60 dark:border-purple-800/40 bg-gradient-to-br from-purple-50 to-indigo-50/40 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl p-4">
        {/* AI section header */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">ניתוח AI</p>
        </div>

        <div className="space-y-4">

          {/* Conversation Summary */}
          {lead.conversation_summary && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1.5 text-right">סיכום שיחה</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-right">
                {lead.conversation_summary}
              </p>
            </div>
          )}

          {/* Metrics row */}
          {(lead.urgency_level || lead.priority_level) && (
            <div className="flex flex-wrap gap-2">
              {lead.urgency_level && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1 text-right">דחיפות</p>
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${URGENCY_STYLES[lead.urgency_level] ?? ''}`}>
                    {lead.urgency_level}
                  </span>
                </div>
              )}
              {lead.priority_level && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1 text-right">עדיפות</p>
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${PRIORITY_LEVEL_STYLES[lead.priority_level] ?? ''}`}>
                    {lead.priority_level}
                  </span>
                </div>
              )}
            </div>
          )}

          {(lead.sla_deadline || lead.follow_up_recommended_at || lead.callback_recommendation) &&
           (lead.conversation_summary || lead.urgency_level || lead.priority_level) && (
            <div className="border-t border-purple-200/50 dark:border-purple-800/30" />
          )}

          {/* Action intelligence */}
          <div className="space-y-3">
            {lead.sla_deadline && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1.5 text-right">דדליין SLA</p>
                <SlaDeadline value={lead.sla_deadline} />
              </div>
            )}
            {lead.follow_up_recommended_at && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-1.5 text-right">מעקב מומלץ</p>
                <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <Clock className="h-3 w-3 shrink-0" />
                  {formatDateTime(lead.follow_up_recommended_at)}
                </span>
              </div>
            )}
            {lead.callback_recommendation && (
              <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 px-3.5 py-3">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 text-right">המלצה להתקשרות</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed text-right">
                  {lead.callback_recommendation}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
