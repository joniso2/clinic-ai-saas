'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Phone, MessageCircle, Sparkles } from 'lucide-react';
import type { Appointment } from '@/types/appointments';
import type { Lead } from '@/types/leads';
import { formatTime } from '@/lib/calendar/time.utils';
import { TYPE_PILL } from '@/lib/calendar/calendar.utils';

export type DayModalProps = {
  day: number;
  month: number;
  year: number;
  appointments: Appointment[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAdd: (day: number) => void;
  onViewLead: (lead: Lead) => void;
};

export function DayModal({
  day, month, year, appointments, onClose, onDelete, onAdd, onViewLead,
}: DayModalProps) {
  const [leadCache, setLeadCache] = useState<Record<string, Lead>>({});

  useEffect(() => {
    const ids = appointments.map((a) => a.lead_id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    Promise.all(
      ids.map((id) =>
        fetch(`/api/leads/${id}`, { credentials: 'include' })
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null),
      ),
    ).then((results) => {
      const cache: Record<string, Lead> = {};
      results.forEach((res, i) => {
        if (res?.lead) cache[ids[i]] = res.lead as Lead;
      });
      setLeadCache(cache);
    });
  }, [appointments]);

  const dateLabel = new Intl.DateTimeFormat('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(year, month - 1, day));

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return raw;
  }

  function waHref(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
    return `https://wa.me/${normalized}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-5 py-4 flex-row-reverse">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400">תורים</p>
            <h2 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-zinc-100">{dateLabel}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors" aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[480px] overflow-y-auto px-5 py-3 space-y-3">
          {appointments.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-zinc-500">אין תורים ביום זה.</p>
          )}
          {appointments.map((apt) => {
            const lead = apt.lead_id ? leadCache[apt.lead_id] : undefined;
            const phone = lead?.phone ?? null;
            const interest = lead?.interest ?? null;

            return (
              <div key={apt.id}
                className="rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-700/50 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-tight">{apt.patient_name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">{formatTime(apt.datetime)}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_PILL[apt.type] ?? TYPE_PILL['new']}`}>
                        {apt.type === 'follow_up' ? 'מעקב' : 'חדש'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => onDelete(apt.id)}
                    className="shrink-0 rounded-full p-1.5 text-slate-300 dark:text-zinc-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-400 dark:hover:text-red-400 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {phone && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <a href={`tel:${phone}`}
                      className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors">
                      <Phone className="h-3 w-3 shrink-0" />
                      {formatPhone(phone)}
                    </a>
                    <a href={waHref(phone)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-600 transition-colors">
                      <MessageCircle className="h-3 w-3 shrink-0" />
                      וואטסאפ
                    </a>
                  </div>
                )}

                {interest && (
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-zinc-500 truncate">
                    עניין עיקרי: {interest}
                  </p>
                )}

                {lead && (
                  <button
                    onClick={() => onViewLead(lead)}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                    <Sparkles className="h-3 w-3" />
                    AI Summary
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-100 dark:border-zinc-800 px-5 py-3">
          <button onClick={() => { onClose(); onAdd(day); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white transition-colors">
            <Plus className="h-4 w-4" /> הוסף תור
          </button>
        </div>
      </div>
    </div>
  );
}
