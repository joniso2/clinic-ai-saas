'use client';

import { useEffect } from 'react';
import { X, Mail, Phone, Calendar, Tag, DollarSign, Brain, AlertTriangle, Clock } from 'lucide-react';
import type { Lead } from '@/types/leads';
import {
  getDisplayPriority,
  formatCurrency,
  type Priority,
  type LeadStatus,
} from '@/types/leads';

const PRIORITY_STYLES: Record<Priority, string> = {
  Low: 'bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300',
  Medium: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400',
  High: 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-400',
  Urgent: 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-400',
};

function formatDateDDMMYYYY(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const URGENCY_STYLES: Record<string, string> = {
  high:   'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50',
  medium: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50',
  low:    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50',
};

const PRIORITY_LEVEL_STYLES: Record<string, string> = {
  high:   'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400',
  medium: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
  low:    'bg-slate-100 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-400',
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70 ? 'bg-emerald-500' :
    pct >= 40 ? 'bg-amber-400' :
                'bg-red-400';
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-zinc-100 leading-none">
        {score}
        <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">/100</span>
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SlaDeadline({ value }: { value: string }) {
  const deadline = new Date(value);
  const passed = deadline < new Date();
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
      passed
        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50'
        : 'bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
    }`}>
      {passed && <AlertTriangle className="h-3 w-3 shrink-0" />}
      {!passed && <Clock className="h-3 w-3 shrink-0" />}
      <span>{passed ? 'Overdue · ' : ''}{formatDateTime(value)}</span>
    </div>
  );
}

function AIIntelligenceSection({ lead }: { lead: Lead }) {
  const hasAny =
    lead.conversation_summary ||
    lead.lead_quality_score != null ||
    lead.urgency_level ||
    lead.priority_level ||
    lead.sla_deadline ||
    lead.follow_up_recommended_at ||
    lead.callback_recommendation;

  if (!hasAny) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-700/60 bg-slate-50/60 dark:bg-zinc-800/40 overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/70 dark:border-zinc-700/40">
        <Brain className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
          AI Intelligence
        </span>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Block 1 — Conversation Summary */}
        {lead.conversation_summary && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mb-1.5">Conversation summary</p>
            <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
              {lead.conversation_summary}
            </p>
          </div>
        )}

        {/* Block 2 — Metrics row */}
        {(lead.lead_quality_score != null || lead.urgency_level || lead.priority_level) && (
          <div className="grid grid-cols-1 gap-3">
            {lead.lead_quality_score != null && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mb-1.5">Lead quality score</p>
                <ScoreBar score={lead.lead_quality_score} />
              </div>
            )}
            {(lead.urgency_level || lead.priority_level) && (
              <div className="flex flex-wrap gap-2">
                {lead.urgency_level && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mb-1">Urgency</p>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${URGENCY_STYLES[lead.urgency_level] ?? ''}`}>
                      {lead.urgency_level}
                    </span>
                  </div>
                )}
                {lead.priority_level && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mb-1">Priority</p>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${PRIORITY_LEVEL_STYLES[lead.priority_level] ?? ''}`}>
                      {lead.priority_level}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Divider before action block */}
        {(lead.sla_deadline || lead.follow_up_recommended_at || lead.callback_recommendation) &&
         (lead.conversation_summary || lead.lead_quality_score != null || lead.urgency_level || lead.priority_level) && (
          <div className="border-t border-slate-200/70 dark:border-zinc-700/40" />
        )}

        {/* Block 3 — Action intelligence */}
        <div className="space-y-3">
          {lead.sla_deadline && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mb-1.5">SLA deadline</p>
              <SlaDeadline value={lead.sla_deadline} />
            </div>
          )}
          {lead.follow_up_recommended_at && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mb-1.5">Follow-up recommended</p>
              <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                <Clock className="h-3 w-3 shrink-0" />
                {formatDateTime(lead.follow_up_recommended_at)}
              </span>
            </div>
          )}
          {lead.callback_recommendation && (
            <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 px-3.5 py-3">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Callback recommendation</p>
              <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                {lead.callback_recommendation}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export function LeadDetailDrawer({
  lead,
  open,
  onClose,
  onStatusChange,
  onMarkContacted,
  onScheduleFollowUp,
  onEdit,
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onMarkContacted: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onEdit: (lead: Lead) => void;
}) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handler);
        document.body.style.overflow = '';
      };
    }
  }, [open, onClose]);

  if (!lead) return null;

  const priority = getDisplayPriority(lead);
  const status = (lead.status ?? 'New') as LeadStatus;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl transition-transform duration-300 ease-out sm:max-w-lg ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-modal="true"
        aria-label="Lead details"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Lead details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 dark:text-zinc-400 transition hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
                {lead.full_name || 'Unnamed lead'}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLES[priority]}`}
                >
                  {priority}
                </span>
                <span className="rounded-lg bg-slate-100 dark:bg-zinc-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300">
                  {status}
                </span>
                {lead.source && (
                  <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                    {lead.source}
                  </span>
                )}
              </div>
            </div>

            <dl className="grid gap-4">
              {lead.email && (
                <div className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Email</dt>
                    <dd className="text-sm text-slate-900 dark:text-zinc-100">{lead.email}</dd>
                  </div>
                </div>
              )}
              {lead.phone && (
                <div className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Phone</dt>
                    <dd className="text-sm text-slate-900 dark:text-zinc-100">{lead.phone}</dd>
                  </div>
                </div>
              )}
              {lead.interest && (
                <div className="flex gap-3">
                  <Tag className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Interest</dt>
                    <dd className="text-sm text-slate-900 dark:text-zinc-100">{lead.interest}</dd>
                  </div>
                </div>
              )}
              {(lead.estimated_deal_value ?? 0) > 0 && (
                <div className="flex gap-3">
                  <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Deal value</dt>
                    <dd className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                      {formatCurrency(lead.estimated_deal_value!)}
                    </dd>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Created</dt>
                  <dd className="text-sm text-slate-900 dark:text-zinc-100">
                    {formatDateDDMMYYYY(lead.created_at)}
                  </dd>
                </div>
              </div>
              {lead.last_contact_date && (
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Last contact</dt>
                    <dd className="text-sm text-slate-900 dark:text-zinc-100">
                      {formatDateDDMMYYYY(lead.last_contact_date)}
                    </dd>
                  </div>
                </div>
              )}
              {lead.next_follow_up_date && (
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Next follow-up</dt>
                    <dd className="text-sm text-slate-900 dark:text-zinc-100">
                      {formatDateDDMMYYYY(lead.next_follow_up_date)}
                    </dd>
                  </div>
                </div>
              )}
              {lead.lead_score != null && (
                <div className="flex gap-3">
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-slate-200 dark:bg-zinc-700" />
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Lead score</dt>
                    <dd className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                      {lead.lead_score}/100
                    </dd>
                  </div>
                </div>
              )}
            </dl>

            <AIIntelligenceSection lead={lead} />
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(e) =>
                onStatusChange(lead.id, e.target.value as LeadStatus)
              }
              className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 focus:border-slate-900 dark:focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-400"
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Closed">Closed</option>
            </select>
            <button
              type="button"
              onClick={() => onMarkContacted(lead.id)}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-zinc-700"
            >
              Mark as contacted
            </button>
            <button
              type="button"
              onClick={() => onScheduleFollowUp(lead.id)}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-zinc-700"
            >
              Schedule follow-up
            </button>
          </div>
          <button
            type="button"
            onClick={() => onEdit(lead)}
            className="w-full rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm transition hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Edit lead
          </button>
        </div>
      </aside>
    </>
  );
}
