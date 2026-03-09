'use client';

import { useState } from 'react';
import { X, Users, Stethoscope, UserCircle, Shield } from 'lucide-react';
import type { TeamMember } from './team-types';
import { ROLE_DISPLAY_OPTIONS, getRoleDisplay } from './team-types';

export function SummaryCard({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 p-4 shadow-sm text-right">
      <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500 mb-2 me-auto" />
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{value}</p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

export { Users, Shield, Stethoscope, UserCircle };

export function AddMemberModal({
  onClose,
  onSaved,
  onError,
}: {
  onClose: () => void;
  onSaved: (member: TeamMember) => void;
  onError: (msg: string) => void;
}) {
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role_display, setRoleDisplay] = useState<string>('תומך');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const nameTrim = full_name.trim();
    const emailTrim = email.trim().toLowerCase();
    if (!nameTrim) {
      setFieldErrors((p) => ({ ...p, full_name: 'שם מלא חובה' }));
      return;
    }
    if (!emailTrim) {
      setFieldErrors((p) => ({ ...p, email: 'אימייל חובה' }));
      return;
    }
    if (password.length < 8) {
      setFieldErrors((p) => ({ ...p, password: 'סיסמה לפחות 8 תווים' }));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ full_name: nameTrim, email: emailTrim, password, role_display }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.user_id) {
        onSaved({
          user_id: data.user_id,
          email: data.email ?? emailTrim,
          full_name: data.full_name ?? nameTrim,
          role: data.role ?? 'STAFF',
          job_title: data.job_title ?? (role_display !== 'מנהל' ? role_display : null),
          banned_until: data.banned_until ?? null,
          last_sign_in_at: data.last_sign_in_at ?? null,
        });
      } else {
        onError(data.error ?? 'הוספה נכשלה');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="modal-enter w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex-row-reverse">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 text-right">הוסף איש צוות</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">שם מלא <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={full_name}
              onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, full_name: '' })); }}
              className={`w-full rounded-xl border bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-50 text-right placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                fieldErrors.full_name ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:ring-slate-400'
              }`}
              placeholder="שם מלא"
            />
            {fieldErrors.full_name && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.full_name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">אימייל <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
              className={`w-full rounded-xl border bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-50 text-right placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                fieldErrors.email ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:ring-slate-400'
              }`}
              placeholder="user@example.com"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">סיסמה <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
              className={`w-full rounded-xl border bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-50 text-right placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                fieldErrors.password ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:ring-slate-400'
              }`}
              placeholder="לפחות 8 תווים"
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">תפקיד</label>
            <select
              dir="rtl"
              value={role_display}
              onChange={(e) => setRoleDisplay(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-50 text-right focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {ROLE_DISPLAY_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2 flex-row-reverse justify-start">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {submitting ? 'מוסיף…' : 'הוסף איש צוות'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditRoleModal({
  member,
  onClose,
  onSaved,
  onError,
}: {
  member: TeamMember;
  onClose: () => void;
  onSaved: (user_id: string, role_display: string) => void;
  onError: (msg: string) => void;
}) {
  const [role_display, setRoleDisplay] = useState(() => getRoleDisplay(member.role, member.job_title));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: member.user_id, role_display }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSaved(member.user_id, role_display);
      } else {
        onError(data.error ?? 'עדכון נכשל');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="modal-enter w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex-row-reverse">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 text-right">ערוך תפקיד</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-right">{member.full_name || member.email}</p>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-right mb-1.5">תפקיד</label>
            <select
              dir="rtl"
              value={role_display}
              onChange={(e) => setRoleDisplay(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-50 text-right focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {ROLE_DISPLAY_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2 flex-row-reverse justify-start">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {submitting ? 'שומר…' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConfirmRemoveModal({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="modal-enter w-full max-w-md rounded-2xl border border-red-200/50 dark:border-red-900/40 bg-white dark:bg-slate-950 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 text-right">הסר איש צוות</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 text-right">האם להסיר את איש הצוות מהעסק? הוא לא יוכל לגשת שוב.</p>
        <div className="mt-6 flex gap-3 flex-row-reverse justify-start">
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60">
            ביטול
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-xl bg-red-600 dark:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-60">
            {loading ? 'מוחק…' : 'הסר'}
          </button>
        </div>
      </div>
    </div>
  );
}
