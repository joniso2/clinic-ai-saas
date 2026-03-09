'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import type { TeamMember } from './team-types';
import { getRoleDisplay, ROLE_PERMISSIONS } from './team-types';
import {
  SummaryCard,
  AddMemberModal,
  EditRoleModal,
  ConfirmRemoveModal,
  Users,
  Stethoscope,
  UserCircle,
  Shield,
} from './team-components';

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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">לוח בקרה</p>
        <h1 className="mt-1 text-[28px] font-bold text-slate-900 dark:text-slate-50">צוות</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ניהול משתמשים והרשאות.</p>
        {canEdit && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex-row-reverse"
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
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-300" />
        </div>
      )}

      {!loading && !error && members.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 shadow-sm overflow-hidden ring-1 ring-slate-900/[0.03] dark:ring-white/[0.03]">
          <div className="overflow-x-auto overflow-y-visible" dir="rtl">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/95">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">שם</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">תפקיד</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">אימייל</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">סטטוס</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">הרשאות</th>
                  {canEdit && <th className="w-28 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">פעולות</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.user_id}
                    className="border-b border-slate-100 dark:border-slate-800/50 transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-50">
                      {m.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {getRoleDisplay(m.role, m.job_title)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">{m.email}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          m.banned_until ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400'
                        }`}
                      >
                        {m.banned_until ? 'לא פעיל' : 'פעיל'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400">
                      {ROLE_PERMISSIONS[getRoleDisplay(m.role, m.job_title)] ?? '—'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-row-reverse justify-end">
                          <button
                            type="button"
                            onClick={() => (m.banned_until ? handleEnable(m.user_id) : handleDisable(m.user_id))}
                            disabled={submitting}
                            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title={m.banned_until ? 'הפעל' : 'השבת'}
                          >
                            {m.banned_until ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRoleId(m.user_id)}
                            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 p-16 text-center">
          <p className="text-slate-700 dark:text-slate-300 font-semibold">אין אנשי צוות מוגדרים.</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">הוסף את ראשון אנשי הצוות.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              הוסף איש צוות
            </button>
          )}
        </div>
      )}

      {!loading && (members.length > 0 || error) && (
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 text-right mb-4">מדדי צוות</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-right">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">לידים שטופלו</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50 tabular-nums">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">זמן תגובה ממוצע</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50 tabular-nums">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">תורים שנקבעו</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50 tabular-nums">—</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-right">נתונים יוצגו כאשר יהיו זמינים.</p>
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
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-[70] rounded-xl border bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium shadow-xl whitespace-nowrap">
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
