'use client';

import { X, Phone, MessageCircle, ArrowRight, Trash2 } from 'lucide-react';
import type { Lead } from '@/types/leads';
import { formatCurrencyILS, formatPhoneILS } from '@/lib/hebrew';
import {
  getAvatarColor,
  getInitials,
  formatDate,
  getSourceBadgeStyle,
} from './customers-helpers';

// ─── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string | null | undefined }) {
  const s = getSourceBadgeStyle(source);
  if (!s) return <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

// ─── Lead Drawer (fallback mode) ──────────────────────────────────────────────

export function LeadDrawer({ lead, onClose, onWhatsApp, onBackToLeads, onDelete }: {
  lead: Lead;
  onClose: () => void;
  onWhatsApp: () => void;
  onBackToLeads: () => void;
  onDelete: () => void;
}) {
  const avatarColor = getAvatarColor(lead.id);
  const value = lead.estimated_deal_value ?? 0;

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-[420px] bg-white dark:bg-slate-950 border-s border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto flex flex-col"
        dir="rtl"
        style={{ animation: 'slideInFromRight 220ms ease-out forwards' }}
      >
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${avatarColor} text-white text-sm font-bold shrink-0`}>
              {getInitials(lead.full_name)}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-tight">{lead.full_name || '—'}</h2>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mt-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">הושלם</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-label="סגור">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          <section>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">פרטי קשר</p>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <a href={lead.phone ? `tel:${lead.phone}` : '#'} dir="ltr" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  {formatPhoneILS(lead.phone)}
                </a>
              </div>
              {lead.source && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">מקור</span>
                  <SourceBadge source={lead.source} />
                </div>
              )}
            </div>
          </section>

          {value > 0 && (
            <section>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">שווי</p>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-transparent border border-emerald-200/60 dark:border-emerald-800/30 p-4">
                <p className="text-[2rem] font-bold text-slate-900 dark:text-slate-50 tabular-nums leading-none">{formatCurrencyILS(value)}</p>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">תאריך: {formatDate(lead.created_at)}</p>
              </div>
            </section>
          )}

          {/* Billing: only for customers (patients), not for leads */}
          <section>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">קבלות וחשבוניות</p>
            <div className="py-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-sm text-slate-500 dark:text-slate-400">חיוב זמין רק לאחר שהליד הופך ללקוח</p>
            </div>
          </section>

          <section className="pt-1">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">פעולות</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={onWhatsApp}
                className="flex items-center justify-center gap-2 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition"
              >
                <MessageCircle className="h-4 w-4" /> וואטסאפ
              </button>
              <button
                type="button"
                onClick={onBackToLeads}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-3 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition"
              >
                <ArrowRight className="h-4 w-4" /> ללידים
              </button>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-400 dark:text-slate-500 hover:border-red-200 dark:hover:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition"
            >
              <Trash2 className="h-4 w-4" /> מחק ליד
            </button>
          </section>
        </div>
      </div>
      <style>{`@keyframes slideInFromRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  </>
  );
}
