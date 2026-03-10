'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { btn, input, inputLabel } from '@/lib/ui-classes';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useUnsavedWarning } from '@/hooks/useUnsavedWarning';
import type { Lead, LeadStatus } from '@/types/leads';

const OTHER_SERVICE_KEY = '__other__';

interface NewLeadDrawerProps {
  open: boolean;
  clinicId: string | null;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
  /** שירותים מתמחור — בחירה תמלא סוג שירות + שווי */
  pricingServices?: { service_name: string; price: number }[];
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'Pending', label: 'ממתין' },
  { value: 'Contacted', label: 'נוצר קשר' },
  { value: 'Appointment scheduled', label: 'תור נקבע' },
  { value: 'Closed', label: 'סגור' },
  { value: 'Disqualified', label: 'לא רלוונטי' },
];

export default function NewLeadDrawer({ open, clinicId, onClose, onCreated, pricingServices = [] }: NewLeadDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useFocusTrap(panelRef, open);

  useEffect(() => setMounted(true), []);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  /** '' = לא נבחר, __other__ = אחר, אחרת = service_name מתמחור */
  const [selectedServiceKey, setSelectedServiceKey] = useState('');
  /** טקסט חופשי כשנבחר "אחר" */
  const [interestOther, setInterestOther] = useState('');
  const [status, setStatus] = useState<LeadStatus>('Pending');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = !!(name || phone || email);
  useUnsavedWarning(isDirty && open);

  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setEmail('');
    setSelectedServiceKey('');
    setInterestOther('');
    setStatus('Pending');
    setError(null);
  }, []);

  const interest = selectedServiceKey === OTHER_SERVICE_KEY ? interestOther.trim() : (selectedServiceKey || '');
  const estimatedDealValue = selectedServiceKey && selectedServiceKey !== OTHER_SERVICE_KEY
    ? (pricingServices.find((s) => s.service_name === selectedServiceKey)?.price ?? null)
    : null;

  // Lock body scroll when modal is open (critical for mobile)
  useEffect(() => {
    if (!open) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody || '';
      document.documentElement.style.overflow = prevHtml || '';
    };
  }, [open]);

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
          interest: interest || null,
          status,
          ...(estimatedDealValue != null && { estimated_deal_value: estimatedDealValue }),
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

  const modalContent = (
    <>
      {/* Backdrop — touch-none so it doesn't steal touch/scroll gestures */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm touch-none"
          onClick={onClose}
        />
      )}

      {/* Panel: mobile = bottom-sheet, desktop (md+) = side-drawer */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="ליד חדש"
        className={`fixed z-50 flex flex-col bg-white dark:bg-slate-900 transition-transform duration-300 ease-out
          inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
          shadow-[0_-6px_40px_rgba(0,0,0,0.18),0_-1px_4px_rgba(0,0,0,0.06)]
          md:inset-x-auto md:end-0 md:top-14 md:bottom-0 md:w-[420px]
          md:rounded-none md:max-h-none
          md:border-s md:border-slate-200 dark:md:border-slate-800
          md:shadow-[0_10px_30px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)]
          ${open
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:ltr:translate-x-full md:rtl:-translate-x-full'
          }`}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-0 md:hidden" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 md:px-6">
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
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-none touch-pan-y touch-auto px-5 py-5 space-y-5 md:px-6">
            {/* Error Banner */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            )}

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

            <div>
              <label className={inputLabel}>סוג שירות</label>
              <select
                value={selectedServiceKey}
                onChange={(e) => setSelectedServiceKey(e.target.value)}
                className={input}
              >
                <option value="">בחר סוג שירות</option>
                {pricingServices.map((s) => (
                  <option key={s.service_name} value={s.service_name}>
                    {s.service_name} — ₪{s.price}
                  </option>
                ))}
                <option value={OTHER_SERVICE_KEY}>אחר (הזנה ידנית)</option>
              </select>
            </div>
            {selectedServiceKey === OTHER_SERVICE_KEY && (
              <div>
                <label className={inputLabel}>סוג שירות / עניין (ידני)</label>
                <input
                  type="text"
                  value={interestOther}
                  onChange={(e) => setInterestOther(e.target.value)}
                  className={input}
                  placeholder="הזן תיאור"
                />
              </div>
            )}

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

          {/* Sticky Footer — shrink-0 so it never gets pushed off; mobile: stacked, desktop: row */}
          <div className="shrink-0 flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800 px-4 pt-4 pb-8 md:flex-row md:items-center md:justify-end md:gap-3 md:px-6 md:py-4">
            <button
              type="button"
              onClick={onClose}
              className={`${btn.secondary} w-full justify-center md:w-auto`}
              disabled={submitting}
            >
              ביטול
            </button>
            <button
              type="submit"
              className={`${btn.primary} w-full justify-center md:w-auto`}
              disabled={submitting}
            >
              {submitting ? 'שומר...' : 'שמור ליד'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
