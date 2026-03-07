'use client';

import { useState } from 'react';
import { Building2, Phone, MapPin, Globe, DollarSign, Image, FileText, Save, CheckCircle2, AlertCircle, Loader2, Link2, Copy, ExternalLink } from 'lucide-react';
import { AdminHeroMediaEditor } from '@/components/clica/AdminHeroMediaEditor';
import type { ClinicSettings } from '@/services/settings.service';

function BookingLinkCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${slug}`
    : `/book/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 overflow-hidden">
      <div className="border-b border-indigo-100 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/50 px-5 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Link2 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">קישור עמוד הזמנה</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">שלח ללקוחות לקביעת תור ישירה</p>
        </div>
      </div>
      <div className="px-5 py-4 flex items-center gap-2">
        <code className="flex-1 truncate rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-mono text-indigo-700 dark:text-indigo-300 select-all">
          {url}
        </code>
        <button
          onClick={handleCopy}
          title="העתק קישור"
          className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-200 hover:bg-indigo-50 dark:hover:bg-zinc-700 transition-colors"
        >
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          {copied ? 'הועתק' : 'העתק'}
        </button>
        <a
          href={`/book/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          title="פתח עמוד הזמנה"
          className="flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          פתח
        </a>
      </div>
    </div>
  );
}

const TIMEZONES = [
  { value: 'Asia/Jerusalem', label: 'Asia/Jerusalem (IL)' },
  { value: 'Europe/London',  label: 'Europe/London (UK)' },
  { value: 'Europe/Paris',   label: 'Europe/Paris (EU)' },
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'America/Chicago',  label: 'America/Chicago (CT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
  { value: 'Asia/Tokyo',     label: 'Asia/Tokyo (JP)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AU)' },
];

const CURRENCIES = [
  { value: 'ILS', label: '₪ ILS — Israeli Shekel' },
  { value: 'USD', label: '$ USD — US Dollar' },
  { value: 'EUR', label: '€ EUR — Euro' },
  { value: 'GBP', label: '£ GBP — British Pound' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-colors"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-colors resize-none"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-zinc-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-colors"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function GeneralTab({
  settings,
  clinicName,
  clinicSlug,
  userEmail,
}: {
  settings: ClinicSettings;
  clinicName: string | null;
  clinicSlug: string | null;
  userEmail: string | null;
}) {
  const [form, setForm] = useState({
    clinic_phone:        settings.clinic_phone        ?? '',
    address:             settings.address             ?? '',
    timezone:            settings.timezone            ?? 'Asia/Jerusalem',
    currency:            settings.currency            ?? 'ILS',
    logo_url:            settings.logo_url            ?? '',
    business_description: settings.business_description ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus('idle');
  }

  async function handleSave() {
    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_phone:         form.clinic_phone        || null,
          address:              form.address             || null,
          timezone:             form.timezone,
          currency:             form.currency,
          logo_url:             form.logo_url            || null,
          business_description: form.business_description || null,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Read-only profile */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Clinic profile</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Account-level information. Contact support to change.</p>
          </div>
        </div>
        <div className="px-5 py-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-700/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Clinic name</p>
            <p className="mt-1.5 text-sm font-medium text-slate-900 dark:text-zinc-100">{clinicName ?? 'Not set'}</p>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-700/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Account email</p>
            <p className="mt-1.5 text-sm font-medium text-slate-900 dark:text-zinc-100">{userEmail ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Booking page link */}
      {clinicSlug && (
        <BookingLinkCard slug={clinicSlug} />
      )}

      {/* Hero media (Clica / premium landing) */}
      <AdminHeroMediaEditor />

      {/* Editable contact + locale */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
            <Phone className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Contact & locale</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">How patients reach you and regional defaults.</p>
          </div>
        </div>
        <div className="px-5 py-5 grid gap-4 sm:grid-cols-2">
          <Field label="Clinic phone">
            <Input value={form.clinic_phone} onChange={(v) => set('clinic_phone', v)} placeholder="+972 50 000 0000" />
          </Field>
          <Field label="Timezone">
            <Select value={form.timezone} onChange={(v) => set('timezone', v)} options={TIMEZONES} />
          </Field>
          <Field label="Default currency">
            <Select value={form.currency} onChange={(v) => set('currency', v)} options={CURRENCIES} />
          </Field>
          <Field label="Logo URL">
            <Input value={form.logo_url} onChange={(v) => set('logo_url', v)} placeholder="https://example.com/logo.png" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <Textarea value={form.address} onChange={(v) => set('address', v)} placeholder="123 Main St, Tel Aviv, Israel" rows={2} />
            </Field>
          </div>
        </div>
      </div>

      {/* Brand / AI context */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Business description</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Used by the AI assistant to personalize responses.</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <Field label="Description">
            <Textarea
              value={form.business_description}
              onChange={(v) => set('business_description', v)}
              placeholder="A modern dental clinic specializing in preventive and cosmetic dentistry…"
              rows={4}
            />
          </Field>
          <p className="mt-2 text-xs text-slate-400 dark:text-zinc-500">
            This context is injected into the AI receptionist prompt automatically.
          </p>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {status === 'success' && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1.5 text-sm text-red-500 dark:text-red-400">
            <AlertCircle className="h-4 w-4" /> Failed to save
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
