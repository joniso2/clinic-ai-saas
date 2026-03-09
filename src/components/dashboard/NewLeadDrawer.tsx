'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { btn, input, inputLabel, sectionGroupLabel } from '@/lib/ui-classes';
import type { Lead, LeadStatus } from '@/types/leads';

interface NewLeadDrawerProps {
  open: boolean;
  clinicId: string | null;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'Pending', label: 'ממתין' },
  { value: 'Contacted', label: 'נוצר קשר' },
  { value: 'Appointment scheduled', label: 'תור נקבע' },
  { value: 'Closed', label: 'סגור' },
  { value: 'Disqualified', label: 'לא רלוונטי' },
];

export default function NewLeadDrawer({ open, clinicId, onClose, onCreated }: NewLeadDrawerProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('');
  const [status, setStatus] = useState<LeadStatus>('Pending');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setEmail('');
    setInterest('');
    setStatus('Pending');
    setError(null);
  }, []);

  // Escape key closes drawer
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('שם מלא הוא שדה חובה');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          interest: interest.trim() || null,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'שגיאה ביצירת הליד');
      }

      const json = await res.json() as { lead?: Lead };
      if (json.lead) onCreated(json.lead);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed right-0 top-14 bottom-0 z-50 flex w-full max-w-[420px] flex-col bg-white dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50">
            ליד חדש
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={btn.icon}
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Error Banner */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Section: Contact Details */}
            <p className={sectionGroupLabel}>פרטי קשר</p>

            <div>
              <label className={inputLabel}>
                שם מלא <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
                required
              />
            </div>

            <div>
              <label className={inputLabel}>טלפון</label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${input} text-left`}
              />
            </div>

            <div>
              <label className={inputLabel}>אימייל</label>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${input} text-left`}
              />
            </div>

            {/* Section: Lead Details */}
            <p className={`${sectionGroupLabel} mt-6`}>פרטי ליד</p>

            <div>
              <label className={inputLabel}>עניין / תלונה עיקרית</label>
              <input
                type="text"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                className={input}
              />
            </div>

            <div>
              <label className={inputLabel}>סטטוס</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className={input}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className={btn.secondary}
              disabled={submitting}
            >
              ביטול
            </button>
            <button
              type="submit"
              className={btn.primary}
              disabled={submitting}
            >
              {submitting ? 'שומר...' : 'שמור ליד'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
