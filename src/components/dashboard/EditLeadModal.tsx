'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Lead } from '@/types/leads';
import type { LeadStatus } from '@/types/leads';

export function EditLeadModal({
  lead,
  open,
  onClose,
  onSave,
  loading,
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Lead>) => Promise<void>;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [status, setStatus] = useState<LeadStatus>('Pending');

  useEffect(() => {
    if (lead) {
      setName(lead.full_name ?? '');
      setEmail(lead.email ?? '');
      setPhone(lead.phone ?? '');
      setInterest(lead.interest ?? '');
      setStatus((lead.status as LeadStatus) ?? 'Pending');
    }
  }, [lead]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!lead || !open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(lead.id, {
      full_name: name || null,
      email: email || null,
      phone: phone || null,
      interest: interest || null,
      status,
    });
    // Parent closes modal on success via setEditLead(null)
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ערוך ליד"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 text-right">ערוך ליד</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-200"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right">שם</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right">טלפון</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right">עניין</label>
            <input
              type="text"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right">סטטוס</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500 text-right"
            >
              <option value="Pending">ממתין</option>
              <option value="Contacted">נוצר קשר</option>
              <option value="Appointment scheduled">תור נקבע</option>
              <option value="Closed">נסגר</option>
              <option value="Disqualified">הוסר</option>
            </select>
          </div>
          <div className="flex justify-start gap-3 pt-4 flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-60"
            >
              {loading ? 'שומר…' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
