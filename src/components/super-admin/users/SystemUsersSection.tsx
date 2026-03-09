'use client';

/**
 * Section 7 — System Users
 * Admin user management (SUPER_ADMIN role) + mock audit log.
 */

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Key, PowerOff, Power, Trash2, Shield, Clock, LogIn } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/dashboard/ConfirmDeleteModal';
import { btn, input, inputLabel } from '@/lib/ui-classes';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SystemUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  last_sign_in_at: string | null;
  banned_until?: string;
}

interface AuditEntry {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly target: string;
  readonly timestamp: string;
  readonly severity: 'info' | 'warning' | 'critical';
}

// ─── Mock audit log ────────────────────────────────────────────────────────────
const MOCK_AUDIT_LOG: AuditEntry[] = [
  { id: '1', actor: 'admin@system.com', action: 'impersonate_tenant', target: 'קליניקת ד"ר לוי', timestamp: new Date(Date.now() - 60_000 * 5).toISOString(), severity: 'warning' },
  { id: '2', actor: 'admin@system.com', action: 'create_tenant', target: 'מרפאת שלום', timestamp: new Date(Date.now() - 60_000 * 30).toISOString(), severity: 'info' },
  { id: '3', actor: 'admin@system.com', action: 'disable_user', target: 'user@example.com', timestamp: new Date(Date.now() - 60_000 * 60).toISOString(), severity: 'warning' },
  { id: '4', actor: 'admin@system.com', action: 'update_ai_config', target: 'global', timestamp: new Date(Date.now() - 60_000 * 120).toISOString(), severity: 'info' },
  { id: '5', actor: 'admin@system.com', action: 'delete_discord_mapping', target: 'Guild #123456789', timestamp: new Date(Date.now() - 60_000 * 240).toISOString(), severity: 'critical' },
  { id: '6', actor: 'admin@system.com', action: 'reset_password', target: 'staff@clinic.com', timestamp: new Date(Date.now() - 60_000 * 360).toISOString(), severity: 'warning' },
];

