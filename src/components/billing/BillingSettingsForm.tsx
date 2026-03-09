'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { BillingSettings, UpdateBillingSettingsBody, BillingBusinessType } from '@/types/billing';
import { BILLING_BUSINESS_TYPE_LABELS } from '@/types/billing';

type Props = {
  initial: BillingSettings | null;
  onClose: () => void;
  onSaved: (settings: BillingSettings) => void;
};

/**
 * Stage 2 shell — form fields and save logic in place.
 * Stage 3 will add: logo upload, VAT validation, inline field errors.
 */
export default function BillingSettingsForm({ initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<UpdateBillingSettingsBody>({
    business_name:   initial?.business_name   ?? '',
    business_number: initial?.business_number ?? '',
    business_type:   initial?.business_type   ?? 'osek_murshe',
    address:         initial?.address         ?? '',
    phone:           initial?.phone           ?? '',
    email:           initial?.email           ?? '',
    vat_number:      initial?.vat_number      ?? '',
  });
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState<string | null>(null);

  const set = (field: keyof UpdateBillingSettingsBody, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    if (!form.business_name?.trim()) { setError('שם עסק חובה'); return; }
    if (!form.business_number?.trim()) { setError('מספר עסק חובה'); return; }
    if (!form.business_type) { setError('סוג עסק חובה'); return; }

    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/billing-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בשמירה');
      onSaved(data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div
        className="modal-enter w-full max-w-lg rounded-2xl bg-white dark:bg-slate-950 shadow-2xl"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">פרטי עסק לחשבוניות</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500
              dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Business type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              סוג עסק <span className="text-red-500">*</span>
            </label>
            <select
              value={form.business_type}
              onChange={(e) => set('business_type', e.target.value as BillingBusinessType)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50
                focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
            >
              {(Object.entries(BILLING_BUSINESS_TYPE_LABELS) as [BillingBusinessType, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                )
              )}
            </select>
          </div>

          {/* Business name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              שם העסק <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.business_name ?? ''}
              onChange={(e) => set('business_name', e.target.value)}
              placeholder="קליניקת ד״ר ישראלי"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
            />
          </div>

          {/* Business number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              מספר עסק (ח.פ / ע.מ / ח.צ) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.business_number ?? ''}
              onChange={(e) => set('business_number', e.target.value)}
              placeholder="515XXXXXXX"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
            />
          </div>

          {/* VAT number — only for osek_murshe / chevra */}
          {(form.business_type === 'osek_murshe' || form.business_type === 'chevra') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                מספר עוסק מורשה (לחשבוניות מס)
              </label>
              <input
                type="text"
                value={form.vat_number ?? ''}
                onChange={(e) => set('vat_number', e.target.value)}
                placeholder="מס׳ עוסק מורשה"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50
                  placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
              />
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">כתובת</label>
            <input
              type="text"
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              placeholder="רחוב הרצל 1, תל אביב"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">טלפון</label>
              <input
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="03-XXXXXXX"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50
                  placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">אימייל</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                placeholder="clinic@example.com"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50
                  placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
              disabled:opacity-40"
          >
            ביטול
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-slate-900 dark:bg-slate-100 px-5 py-2 text-sm font-medium
              text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors
              disabled:opacity-40"
          >
            {saving ? 'שומר...' : 'שמור פרטים'}
          </button>
        </div>
      </div>
    </div>
  );
}
