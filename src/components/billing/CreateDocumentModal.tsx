'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronLeft, Check, Plus, Trash2 } from 'lucide-react';
import type {
  BillingDocType, BillingSettings, CreateDocumentItem, PaymentMethod,
  BillingDocumentWithItems,
} from '@/types/billing';
import {
  ALLOWED_DOC_TYPES, DOC_TYPE_LABELS, PAYMENT_METHOD_LABELS,
} from '@/types/billing';
import { computeDocumentTotals } from '@/lib/billing-math';

interface ClinicService {
  id: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  category: string | null;
  is_active: boolean;
}

type Source = 'manual' | 'appointment';

type Props = {
  settings: BillingSettings;
  appointmentId?: string;
  appointmentLabel?: string;
  prefillCustomerName?: string;
  prefillPhone?: string;
  prefillServiceName?: string;
  prefillPrice?: number;
  /** Link document to patient (customer); used when opening from Customer Drawer */
  patientId?: string;
  /** Show "נוצר מתוך תור" badge and auto-select appointment source */
  fromAppointment?: boolean;
  onClose: () => void;
  onIssued: (doc: BillingDocumentWithItems) => void;
};

const STEPS = ['מקור', 'שירותים', 'תשלום', 'תצוגה מקדימה', 'הנפקה'];

const INPUT = `w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
  px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500
  focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-zinc-500`;