const ACTION_LABELS: Record<string, string> = {
  impersonate_tenant: 'כניסה כלקוח',
  create_tenant: 'יצירת לקוח',
  disable_user: 'השבתת משתמש',
  update_ai_config: 'עדכון הגדרות AI',
  delete_discord_mapping: 'מחיקת מיפוי Discord',
  reset_password: 'איפוס סיסמה',
};

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);
  return { toast, show };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SystemUsersSection() {
  const { toast, show } = useToast();

  // For the real admin users list we fetch all SUPER_ADMIN users.
  // Currently the API returns per-clinic users; we use mock + impersonate flow.
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fEmail, setFEmail] = useState('');
  const [fName, setFName] = useState('');
  const [fPwd, setFPwd] = useState('');
  const [actingUser, setActingUser] = useState<string | null>(null);
  const [deleteUserIdConfirm, setDeleteUserIdConfirm] = useState<string | null>(null);

  // Fetch all system-level admin users from any clinic they're linked to
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // We use the clinics list to get user data per tenant; for now show a placeholder
      // In production: add GET /api/super-admin/system-users endpoint that returns SUPER_ADMIN rows
      const res = await fetch('/api/super-admin/clinics');
      const data = await res.json().catch(() => ({}));
      // Seed with current user info from session as mock admin
      const clinics = data.clinics ?? [];
      if (clinics.length === 0) {
        setUsers([]);
      } else {
        // Mock a single super admin entry — replace with real endpoint
        setUsers([{
          user_id: 'super-admin-1',
          email: 'admin@system.com',
          full_name: 'Super Admin',
          role: 'SUPER_ADMIN',
          last_sign_in_at: new Date().toISOString(),
          banned_until: undefined,
        }]);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!fEmail.trim()) return;
    setCreating(true);
    try {
      // NOTE: Creating a SUPER_ADMIN requires a dedicated endpoint (build when backend ready)
      await new Promise((r) => setTimeout(r, 600));
      show('יצירת מנהל מערכת — ידרוש endpoint ייעודי');
      setCreateOpen(false);
      setFEmail(''); setFName(''); setFPwd('');
    } finally { setCreating(false); }
  };

  const handleImpersonate = async (userId: string) => {
    setActingUser(userId);
    show('מעבר — פיצ׳ר impersonate חל רק על לקוחות');
    setActingUser(null);
  };

  const handleReset = async (userId: string) => {
    const pwd = prompt('סיסמה חדשה:');
    if (!pwd || pwd.length < 8) return;
    await fetch('/api/admin/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, new_password: pwd }),
    });
    show('הסיסמה עודכנה');
  };

  const handleToggle = async (user: SystemUser) => {
    await fetch('/api/admin/disable-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.user_id, disable: !user.banned_until }),
    });
    show(user.banned_until ? 'הופעל' : 'הושבת');
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    show('מחיקת מנהל מערכת — ידרוש אישור נוסף');
  };

  const severityStyles: Record<AuditEntry['severity'], string> = {
    info:     'bg-slate-700 text-slate-300',
    warning:  'bg-amber-400/10 text-amber-400',
    critical: 'bg-red-400/10 text-red-400',
  };

  return (
    <div dir="rtl" className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="min-w-0 flex-1 text-right">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-right">משתמשי מערכת</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 text-right">ניהול מנהלי-על, תפקידים, הרשאות ויומן פעולות.</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)}
          className={`${btn.primary} flex-row-reverse`}>
          <UserPlus className="h-4 w-4" />הוסף מנהל מערכת
        </button>
      </div>

      {/* Admin users table */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2 flex-row-reverse">
          <Shield className="h-4 w-4 text-indigo-400" />
          מנהלי מערכת (SUPER_ADMIN)
        </h3>
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {['שם','אימייל','תפקיד','סטטוס','כניסה אחרונה','פעולות'].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">טוען…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">אין מנהלי מערכת</td></tr>
              ) : users.map((u) => (
                <tr key={u.user_id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-100">{u.full_name || '—'}</td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-300">
                      <Shield className="h-3 w-3" />{u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium ${u.banned_until ? 'text-red-400' : 'text-emerald-400'}`}>
                      {u.banned_until ? 'מושבת' : 'פעיל'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('he-IL') : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end flex-row-reverse">
                      <button type="button" onClick={() => handleImpersonate(u.user_id)} disabled={!!actingUser}
                        className="p-2 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors" title="חקיינות"><LogIn className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleReset(u.user_id)}
                        className="p-2 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors" title="איפוס סיסמה"><Key className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToggle(u)}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors" title={u.banned_until ? 'הפעל' : 'השבת'}>
                        {u.banned_until ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={() => setDeleteUserIdConfirm(u.user_id)}
                        className="p-1.5 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors" title="מחק"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit log */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2 flex-row-reverse">
          <Clock className="h-4 w-4 text-slate-400" />
          יומן פעולות (מוק)
        </h3>
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                {['שחקן','פעולה','יעד','רמת חומרה','זמן'].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_AUDIT_LOG.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">{entry.actor}</td>
                  <td className="py-3 px-4 text-slate-200">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{entry.target}</td>
                  <td className="py-3 px-4">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${severityStyles[entry.severity]}`}>
                      {entry.severity === 'info' ? 'מידע' : entry.severity === 'warning' ? 'אזהרה' : 'קריטי'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {new Date(entry.timestamp).toLocaleString('he-IL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create admin modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="modal-enter rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl max-w-sm w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-100 mb-5">הוסף מנהל מערכת</h3>
            <div className="space-y-3">
              {[
                { label: 'אימייל *', type: 'email', val: fEmail, set: setFEmail },
                { label: 'שם מלא', type: 'text', val: fName, set: setFName },
                { label: 'סיסמה זמנית', type: 'text', val: fPwd, set: setFPwd },
              ].map(({ label, type, val, set }) => (
                <div key={label}>
                  <label className={inputLabel}>{label}</label>
                  <input type={type} value={val} onChange={(e) => set(e.target.value)}
                    className={input} />
                </div>
              ))}
              <div className="rounded-lg bg-amber-400/10 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-300">
                יצירת מנהל מערכת תדרוש endpoint ייעודי (בקרוב)
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button type="button" onClick={() => setCreateOpen(false)} className={btn.secondary}>ביטול</button>
              <button type="button" onClick={handleCreate} disabled={creating || !fEmail.trim()}
                className={btn.primary}>
                {creating ? 'יוצר…' : 'צור'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteUserIdConfirm}
        title="מחיקת משתמש מערכת"
        message="האם למחוק משתמש מערכת זה? פעולה זו אינה הפיכה."
        onConfirm={() => { if (deleteUserIdConfirm) handleDelete(deleteUserIdConfirm); setDeleteUserIdConfirm(null); }}
        onCancel={() => setDeleteUserIdConfirm(null)}
      />

      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 px-4 py-2.5 text-sm font-medium shadow-xl">{toast}</div>
      )}
    </div>
  );
}
