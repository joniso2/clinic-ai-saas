'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, UserCheck, UserX, X, Users, Stethoscope, UserCircle, Shield } from 'lucide-react';

type TeamMember = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  job_title: string | null;
  banned_until: string | null;
  last_sign_in_at: string | null;
};

const ROLE_DISPLAY_OPTIONS = ['מנהל', 'רופא', 'מזכירה', 'תומך'] as const;

function getRoleDisplay(dbRole: string, jobTitle: string | null): string {
  if (dbRole === 'CLINIC_ADMIN') return 'מנהל';
  if (jobTitle && ROLE_DISPLAY_OPTIONS.includes(jobTitle as typeof ROLE_DISPLAY_OPTIONS[number])) return jobTitle;
  return 'צוות';
}

const ROLE_PERMISSIONS: Record<string, string> = {
  מנהל: 'גישה מלאה',
  רופא: 'לידים, תורים',
  מזכירה: 'לידים, תורים',
  תומך: 'צפייה מוגבלת',
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('STAFF');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = currentRole === 'CLINIC_ADMIN';

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/team', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'טעינת צוות נכשלה');
        setMembers([]);
        return;
      }
      setMembers(data.members ?? []);
      setCurrentRole(data.role ?? 'STAFF');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const countByRole = (roleDisplay: string) =>
    members.filter((m) => getRoleDisplay(m.role, m.job_title) === roleDisplay).length;

  const total = members.length;
  const doctors = countByRole('רופא');
  const secretaries = countByRole('מזכירה');
  const admins = countByRole('מנהל');

  return (
    <>
      <div className="mb-6 text-right">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">לוח בקרה</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 sm:text-3xl">צוות</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">ניהול משתמשים והרשאות למרפאה.</p>
        {canEdit && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-lg transition hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-zinc-400 focus:ring-offset-2 flex-row-reverse"
            >
              <Plus className="h-4 w-4" />
              הוסף איש צוות
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200/80 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400 text-right">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard icon={Users} value={total} label="סה״כ אנשי צוות" />
          <SummaryCard icon={Shield} value={admins} label="מנהלים" />
          <SummaryCard icon={Stethoscope} value={doctors} label="רופאים" />
          <SummaryCard icon={UserCircle} value={secretaries} label="מזכירות" />
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
        </div>
      )}

      {!loading && !error && members.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden ring-1 ring-slate-900/[0.03] dark:ring-white/[0.03]">
          <div className="overflow-x-auto overflow-y-visible" dir="rtl">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-700 bg-slate-100/95 dark:bg-zinc-800/95">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-right">שם</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-right">תפקיד</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-right">אימייל</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-right">סטטוס</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-right">הרשאות</th>
                  {canEdit && <th className="w-28 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-right">פעולות</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.user_id}
                    className="border-b border-slate-100 dark:border-zinc-800/50 transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-zinc-100">
                      {m.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                        {getRoleDisplay(m.role, m.job_title)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-zinc-400">{m.email}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          m.banned_until ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400'
                        }`}
                      >
                        {m.banned_until ? 'לא פעיל' : 'פעיל'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-zinc-400">
                      {ROLE_PERMISSIONS[getRoleDisplay(m.role, m.job_title)] ?? '—'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-row-reverse justify-end">
                          <button
                            type="button"
                            onClick={() => (m.banned_until ? handleEnable(m.user_id) : handleDisable(m.user_id))}
                            disabled={submitting}
                            className="rounded-lg p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
                            title={m.banned_until ? 'הפעל' : 'השבת'}
                          >
                            {m.banned_until ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRoleId(m.user_id)}
                            className="rounded-lg p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
                            title="ערוך תפקיד"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(m.user_id)}
                            className="rounded-lg p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="הסר מצוות"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-16 text-center">
          <p className="text-slate-700 dark:text-zinc-300 font-semibold">אין אנשי צוות מוגדרים.</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">הוסף את ראשון אנשי הצוות.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-md transition hover:bg-slate-800 dark:hover:bg-white"
            >
              <Plus className="h-4 w-4" />
              הוסף איש צוות
            </button>
          )}
        </div>
      )}

      {!loading && (members.length > 0 || error) && (
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 text-right mb-4">מדדי צוות</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-right">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">לידים שטופלו</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100 tabular-nums">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">זמן תגובה ממוצע</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100 tabular-nums">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">תורים שנקבעו</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100 tabular-nums">—</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-zinc-500 text-right">נתונים יוצגו כאשר יהיו זמינים.</p>
        </div>
      )}

      {addModalOpen && (
        <AddMemberModal
          onClose={() => setAddModalOpen(false)}
          onSaved={(member) => {
            setMembers((prev) => [member, ...prev]);
            setToast('איש צוות נוסף בהצלחה');
            setAddModalOpen(false);
          }}
          onError={(msg) => setToast(msg)}
        />
      )}

      {editRoleId && (
        <EditRoleModal
          member={members.find((m) => m.user_id === editRoleId)!}
          onClose={() => setEditRoleId(null)}
          onSaved={(user_id, role_display) => {
            setMembers((prev) =>
              prev.map((m) =>
                m.user_id === user_id ? { ...m, role: role_display === 'מנהל' ? 'CLINIC_ADMIN' : 'STAFF', job_title: role_display === 'מנהל' ? null : role_display } : m
              )
            );
            setToast('התפקיד עודכן');
            setEditRoleId(null);
          }}
          onError={(msg) => setToast(msg)}
        />
      )}

      {deleteId && (
        <ConfirmRemoveModal
          onConfirm={handleRemove}
          onCancel={() => setDeleteId(null)}
          loading={submitting}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </>
  );

  async function handleDisable(userId: string) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/team/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, disable: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, banned_until: 'banned' } : m)));
        setToast('המשתמש הושבת');
      } else {
        setToast(data.error ?? 'שגיאה');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnable(userId: string) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/team/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, disable: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, banned_until: null } : m)));
        setToast('המשתמש הופעל');
      } else {
        setToast(data.error ?? 'שגיאה');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: deleteId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user_id !== deleteId));
        setDeleteId(null);
        setToast('איש הצוות הוסר');
      } else {
        setToast(data.error ?? 'שגיאה בהסרה');
      }
    } finally {
      setSubmitting(false);
    }
  }
}

function SummaryCard({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-4 shadow-sm text-right">
      <Icon className="h-5 w-5 text-slate-400 dark:text-zinc-500 mb-2 ml-auto" />
      <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{value}</p>
      <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-0.5">{label}</p>
    </div>
  );
}

function AddMemberModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-5 py-4 flex-row-reverse">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 text-right">הוסף איש צוות</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">שם מלא <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={full_name}
              onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, full_name: '' })); }}
              className={`w-full rounded-xl border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                fieldErrors.full_name ? 'border-red-400' : 'border-slate-200 dark:border-zinc-700 focus:ring-slate-400'
              }`}
              placeholder="שם מלא"
            />
            {fieldErrors.full_name && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.full_name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">אימייל <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
              className={`w-full rounded-xl border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                fieldErrors.email ? 'border-red-400' : 'border-slate-200 dark:border-zinc-700 focus:ring-slate-400'
              }`}
              placeholder="user@example.com"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">סיסמה <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
              className={`w-full rounded-xl border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                fieldErrors.password ? 'border-red-400' : 'border-slate-200 dark:border-zinc-700 focus:ring-slate-400'
              }`}
              placeholder="לפחות 8 תווים"
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">תפקיד</label>
            <select
              dir="rtl"
              value={role_display}
              onChange={(e) => setRoleDisplay(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {ROLE_DISPLAY_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2 flex-row-reverse justify-start">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-60">
              {submitting ? 'מוסיף…' : 'הוסף איש צוות'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRoleModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-5 py-4 flex-row-reverse">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 text-right">ערוך תפקיד</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-zinc-400 text-right">{member.full_name || member.email}</p>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">תפקיד</label>
            <select
              dir="rtl"
              value={role_display}
              onChange={(e) => setRoleDisplay(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {ROLE_DISPLAY_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2 flex-row-reverse justify-start">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-60">
              {submitting ? 'שומר…' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmRemoveModal({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-red-200/50 dark:border-red-900/40 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 text-right">הסר איש צוות</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 text-right">האם להסיר את איש הצוות מהמרפאה? הוא לא יוכל לגשת שוב.</p>
        <div className="mt-6 flex gap-3 flex-row-reverse justify-start">
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-60">
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
