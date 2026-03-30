'use client';

import { useState, useRef } from 'react';
import { X, Banknote, CreditCard, Smartphone, Building2, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { PaymentMethod, PaymentStatus } from '@/types/billing';

type Props = {
  leadName: string;
  appointmentIds: string[];
  remainingBalance: number;
  /** Pre-fill for retry */
  prefillMethod?: PaymentMethod;
  onClose: () => void;
  onSuccess: () => void;
};

const PRIMARY_METHODS: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { key: 'credit', label: 'אשראי', icon: CreditCard },
  { key: 'bit', label: 'ביט', icon: Smartphone },
  { key: 'cash', label: 'מזומן', icon: Banknote },
];

const SECONDARY_METHODS: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { key: 'bank_transfer', label: 'העברה בנקאית', icon: Building2 },
  { key: 'paybox', label: 'פייבוקס', icon: Smartphone },
  { key: 'other', label: 'אחר', icon: MoreHorizontal },
];

/** Resolve initial payment status per method */
function resolveStatusForMethod(method: PaymentMethod): PaymentStatus {
  switch (method) {
    case 'cash':
    case 'bit':
    case 'paybox':
      return 'received';
    case 'credit':
    case 'bank_transfer':
      return 'pending';
    default:
      return 'received';
  }
}

export function PaymentFlowModal({ leadName, appointmentIds, remainingBalance, prefillMethod, onClose, onSuccess }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);
  useEscapeKey(true, onClose);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState(remainingBalance > 0 ? remainingBalance.toString() : '');
  const [method, setMethod] = useState<PaymentMethod | null>(prefillMethod ?? null);
  const [showMore, setShowMore] = useState(false);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const canProceedStep1 = parsedAmount > 0;
  const canProceedStep2 = !!method;
  const needsReference = method === 'bank_transfer' || method === 'credit';

  const handleSubmit = async () => {
    if (!method || parsedAmount <= 0) return;
    setSubmitting(true);
    setError(null);

    const idempotencyKey = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const paymentDate = new Date().toISOString().slice(0, 10);
    const resolvedStatus = resolveStatusForMethod(method);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        credentials: 'include',
        body: JSON.stringify({
          appointment_id: appointmentIds[0] ?? null,
          amount: parsedAmount,
          payment_method: method,
          payment_date: paymentDate,
          reference_number: reference.trim() || null,
          notes: `[source:manual]${notes.trim() ? ' ' + notes.trim() : ''}`,
          status: resolvedStatus,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'שגיאה בביצוע התשלום');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה');
    } finally {
      setSubmitting(false);
    }
  };

  const methodLabel = method ? [...PRIMARY_METHODS, ...SECONDARY_METHODS].find(m => m.key === method)?.label ?? method : '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="modal-enter w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="ביצוע תשלום"
      >
        {/* Header — dark, matching ScheduleAppointmentModal */}
        <div className="bg-slate-900 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
              aria-label="סגור"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-white text-center flex-1">ביצוע תשלום</h2>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 shrink-0">
              <Banknote className="h-5 w-5 text-white" />
            </div>
          </div>
          {leadName && (
            <p className="text-xs text-slate-400 text-center mt-1">{leadName}</p>
          )}
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Step 1: Amount ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1.5">סכום לתשלום</label>
                {remainingBalance > 0 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">יתרה לגבייה: ₪{remainingBalance.toLocaleString()}</p>
                )}
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3.5 text-[24px] font-bold text-slate-900 dark:text-white tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition"
                    autoFocus
                  />
                  <span className="absolute start-4 top-1/2 -translate-y-1/2 text-[18px] font-semibold text-slate-400">₪</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Payment Method ── */}
          {step === 2 && (
            <div className="space-y-4">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">אמצעי תשלום</label>

              {/* Primary methods */}
              <div className="grid grid-cols-3 gap-2.5">
                {PRIMARY_METHODS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMethod(key)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-[13px] font-semibold transition-all ${
                      method === key
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    {label}
                  </button>
                ))}
              </div>

              {/* More options toggle */}
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mx-auto"
              >
                {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                אפשרויות נוספות
              </button>

              {showMore && (
                <div className="grid grid-cols-3 gap-2.5">
                  {SECONDARY_METHODS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-[13px] font-semibold transition-all ${
                        method === key
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Reference number for credit/transfer */}
              {needsReference && method && (
                <div className="mt-3">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1.5">
                    {method === 'credit' ? 'מספר אישור' : 'מספר אסמכתא'}
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="אופציונלי"
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition"
                  />
                  {method === 'bank_transfer' && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">התשלום יירשם כממתין לאישור</p>
                  )}
                  {method === 'credit' && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">התשלום יירשם כממתין לאישור מספק האשראי</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Confirmation ── */}
          {step === 3 && method && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500 dark:text-slate-400">סכום</span>
                  <span className="text-[18px] font-bold text-slate-900 dark:text-white tabular-nums">₪{parsedAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500 dark:text-slate-400">אמצעי תשלום</span>
                  <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{methodLabel}</span>
                </div>
                {reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-slate-500 dark:text-slate-400">אסמכתא</span>
                    <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{reference}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500 dark:text-slate-400">סטטוס</span>
                  <span className={`text-[13px] font-semibold ${
                    resolveStatusForMethod(method) === 'received'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {resolveStatusForMethod(method) === 'received' ? 'מאושר מיידית' : 'ממתין לאישור'}
                  </span>
                </div>
              </div>

              {/* Optional note */}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1.5">הערה (אופציונלי)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערה לתשלום"
                  className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
            disabled={submitting}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 disabled:opacity-50 transition-colors"
          >
            {step === 1 ? 'ביטול' : 'חזרה'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="rounded-xl bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              הבא
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'מעבד...' : 'אשר תשלום'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