const fmt = (n: number) =>
  `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CreateDocumentModal({ settings, appointmentId, appointmentLabel, prefillCustomerName, prefillPhone, prefillServiceName, prefillPrice, patientId, fromAppointment, onClose, onIssued }: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0 — source + doc type
  const [source, setSource] = useState<Source>((appointmentId || fromAppointment) ? 'appointment' : 'manual');
  const [docType, setDocType] = useState<BillingDocType>(
    (ALLOWED_DOC_TYPES[settings.business_type]?.[0]) ?? 'receipt',
  );
  const [customerName, setCustomerName] = useState(prefillCustomerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(prefillPhone ?? '');
  const [customerEmail, setCustomerEmail] = useState('');

  // Step 1 — services / items
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [items, setItems] = useState<CreateDocumentItem[]>(() => {
    if (prefillServiceName) {
      return [{ description: prefillServiceName, quantity: 1, unit_price: prefillPrice ?? 0 }];
    }
    return [{ description: '', quantity: 1, unit_price: 0 }];
  });

  // Step 2 — payment + delivery
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [deliveryMethod, setDeliveryMethod] = useState<'none' | 'sms' | 'whatsapp'>('none');

  const allowedTypes = ALLOWED_DOC_TYPES[settings.business_type] ?? [];

  const previewTotals = useMemo(
    () => computeDocumentTotals(
      items.map((i) => ({ quantity: i.quantity, unit_price: i.unit_price })),
      0.18,
    ),
    [items],
  );

  const loadServices = useCallback(() => {
    if (services.length > 0) return;
    setLoadingServices(true);
    fetch('/api/clinic-services')
      .then((r) => r.json())
      .then((d) => setServices((d.services ?? []).filter((s: ClinicService) => s.is_active)))
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, [services.length]);

  useEffect(() => {
    if (step === 1) loadServices();
  }, [step, loadServices]);

  // Auto-match prefilled service name to a clinic service for service_id + price
  useEffect(() => {
    if (!prefillServiceName || services.length === 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.service_id) return item;
        const norm = item.description.trim().toLowerCase();
        const match = services.find(
          (s) => s.service_name.trim().toLowerCase() === norm,
        );
        if (!match) return item;
        return {
          ...item,
          service_id: match.id,
          unit_price: item.unit_price || match.price,
        };
      }),
    );
  }, [services, prefillServiceName]);

  // ── Item helpers ────────────────────────────────────────────
  const addItem = () =>
    setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof CreateDocumentItem, value: string | number) =>
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const addServiceAsItem = (svc: ClinicService) => {
    const alreadyAdded = items.some((i) => i.description === svc.service_name);
    if (alreadyAdded) return;
    setItems((prev) => {
      const hasEmpty = prev.length === 1 && !prev[0].description && prev[0].unit_price === 0;
      const base = hasEmpty ? [] : prev;
      return [...base, { description: svc.service_name, quantity: 1, unit_price: svc.price, service_id: svc.id }];
    });
  };

  // ── Validation per step ─────────────────────────────────────
  const canAdvance = (): boolean => {
    if (step === 0) return !!customerName.trim() && !!docType;
    if (step === 1) return items.some((i) => i.description.trim() && i.unit_price > 0);
    if (step === 2) return !!paymentMethod;
    return true;
  };

  // ── Issue document ──────────────────────────────────────────
  const issue = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch('/api/billing-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          doc_type: docType,
          appointment_id: (source === 'appointment' && appointmentId) ? appointmentId : null,
          patient_id: patientId ?? null,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          customer_email: customerEmail.trim() || null,
          items: items
            .filter((i) => i.description.trim() && i.unit_price > 0)
            .map((i) => ({
              service_id: i.service_id ?? null,
              description: i.description.trim(),
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בהנפקת מסמך');
      onIssued(data.document as BillingDocumentWithItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בהנפקת מסמך');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => { setError(null); setStep((s) => s + 1); };
  const back = () => { setError(null); setStep((s) => s - 1); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">מסמך חדש</h2>
            {(fromAppointment || appointmentId) && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30
                border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-medium
                text-emerald-700 dark:text-emerald-300">
                נוצר מתוך תור
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600
            dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex border-b border-slate-100 dark:border-zinc-800 px-6 py-3 shrink-0 gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors
                ${i === step ? 'text-slate-900 dark:text-zinc-100' : i < step ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`}>
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]
                  ${i === step ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : i < step ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-px w-6 ${i < step ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-zinc-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 0: Source + customer + doc type */}
          {step === 0 && (
            <div className="space-y-5">
              {appointmentId && (
                <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-800 dark:text-blue-300">
                  מסמך זה יקושר לתור: <strong>{appointmentLabel ?? appointmentId}</strong>
                </div>
              )}

              {!appointmentId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">מקור</label>
                  <div className="flex gap-3">
                    {(['manual', 'appointment'] as Source[]).map((s) => (
                      <button key={s} onClick={() => setSource(s)}
                        className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors
                          ${source === s
                            ? 'border-slate-900 dark:border-zinc-100 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                            : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}>
                        {s === 'manual' ? 'ידני' : 'תור'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                  סוג מסמך <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {allowedTypes.map((t) => (
                    <button key={t} onClick={() => setDocType(t)}
                      className={`rounded-lg border px-4 py-2.5 text-sm text-right transition-colors
                        ${docType === t
                          ? 'border-slate-900 dark:border-zinc-100 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                          : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}>
                      {DOC_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  שם לקוח <span className="text-red-500">*</span>
                </label>
                <input className={INPUT} value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)} placeholder="ישראל ישראלי" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">טלפון</label>
                  <input className={INPUT} value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)} type="tel" placeholder="050-0000000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">אימייל</label>
                  <input className={INPUT} value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)} type="email" placeholder="name@email.com" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Services / items */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Service quick-add */}
              {services.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    הוסף שירות מהרשימה
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {services.map((svc) => (
                      <button key={svc.id} onClick={() => addServiceAsItem(svc)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700
                          px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                        <Plus className="h-3 w-3" />
                        {svc.service_name}
                        <span className="text-slate-400 dark:text-zinc-500">₪{svc.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {loadingServices && (
                <p className="text-xs text-slate-400 dark:text-zinc-500">טוען שירותים...</p>
              )}

              {/* Manual items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                    פריטים
                  </p>
                  <button onClick={addItem}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400
                      hover:text-slate-700 dark:hover:text-zinc-200 transition-colors">
                    <Plus className="h-3 w-3" /> הוסף פריט
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_56px_96px_32px] gap-2 items-center">
                      <input className={INPUT} value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="תיאור שירות" />
                      <input className={`${INPUT} text-center`} type="number" min={1} value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)} />
                      <input className={`${INPUT} text-left`} type="number" min={0} step="0.01" value={item.unit_price}
                        onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="מחיר" />
                      <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                        className="flex items-center justify-center h-9 w-8 rounded-lg text-slate-400
                          hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors
                          disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Running total */}
                <div className="mt-4 flex justify-end">
                  <div className="text-sm text-slate-500 dark:text-zinc-400">
                    סה״כ (לפני מע״מ):{' '}
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {fmt(previewTotals.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                  אמצעי תשלום <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setPaymentMethod(key)}
                      className={`rounded-lg border px-3 py-2.5 text-sm transition-colors
                        ${paymentMethod === key
                          ? 'border-slate-900 dark:border-zinc-100 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                          : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                  שליחה ללקוח
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'none', label: 'לא לשלוח' },
                    { key: 'sms', label: 'SMS' },
                    { key: 'whatsapp', label: 'וואטסאפ' },
                  ] as const).map(({ key, label }) => (
                    <button key={key} onClick={() => setDeliveryMethod(key)}
                      className={`rounded-lg border px-3 py-2.5 text-sm transition-colors
                        ${deliveryMethod === key
                          ? 'border-slate-900 dark:border-zinc-100 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                          : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
                <div className="bg-slate-50 dark:bg-zinc-800 px-5 py-4 border-b border-slate-100 dark:border-zinc-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1">
                    {DOC_TYPE_LABELS[docType]}
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-zinc-100">{settings.business_name}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">מס׳ עסק: {settings.business_number}</p>
                </div>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-700">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">לקוח</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">{customerName}</p>
                  {customerPhone && <p className="text-xs text-slate-500 dark:text-zinc-400">{customerPhone}</p>}
                </div>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-right text-xs font-medium text-slate-400 dark:text-zinc-500 pb-2">תיאור</th>
                        <th className="text-center text-xs font-medium text-slate-400 dark:text-zinc-500 pb-2 w-12">כמות</th>
                        <th className="text-left text-xs font-medium text-slate-400 dark:text-zinc-500 pb-2 w-24">מחיר</th>
                        <th className="text-left text-xs font-medium text-slate-400 dark:text-zinc-500 pb-2 w-24">סה״כ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter((i) => i.description.trim()).map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-1 text-slate-700 dark:text-zinc-300">{item.description}</td>
                          <td className="py-1 text-center text-slate-500 dark:text-zinc-400 tabular-nums">{item.quantity}</td>
                          <td className="py-1 text-left text-slate-500 dark:text-zinc-400 tabular-nums">{fmt(Number(item.unit_price))}</td>
                          <td className="py-1 text-left font-medium text-slate-700 dark:text-zinc-300 tabular-nums">
                            {fmt(Math.round((item.quantity * Number(item.unit_price)) * 100) / 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-4 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="tabular-nums text-slate-500 dark:text-zinc-400">{fmt(previewTotals.subtotal)}</span>
                    <span className="text-slate-600 dark:text-zinc-400">לפני מע״מ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="tabular-nums text-slate-500 dark:text-zinc-400">{fmt(previewTotals.vat_amount)}</span>
                    <span className="text-slate-600 dark:text-zinc-400">מע״מ (18%)</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-slate-200 dark:border-zinc-700 pt-2 mt-1">
                    <span className="tabular-nums text-slate-900 dark:text-zinc-100">{fmt(previewTotals.total)}</span>
                    <span className="text-slate-800 dark:text-zinc-200">סה״כ לתשלום</span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 pt-1">
                    אמצעי תשלום: {PAYMENT_METHOD_LABELS[paymentMethod]}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                * הסכומים הסופיים מחושבים בשרת בעת ההנפקה
              </p>
            </div>
          )}

          {/* Step 4: Issue */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">מוכן להנפקה</p>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  לחץ על ״הנפק מסמך״ כדי להפיק את המסמך הסופי
                </p>
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20
                  rounded-lg px-4 py-2.5 w-full text-right" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}

          {error && step < 4 && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" role="alert">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0">
          <button onClick={step === 0 ? onClose : back} disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700
              px-4 py-2 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800
              transition-colors disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
            {step === 0 ? 'ביטול' : 'חזרה'}
          </button>

          {step < 4 && (
            <button onClick={next} disabled={!canAdvance()}
              className="rounded-lg bg-slate-900 dark:bg-zinc-100 px-5 py-2 text-sm font-medium
                text-white dark:text-zinc-900 hover:bg-slate-700 dark:hover:bg-zinc-300 transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed">
              המשך
            </button>
          )}

          {step === 4 && (
            <button onClick={issue} disabled={submitting}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white
                hover:bg-emerald-700 transition-colors disabled:opacity-40">
              {submitting ? 'מנפיק...' : 'הנפק מסמך'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
