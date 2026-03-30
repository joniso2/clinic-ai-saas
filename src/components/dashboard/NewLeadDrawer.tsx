'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { btn, input, inputLabel } from '@/lib/ui-classes';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useUnsavedWarning } from '@/hooks/useUnsavedWarning';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { ScheduleAppointmentModal } from '@/app/dashboard/ScheduleAppointmentModal';
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
  const [showAptModal, setShowAptModal] = useState(false);
  const [aptDate, setAptDate] = useState('');
  const [aptTime, setAptTime] = useState('10:00');
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
    setShowAptModal(false);
    setAptDate('');
    setAptTime('10:00');
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
      const hasApt = aptDate && aptTime;
      const finalStatus = hasApt ? 'Appointment scheduled' : status;
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          interest: interest || null,
          status: finalStatus,
          ...(estimatedDealValue != null && { estimated_deal_value: estimatedDealValue }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'שגיאה ביצירת הליד');
      }

      const json = await res.json() as { lead?: Lead };

      // Create appointment if date was selected
      if (json.lead && hasApt) {
        await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            patient_name: name.trim(),
            datetime: `${aptDate}T${aptTime}:00`,
            type: 'new',
            lead_id: json.lead.id,
            service_name: interest || null,
          }),
        }).catch(() => {});
      }

      if (json.lead) onCreated({ ...json.lead, status: finalStatus as LeadStatus });
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה');
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = open ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="ליד חדש"
        className="modal-enter w-full max-w-md max-h-[90dvh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — dark, matching ScheduleAppointmentModal */}
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
            <h2 className="text-lg font-bold text-white text-center flex-1">ליד חדש</h2>
            <div className="w-9" />
          </div>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-none px-6 py-5 space-y-5">
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
              <GlassSelect
                value={selectedServiceKey}
                onChange={(v) => setSelectedServiceKey(v)}
                options={[
                  ...pricingServices.map((s) => ({ value: s.service_name, label: `${s.service_name} — ₪${s.price}` })),
                  { value: OTHER_SERVICE_KEY, label: 'אחר (הזנה ידנית)' },
                ]}
                placeholder="בחר סוג שירות"
              />
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

            {/* Schedule appointment button */}
            <button
              type="button"
              onClick={() => setShowAptModal(true)}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-[14px] font-semibold transition-colors ${
                aptDate
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                  : 'bg-white text-slate-900 dark:bg-slate-800/70 dark:text-slate-100 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/60'
              }`}
            >
              <span>{aptDate ? `תור נקבע — ${aptDate} ${aptTime}` : 'קבע תור ישירות'}</span>
              {aptDate && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setAptDate(''); setAptTime('10:00'); }}
                >הסר</span>
              )}
            </button>

            {!aptDate && (
              <div>
                <label className={inputLabel}>סטטוס</label>
                <GlassSelect
                  value={status}
                  onChange={(v) => setStatus(v as LeadStatus)}
                  options={STATUS_OPTIONS}
                />
              </div>
            )}
          </div>

          {/* Footer — matching ScheduleAppointmentModal style */}
          <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 disabled:opacity-50 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'שומר...' : aptDate ? 'שמור וקבע תור' : 'שמור ליד'}
            </button>
          </div>
        </form>
      </div>

      {/* Appointment scheduling — same ScheduleAppointmentModal as leads page */}
      {showAptModal && (
        <ScheduleAppointmentModal
          lead={{ id: '', full_name: name.trim() || null, interest: interest || null } as Lead}
          title="קבע תור"
          onClose={() => setShowAptModal(false)}
          onScheduled={(apt) => {
            setAptDate(new Date(apt.datetime).toLocaleDateString('en-GB'));
            setAptTime(new Date(apt.datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
            setShowAptModal(false);
          }}
        />
      )}
    </div>
  ) : null;

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
