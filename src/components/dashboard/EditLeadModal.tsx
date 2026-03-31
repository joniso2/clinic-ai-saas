'use client';

import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useUnsavedWarning } from '@/hooks/useUnsavedWarning';
import { GlassSelect } from '@/components/ui/GlassSelect';
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
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);
  useEscapeKey(open, onClose);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [status, setStatus] = useState<LeadStatus>('Pending');

  const isDirty = !!(lead && (
    name !== (lead.full_name ?? '') ||
    email !== (lead.email ?? '') ||
    phone !== (lead.phone ?? '') ||
    interest !== (lead.interest ?? '') ||
    status !== ((lead.status as LeadStatus) ?? 'Pending')
  ));
  useUnsavedWarning(isDirty && open);

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

  const inputCls =
    'h-11 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-[14px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-all duration-150';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ערוך ליד"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="modal-enter max-w-lg w-full max-h-[90dvh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
              aria-label="סגור"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-white text-center flex-1">ערוך ליד</h2>
            <div className="w-9" />
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Section: פרטי קשר */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3">
                פרטי קשר
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    שם
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    טלפון
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    maxLength={10}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    dir="ltr"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    אימייל
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Section: פרטי ליד */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mb-3">
                פרטי ליד
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    עניין
                  </label>
                  <input
                    type="text"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    סטטוס
                  </label>
                  <GlassSelect
                    value={status}
                    onChange={(v) => setStatus(v as LeadStatus)}
                    options={[
                      { value: 'Pending', label: 'ממתין' },
                      { value: 'Contacted', label: 'נוצר קשר' },
                      { value: 'Appointment scheduled', label: 'תור נקבע' },
                      { value: 'Closed', label: 'נסגר' },
                      { value: 'Disqualified', label: 'בוטל' },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 disabled:opacity-50 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'שומר…' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
