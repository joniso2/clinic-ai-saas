'use client';

import { useEffect, useState } from 'react';
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

// ─── Phone Contact Modal ─────────────────────────────────────────────────────

function PhoneContactModal({ phone, onClose }: { phone: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const waNumber = phone.replace(/\D/g, '').replace(/^0/, '972');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xs rounded-2xl border border-slate-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Contact via</h2>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition"
          >
            <Phone className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
            Phone Call
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-800/60 px-4 py-3 text-sm font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition"
          >
            <svg className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── AI Intelligence Section ─────────────────────────────────────────────────

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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/70 dark:border-zinc-700/40">
        <Brain className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
          AI Intelligence
        </span>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Conversation Summary — natural language paragraph only */}
        {lead.conversation_summary && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mb-1.5">Conversation summary</p>
            <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
              {lead.conversation_summary}
            </p>
          </div>
        )}

        {/* Metrics row */}
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

        {(lead.sla_deadline || lead.follow_up_recommended_at || lead.callback_recommendation) &&
         (lead.conversation_summary || lead.lead_quality_score != null || lead.urgency_level || lead.priority_level) && (
          <div className="border-t border-slate-200/70 dark:border-zinc-700/40" />
        )}

        {/* Action intelligence */}
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

// ─── Drawer ──────────────────────────────────────────────────────────────────

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
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

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
  const status = (lead.status ?? 'Pending') as LeadStatus;

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
                <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
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
                    <dd>
                      <button
                        type="button"
                        onClick={() => setPhoneModalOpen(true)}
                        className="text-sm text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                      >
                        {lead.phone}
                      </button>
                    </dd>
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

        <div className="border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 space-y-3">
          {/* Secondary actions: status + quick-action group */}
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
              className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 focus:border-slate-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors"
            >
              <option value="Pending">Pending</option>
              <option value="Contacted">Contacted</option>
              <option value="Appointment scheduled">Appointment scheduled</option>
              <option value="Closed">Closed</option>
              <option value="Disqualified">Disqualified</option>
            </select>
            {/* Grouped quick actions */}
            <div className="flex shrink-0 items-center gap-px rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 p-1">
              <button
                type="button"
                onClick={() => onMarkContacted(lead.id)}
                title="Mark as contacted"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Contacted</span>
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />
              <button
                type="button"
                onClick={() => onScheduleFollowUp(lead.id)}
                title="Schedule follow-up"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Follow-up</span>
              </button>
            </div>
          </div>
          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => onEdit(lead)}
            className="w-full rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm transition hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-zinc-100/20 focus:ring-offset-1"
          >
            Edit lead
          </button>
        </div>
      </aside>

      {/* Phone Contact Modal */}
      {phoneModalOpen && lead.phone && (
        <PhoneContactModal
          phone={lead.phone}
          onClose={() => setPhoneModalOpen(false)}
        />
      )}
    </>
  );
}
