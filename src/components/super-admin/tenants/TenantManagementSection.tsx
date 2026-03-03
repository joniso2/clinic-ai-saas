'use client';

/**
 * Section 2 — Tenant Management
 * Full CRUD + impersonation for all tenants. Self-contained state isolation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Plus, LogIn, UserPlus, Key, Power, PowerOff,
  Trash2, Pencil, X, Copy, Building2, ChevronDown,
  ShieldOff, Shield, Users, AlertTriangle, UserCheck,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantRow {
  id: string;
  name: string | null;
  plan_id: string | null;
  status: string;
  leads_count: number;
  appointments_count: number;
  discord_connected: boolean;
}

interface PlanOption {
  id: string;
  name: string;
  price_monthly: number | null;
}

interface TenantUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  last_sign_in_at: string | null;
  banned_until?: string;
}

interface ServiceRow {
  id: string;
  service_name: string;
  price: number;
  aliases: string[];
  is_active: boolean;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isActive = status !== 'inactive';
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
      isActive
        ? 'bg-emerald-400/10 text-emerald-400'
        : 'bg-zinc-700 text-zinc-400'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      {isActive ? 'פעיל' : 'מושבת'}
    </span>
  );
}

// ─── Health dot ───────────────────────────────────────────────────────────────
function HealthDot({ status, discord }: { status: string; discord: boolean }) {
  const color = status === 'inactive' ? 'bg-red-500' : discord ? 'bg-emerald-500' : 'bg-amber-500';
  const label = status === 'inactive' ? 'מושבת' : discord ? 'תקין' : 'חלקי';
  return <span className={`inline-flex h-2.5 w-2.5 rounded-full ${color}`} title={label} />;
}

// ─── Shared toast ─────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TenantManagementSection() {
  const { toast, show } = useToast();

  // List state
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actingUser, setActingUser] = useState<string | null>(null);

  // Create tenant modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<{
    clinic: { id: string; name: string };
    email: string;
    temporary_password: string;
  } | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [fName, setFName] = useState('');
  const [fPlan, setFPlan] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fFullName, setFFullName] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [fPhone, setFPhone] = useState('');

  // Edit plan modal
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editPlanTenant, setEditPlanTenant] = useState<TenantRow | null>(null);
  const [editPlanValue, setEditPlanValue] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Drawer state
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'users' | 'pricing'>('users');
  const [drawerUsers, setDrawerUsers] = useState<TenantUser[]>([]);
  const [drawerServices, setDrawerServices] = useState<ServiceRow[]>([]);

  // Create user (inside drawer)
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [fuEmail, setFuEmail] = useState('');
  const [fuName, setFuName] = useState('');
  const [fuRole, setFuRole] = useState<'STAFF' | 'CLINIC_ADMIN'>('STAFF');
  const [fuPassword, setFuPassword] = useState('');

  // Service modal (inside pricing tab)
  const [svcModal, setSvcModal] = useState<'add' | 'edit' | null>(null);
  const [editingSvc, setEditingSvc] = useState<ServiceRow | null>(null);
  const [svName, setSvName] = useState('');
  const [svPrice, setSvPrice] = useState('');
  const [svAliases, setSvAliases] = useState('');
  const [svActive, setSvActive] = useState(true);
  const [savingSvc, setSavingSvc] = useState(false);

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/clinics');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'שגיאה');
      setTenants(data.clinics ?? []);
    } catch (e) { show((e as Error).message); }
    finally { setLoading(false); }
  }, [show]);

  const fetchPlans = useCallback(async () => {
    const res = await fetch('/api/admin/plans');
    if (!res.ok) return;
    const data = await res.json();
    setPlans(data.plans ?? []);
  }, []);

  const fetchDrawerUsers = useCallback(async (id: string) => {
    const res = await fetch(`/api/super-admin/clinic-users?clinic_id=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const data = await res.json();
    setDrawerUsers(data.users ?? []);
  }, []);

  const fetchDrawerServices = useCallback(async (id: string) => {
    const res = await fetch(`/api/super-admin/services?clinic_id=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const data = await res.json();
    setDrawerServices(data.services ?? []);
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);
  useEffect(() => { if (createOpen) fetchPlans(); }, [createOpen, fetchPlans]);
  useEffect(() => { if (drawerId) fetchDrawerUsers(drawerId); }, [drawerId, fetchDrawerUsers]);
  useEffect(() => {
    if (drawerId && drawerTab === 'pricing') fetchDrawerServices(drawerId);
  }, [drawerId, drawerTab, fetchDrawerServices]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = tenants;
    if (search) list = list.filter((t) => (t.name ?? '').toLowerCase().includes(search.toLowerCase()));
    if (statusFilter === 'active') list = list.filter((t) => t.status !== 'inactive');
    if (statusFilter === 'inactive') list = list.filter((t) => t.status === 'inactive');
    return list;
  }, [tenants, search, statusFilter]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleImpersonate = async (id: string) => {
    setActingUser(id);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: id }),
      });
      if (!res.ok) { show('כניסה כקליניקה נכשלה'); return; }
      window.location.href = '/dashboard';
    } finally { setActingUser(null); }
  };

  const handleToggleStatus = async (t: TenantRow) => {
    const newStatus = t.status === 'inactive' ? 'active' : 'inactive';
    const res = await fetch('/api/admin/clinic-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic_id: t.id, status: newStatus }),
    });
    if (!res.ok) { show('שינוי סטטוס נכשל'); return; }
    show(newStatus === 'inactive' ? 'הקליניקה הושבתה' : 'הקליניקה הופעלה');
    fetchTenants();
  };

  const handleCreateTenant = async () => {
    if (!fName.trim() || !fEmail.trim()) { show('שם וכתובת מייל חובה'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/create-clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fName.trim(), plan_id: fPlan || null,
          admin_email: fEmail.trim(), admin_full_name: fFullName.trim() || null,
          admin_password: fPassword.trim() || undefined, phone: fPhone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { show(data.error ?? 'יצירה נכשלה'); return; }
      setCreateSuccess({ clinic: data.clinic, email: data.admin?.email ?? fEmail, temporary_password: data.temporary_password ?? '' });
      setFName(''); setFPlan(''); setFEmail(''); setFFullName(''); setFPassword(''); setFPhone('');
      fetchTenants();
    } catch { show('שגיאה'); }
    finally { setCreating(false); }
  };

  const handleSavePlan = async () => {
    if (!editPlanTenant) return;
    setSavingPlan(true);
    try {
      // NOTE: Requires PATCH /api/admin/clinic-plan endpoint (build when backend ready)
      show('עדכון תכנית — בקרוב');
    } finally { setSavingPlan(false); setEditPlanOpen(false); }
  };

  const handleCreateUser = async () => {
    if (!drawerId || !fuEmail.trim()) return;
    setCreatingUser(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: drawerId, email: fuEmail.trim(), full_name: fuName.trim() || undefined, role: fuRole, password: fuPassword.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { show(data.error ?? 'יצירה נכשלה'); return; }
      show('המשתמש נוצר');
      setCreateUserOpen(false); setFuEmail(''); setFuName(''); setFuRole('STAFF'); setFuPassword('');
      fetchDrawerUsers(drawerId);
    } catch { show('שגיאה'); }
    finally { setCreatingUser(false); }
  };

  const handleUpdateRole = async (userId: string, role: 'STAFF' | 'CLINIC_ADMIN') => {
    if (!drawerId) return;
    const res = await fetch('/api/admin/update-role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, clinic_id: drawerId, role }),
    });
    if (!res.ok) { show('עדכון תפקיד נכשל'); return; }
    show('התפקיד עודכן'); fetchDrawerUsers(drawerId);
  };

  const handleResetPwd = async (userId: string) => {
    const pwd = prompt('סיסמה חדשה (לפחות 8 תווים):');
    if (!pwd || pwd.length < 8) return;
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, new_password: pwd }),
    });
    if (!res.ok) { show('איפוס סיסמה נכשל'); return; }
    show('הסיסמה עודכנה');
  };

  const handleToggleUser = async (userId: string, disable: boolean) => {
    const res = await fetch('/api/admin/disable-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, disable }),
    });
    if (!res.ok) { show(disable ? 'השבתה נכשלה' : 'הפעלה נכשלה'); return; }
    show(disable ? 'המשתמש הושבת' : 'המשתמש הופעל');
    if (drawerId) fetchDrawerUsers(drawerId);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!drawerId || !confirm('להסיר משתמש זה?')) return;
    const res = await fetch(`/api/admin/delete-user?user_id=${encodeURIComponent(userId)}&clinic_id=${encodeURIComponent(drawerId)}`, { method: 'DELETE' });
    if (!res.ok) { show('הסרה נכשלה'); return; }
    show('המשתמש הוסר'); fetchDrawerUsers(drawerId);
  };

  const handleAddService = async () => {
    if (!drawerId || !svName.trim()) return;
    setSavingSvc(true);
    try {
      const res = await fetch('/api/super-admin/services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: drawerId, service_name: svName.trim(), price: Number(svPrice), aliases: svAliases.split(',').map((s) => s.trim()).filter(Boolean), is_active: svActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'שגיאה');
      show('השירות נוסף'); setSvcModal(null); setSvName(''); setSvPrice(''); setSvAliases(''); setSvActive(true);
      fetchDrawerServices(drawerId);
    } catch (e) { show((e as Error).message); }
    finally { setSavingSvc(false); }
  };

  const handleUpdateService = async () => {
    if (!editingSvc || !drawerId) return;
    setSavingSvc(true);
    try {
      const res = await fetch(`/api/super-admin/services/${editingSvc.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_name: svName.trim(), price: Number(svPrice), aliases: svAliases.split(',').map((s) => s.trim()).filter(Boolean), is_active: svActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'שגיאה');
      show('השירות עודכן'); setSvcModal(null); setEditingSvc(null);
      fetchDrawerServices(drawerId);
    } catch (e) { show((e as Error).message); }
    finally { setSavingSvc(false); }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('למחוק שירות?') || !drawerId) return;
    await fetch(`/api/super-admin/services/${id}`, { method: 'DELETE' });
    show('השירות נמחק'); fetchDrawerServices(drawerId);
  };

  const handleToggleService = async (s: ServiceRow) => {
    if (!drawerId) return;
    await fetch(`/api/super-admin/services/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !s.is_active }) });
    show(s.is_active ? 'הושבת' : 'הופעל'); fetchDrawerServices(drawerId);
  };

  const drawerTenant = tenants.find((t) => t.id === drawerId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="min-w-0 flex-1 text-right">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-zinc-100 mb-2">מרכז ניהול לקוחות</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">ניהול מלא של כל הלקוחות — סטטוס, תכנית, משתמשים ופעולות.</p>
          </div>
          <button
            type="button"
            onClick={() => { setCreateOpen(true); setCreateSuccess(null); }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-sm font-semibold transition-colors flex-row-reverse"
          >
            <Plus className="h-4 w-4" />
            לקוח חדש
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative min-w-[220px]">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="חיפוש לפי שם..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pe-10 ps-4 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 text-right"
          />
        </div>
        <select
          className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 ps-4 pe-4 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 text-right"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">כל הסטטוסים</option>
          <option value="active">פעיל בלבד</option>
          <option value="inactive">מושבת בלבד</option>
        </select>
        <div className="flex items-center gap-2 text-sm text-zinc-400 me-auto">
          <span className="tabular-nums">{filtered.length}</span> לקוחות
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right" dir="rtl">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800">
                {['שם לקוח','סטטוס','תכנית','לידים','תורים','Discord','פעולות'].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800/60">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="py-3 px-4 text-right">
                        <div className="h-4 rounded bg-zinc-800 animate-pulse" style={{ width: `${40 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-zinc-400">
                    <Building2 className="h-8 w-8 text-zinc-500 ms-auto me-auto mb-2 block" />
                    <p className="text-sm font-medium">אין לקוחות</p>
                    <p className="text-xs text-zinc-500 mt-1">צור לקוח חדש כדי להתחיל</p>
                  </td>
                </tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-zinc-100 text-right">{t.name ?? t.id}</td>
                  <td className="py-3 px-4 text-right"><StatusBadge status={t.status} /></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center gap-1.5 flex-row-reverse justify-end">
                      <span className="text-zinc-300 text-xs">{t.plan_id ? plans.find((p) => p.id === t.plan_id)?.name ?? t.plan_id : '—'}</span>
                      <button type="button" onClick={() => { setEditPlanTenant(t); setEditPlanValue(t.plan_id ?? ''); setEditPlanOpen(true); }} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300">
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 tabular-nums text-zinc-300 text-right">{t.leads_count}</td>
                  <td className="py-3 px-4 tabular-nums text-zinc-300 text-right">{t.appointments_count}</td>
                  <td className="py-3 px-4 text-right"><HealthDot status={t.status} discord={t.discord_connected} /></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center gap-1.5 flex-row-reverse justify-end">
                      <button
                        type="button"
                        onClick={() => { setDrawerId(t.id); setDrawerTab('users'); }}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                      >
                        <Users className="h-3.5 w-3.5" />ניהול
                      </button>
                      <button
                        type="button"
                        onClick={() => handleImpersonate(t.id)}
                        disabled={!!actingUser}
                        title="התחבר כלקוח"
                        className="p-1.5 rounded-lg bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 disabled:opacity-40 transition-colors"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(t)}
                        title={t.status === 'inactive' ? 'הפעל' : 'השבת'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          t.status === 'inactive'
                            ? 'bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400'
                            : 'bg-red-900/20 hover:bg-red-900/40 text-red-400'
                        }`}
                      >
                        {t.status === 'inactive' ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create tenant modal ─────────────────────────────────────────────── */}
      {createOpen && !createSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setCreateOpen(false)}>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl max-w-md w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-100 mb-5">יצירת לקוח חדש</h3>
            <div className="space-y-3">
              {[
                { label: 'שם קליניקה *', type: 'text', val: fName, set: setFName, ph: 'שם הקליניקה' },
                { label: 'אימייל מנהל ראשי *', type: 'email', val: fEmail, set: setFEmail, ph: 'admin@clinic.com' },
                { label: 'שם מלא מנהל', type: 'text', val: fFullName, set: setFFullName, ph: 'ישראל ישראלי' },
                { label: 'סיסמה זמנית', type: 'text', val: fPassword, set: setFPassword, ph: 'לפחות 8 תווים (ריק = אוטומטי)' },
                { label: 'טלפון', type: 'tel', val: fPhone, set: setFPhone, ph: '050-0000000' },
              ].map(({ label, type, val, set, ph }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
                  <input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">תוכנית מנוי</label>
                <select value={fPlan} onChange={(e) => setFPlan(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500">
                  <option value="">— ללא תכנית —</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.price_monthly != null ? ` — ${p.price_monthly} ₪` : ''}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm font-medium">ביטול</button>
              <button type="button" onClick={handleCreateTenant} disabled={creating || !fName.trim() || !fEmail.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                {creating ? 'יוצר…' : 'צור לקוח'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create success */}
      {createOpen && createSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => { setCreateOpen(false); setCreateSuccess(null); }}>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl max-w-md w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-1 text-center">הלקוח נוצר בהצלחה!</h3>
            <p className="text-sm text-zinc-400 text-center mb-5">{createSuccess.clinic.name}</p>
            <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-4 text-sm text-zinc-200 space-y-1 mb-5">
              <p>אימייל: <span className="font-mono text-zinc-100">{createSuccess.email}</span></p>
              <p>סיסמה זמנית: <span className="font-mono text-zinc-100">{createSuccess.temporary_password}</span></p>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => { navigator.clipboard.writeText(`אימייל: ${createSuccess.email}\nסיסמה: ${createSuccess.temporary_password}`); show('הועתק'); }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
                <Copy className="h-4 w-4" />העתק פרטי כניסה
              </button>
              <button type="button" onClick={() => handleImpersonate(createSuccess.clinic.id)} disabled={!!actingUser}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                <LogIn className="h-4 w-4" />{actingUser ? 'מעבר…' : 'כנס כלקוח'}
              </button>
              <button type="button" onClick={() => { setCreateOpen(false); setCreateSuccess(null); }}
                className="w-full rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800">סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit plan modal */}
      {editPlanOpen && editPlanTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setEditPlanOpen(false)}>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl max-w-sm w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-100 mb-4">עריכת תכנית — {editPlanTenant.name}</h3>
            <select value={editPlanValue} onChange={(e) => setEditPlanValue(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500">
              <option value="">— ללא תכנית —</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.price_monthly != null ? ` — ${p.price_monthly} ₪` : ''}</option>)}
            </select>
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              שינוי תכנית ידרוש endpoint ייעודי
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button type="button" onClick={() => setEditPlanOpen(false)} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm">ביטול</button>
              <button type="button" onClick={handleSavePlan} disabled={savingPlan}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50">
                {savingPlan ? 'שומר…' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tenant drawer ──────────────────────────────────────────────────── */}
      {drawerId && (
        <div className="fixed inset-0 z-50 flex justify-start" dir="rtl">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerId(null)} />
          <div className="relative w-full max-w-2xl bg-zinc-950 border-s border-zinc-700 shadow-2xl flex flex-col overflow-y-auto">
            {/* Drawer header */}
            <div className="sticky top-0 z-10 border-b border-zinc-700 bg-zinc-950 px-6 py-4 flex items-center justify-between flex-row-reverse">
              <div className="text-right">
                <h3 className="text-base font-bold text-zinc-100">{drawerTenant?.name ?? 'לקוח'}</h3>
                {drawerTenant && <StatusBadge status={drawerTenant.status} />}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/super-admin/clinics/${drawerId}/customers`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  <UserCheck className="h-4 w-4" />לקוחות
                </Link>
                <button type="button" onClick={() => handleImpersonate(drawerId)} disabled={!!actingUser}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 transition-colors">
                  <LogIn className="h-4 w-4" />כניסה כלקוח
                </button>
                <button type="button" onClick={() => setDrawerId(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="h-5 w-5" /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-700 px-6">
              {(['users', 'pricing'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setDrawerTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    drawerTab === tab ? 'border-indigo-500 text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-300'
                  }`}>
                  {tab === 'users' ? 'משתמשים' : 'תמחור'}
                </button>
              ))}
            </div>

            <div className="p-6 flex-1">
              {/* Users tab */}
              {drawerTab === 'users' && (
                <>
                  <div className="flex flex-row-reverse justify-between items-center mb-5">
                    <button type="button" onClick={() => { setCreateUserOpen(true); setFuEmail(''); setFuName(''); setFuRole('STAFF'); setFuPassword(''); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-semibold transition-colors flex-row-reverse">
                      <UserPlus className="h-4 w-4" />יצירת משתמש
                    </button>
                  </div>
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-800/50">
                          {['שם','אימייל','תפקיד','סטטוס','כניסה אחרונה','פעולות'].map((h) => (
                            <th key={h} className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {drawerUsers.length === 0 ? (
                          <tr><td colSpan={6} className="py-10 text-center text-zinc-500">אין משתמשים</td></tr>
                        ) : drawerUsers.map((u) => (
                          <tr key={u.user_id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                            <td className="py-3 px-4 font-medium text-zinc-100">{u.full_name || '—'}</td>
                            <td className="py-3 px-4 text-zinc-400 text-xs">{u.email}</td>
                            <td className="py-3 px-4">
                              <select value={u.role} onChange={(e) => handleUpdateRole(u.user_id, e.target.value as 'STAFF' | 'CLINIC_ADMIN')}
                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200">
                                <option value="STAFF">צוות</option>
                                <option value="CLINIC_ADMIN">מנהל</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-medium ${u.banned_until ? 'text-red-400' : 'text-emerald-400'}`}>
                                {u.banned_until ? 'מושבת' : 'פעיל'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-500 text-xs">
                              {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('he-IL') : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1 justify-end flex-row-reverse">
                                <button type="button" onClick={() => handleResetPwd(u.user_id)} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300" title="איפוס סיסמה"><Key className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => handleToggleUser(u.user_id, !u.banned_until)} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300" title={u.banned_until ? 'הפעל' : 'השבת'}>
                                  {u.banned_until ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
                                </button>
                                <button type="button" onClick={() => handleDeleteUser(u.user_id)} className="p-1.5 rounded hover:bg-red-900/30 text-red-500" title="מחק"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Pricing tab */}
              {drawerTab === 'pricing' && (
                <>
                  <div className="flex flex-row-reverse justify-between items-center mb-5">
                    <button type="button"
                      onClick={() => { setSvcModal('add'); setEditingSvc(null); setSvName(''); setSvPrice(''); setSvAliases(''); setSvActive(true); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-semibold transition-colors flex-row-reverse">
                      <Plus className="h-4 w-4" />הוסף שירות
                    </button>
                  </div>
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-800/50">
                          {['שם שירות','מחיר','כינויים','סטטוס','פעולות'].map((h) => (
                            <th key={h} className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {drawerServices.length === 0 ? (
                          <tr><td colSpan={5} className="py-10 text-center text-zinc-500">אין שירותים</td></tr>
                        ) : drawerServices.map((s) => (
                          <tr key={s.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                            <td className="py-3 px-4 font-medium text-zinc-100">{s.service_name}</td>
                            <td className="py-3 px-4 text-zinc-300">{s.price} ₪</td>
                            <td className="py-3 px-4 text-zinc-500 text-xs">{(s.aliases ?? []).join(', ') || '—'}</td>
                            <td className="py-3 px-4">
                              <button type="button" onClick={() => handleToggleService(s)}
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.is_active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                {s.is_active ? 'פעיל' : 'מושבת'}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1 justify-end flex-row-reverse">
                                <button type="button" onClick={() => { setEditingSvc(s); setSvName(s.service_name); setSvPrice(String(s.price)); setSvAliases((s.aliases ?? []).join(', ')); setSvActive(s.is_active); setSvcModal('edit'); }}
                                  className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"><Pencil className="h-4 w-4" /></button>
                                <button type="button" onClick={() => handleDeleteService(s.id)} className="p-1.5 rounded hover:bg-red-900/30 text-red-500"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create user modal */}
      {createUserOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setCreateUserOpen(false)}>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl max-w-md w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-100 mb-4">יצירת משתמש חדש</h3>
            <div className="space-y-3">
              {[
                { label: 'אימייל *', type: 'email', val: fuEmail, set: setFuEmail },
                { label: 'שם מלא', type: 'text', val: fuName, set: setFuName },
                { label: 'סיסמה (ריק = אוטומטי)', type: 'text', val: fuPassword, set: setFuPassword },
              ].map(({ label, type, val, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
                  <input type={type} value={val} onChange={(e) => set(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">תפקיד</label>
                <select value={fuRole} onChange={(e) => setFuRole(e.target.value as 'STAFF' | 'CLINIC_ADMIN')}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none">
                  <option value="STAFF">צוות</option>
                  <option value="CLINIC_ADMIN">מנהל קליניקה</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button type="button" onClick={() => setCreateUserOpen(false)} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm">ביטול</button>
              <button type="button" onClick={handleCreateUser} disabled={creatingUser || !fuEmail.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50">
                {creatingUser ? 'יוצר…' : 'צור משתמש'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service modal */}
      {svcModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setSvcModal(null)}>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl max-w-sm w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-100 mb-4">{svcModal === 'add' ? 'הוסף שירות' : 'ערוך שירות'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">שם שירות</label>
                <input value={svName} onChange={(e) => setSvName(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">מחיר (₪)</label>
                <input type="number" value={svPrice} onChange={(e) => setSvPrice(e.target.value)} min="0" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">כינויים (פסיק)</label>
                <input value={svAliases} onChange={(e) => setSvAliases(e.target.value)} placeholder="ניקוי, שיננית" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={svActive} onChange={(e) => setSvActive(e.target.checked)} className="rounded border-zinc-600 bg-zinc-800" />
                <span className="text-sm text-zinc-300">פעיל</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button type="button" onClick={() => setSvcModal(null)} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm">ביטול</button>
              <button type="button" onClick={svcModal === 'add' ? handleAddService : handleUpdateService} disabled={savingSvc || !svName.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50">
                {savingSvc ? 'שומר…' : svcModal === 'add' ? 'הוסף' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-[70] rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-2.5 text-sm font-medium shadow-xl">
          {toast}
        </div>
      )}

      {/* Suppress unused icon lint */}
      <span className="sr-only hidden" aria-hidden="true"><ChevronDown className="h-0 w-0" /></span>
    </div>
  );
}
