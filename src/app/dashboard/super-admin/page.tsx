'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  DollarSign,
  Link2,
  Activity,
  Brain,
  Users,
  Settings,
  Search,
  Plus,
  Pencil,
  Trash2,
  LayoutDashboard,
  BarChart3,
  Bot,
  X,
  Copy,
  LogIn,
  UserPlus,
  Key,
  Power,
  PowerOff,
  } from 'lucide-react';

type ClinicRow = {
  id: string;
  name: string | null;
  plan_id?: string | null;
  status?: string;
  leads_count: number;
  appointments_count: number;
  discord_connected: boolean;
};

type PlanOption = { id: string; name: string; price_monthly: number | null };

type DiscordMapping = {
  id: string;
  guild_id: string;
  clinic_id: string;
  clinic_name: string;
};

type ServiceRow = {
  id: string;
  service_name: string;
  price: number;
  aliases: string[];
  is_active: boolean;
};

type Stats = {
  active_clinics: number;
  total_leads: number;
  total_appointments: number;
  total_users: number;
  daily_ai_usage: number;
  discord_conversations: number;
  whatsapp_conversations: number;
};

const SECTIONS = [
  { id: 'overview', label: 'סקירה', icon: LayoutDashboard },
  { id: 'clinics', label: 'קליניקות', icon: Building2 },
  { id: 'pricing', label: 'תמחור גלובלי', icon: DollarSign },
  { id: 'integrations', label: 'אינטגרציות', icon: Link2 },
  { id: 'traffic', label: 'תעבורה וביצועים', icon: Activity },
  { id: 'ai', label: 'AI & מודלים', icon: Brain },
  { id: 'users', label: 'משתמשים והרשאות', icon: Users },
  { id: 'settings', label: 'הגדרות מערכת', icon: Settings },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function SuperAdminPage() {
  const [section, setSection] = useState<SectionId>('overview');
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [clinicSearch, setClinicSearch] = useState('');
  const [mappings, setMappings] = useState<DiscordMapping[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceModal, setServiceModal] = useState<'add' | 'edit' | null>(null);
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [discordModal, setDiscordModal] = useState(false);
  const [formGuildId, setFormGuildId] = useState('');
  const [formClinicId, setFormClinicId] = useState('');
  const [formServiceName, setFormServiceName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [createClinicOpen, setCreateClinicOpen] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [formName, setFormName] = useState('');
  const [formPlanId, setFormPlanId] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminFullName, setFormAdminFullName] = useState('');
  const [formAdminPassword, setFormAdminPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [createClinicSuccess, setCreateClinicSuccess] = useState<{ clinic: { id: string; name: string }; email: string; temporary_password: string } | null>(null);
  const [clinicDrawerId, setClinicDrawerId] = useState<string | null>(null);
  const [clinicDrawerTab, setClinicDrawerTab] = useState<'users' | 'pricing'>('users');
  const [clinicUsers, setClinicUsers] = useState<{ user_id: string; email: string; full_name: string | null; role: string; last_sign_in_at: string | null; banned_until?: string }[]>([]);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [formUserEmail, setFormUserEmail] = useState('');
  const [formUserFullName, setFormUserFullName] = useState('');
  const [formUserRole, setFormUserRole] = useState<'STAFF' | 'CLINIC_ADMIN'>('STAFF');
  const [formUserPassword, setFormUserPassword] = useState('');
  const [creatingClinic, setCreatingClinic] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [actingUser, setActingUser] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchClinics = useCallback(async () => {
    const res = await fetch('/api/super-admin/clinics');
    if (!res.ok) throw new Error('Failed to load clinics');
    const data = await res.json();
    setClinics(data.clinics ?? []);
  }, []);

  const fetchMappings = useCallback(async () => {
    const res = await fetch('/api/super-admin/discord');
    if (!res.ok) throw new Error('Failed to load Discord');
    const data = await res.json();
    setMappings(data.mappings ?? []);
  }, []);

  const fetchServices = useCallback(async (clinicId: string) => {
    const res = await fetch(`/api/super-admin/services?clinic_id=${encodeURIComponent(clinicId)}`);
    if (!res.ok) throw new Error('Failed to load services');
    const data = await res.json();
    setServices(data.services ?? []);
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/super-admin/stats');
    if (!res.ok) throw new Error('Failed to load stats');
    const data = await res.json();
    setStats(data);
  }, []);

  const fetchPlans = useCallback(async () => {
    const res = await fetch('/api/admin/plans');
    if (!res.ok) return;
    const data = await res.json();
    setPlans(data.plans ?? []);
  }, []);

  const fetchClinicUsers = useCallback(async (clinicId: string) => {
    const res = await fetch(`/api/super-admin/clinic-users?clinic_id=${encodeURIComponent(clinicId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setClinicUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    if (createClinicOpen) fetchPlans();
  }, [createClinicOpen, fetchPlans]);

  useEffect(() => {
    if (clinicDrawerId) fetchClinicUsers(clinicDrawerId);
  }, [clinicDrawerId, fetchClinicUsers]);

  useEffect(() => {
    if (clinicDrawerId && clinicDrawerTab === 'pricing') {
      setSelectedClinicId(clinicDrawerId);
      fetchServices(clinicDrawerId);
    }
  }, [clinicDrawerId, clinicDrawerTab, fetchServices]);

  const handleCreateClinic = async () => {
    if (!formName.trim() || !formAdminEmail.trim()) {
      showToast('שם קליניקה ואימייל מנהל חובה');
      return;
    }
    setCreatingClinic(true);
    try {
      const res = await fetch('/api/admin/create-clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          plan_id: formPlanId || null,
          admin_email: formAdminEmail.trim(),
          admin_full_name: formAdminFullName.trim() || null,
          admin_password: formAdminPassword.trim() || undefined,
          phone: formPhone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error ?? 'יצירת קליניקה נכשלה');
        return;
      }
      setCreateClinicSuccess({
        clinic: data.clinic,
        email: data.admin?.email ?? formAdminEmail,
        temporary_password: data.temporary_password ?? '',
      });
      setFormName('');
      setFormPlanId('');
      setFormAdminEmail('');
      setFormAdminFullName('');
      setFormAdminPassword('');
      setFormPhone('');
      fetchClinics();
    } catch {
      showToast('שגיאה ביצירת קליניקה');
    } finally {
      setCreatingClinic(false);
    }
  };

  const handleImpersonate = async (clinicId: string) => {
    setActingUser(clinicId);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinicId }),
      });
      if (!res.ok) {
        showToast('כניסה כקליניקה נכשלה');
        return;
      }
      window.location.href = '/dashboard';
    } finally {
      setActingUser(null);
    }
  };

  const handleCreateUser = async () => {
    if (!clinicDrawerId || !formUserEmail.trim()) return;
    setCreatingUser(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: clinicDrawerId,
          email: formUserEmail.trim(),
          full_name: formUserFullName.trim() || undefined,
          role: formUserRole,
          password: formUserPassword.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error ?? 'יצירת משתמש נכשלה');
        return;
      }
      showToast('המשתמש נוצר');
      setCreateUserOpen(false);
      setFormUserEmail('');
      setFormUserFullName('');
      setFormUserRole('STAFF');
      setFormUserPassword('');
      fetchClinicUsers(clinicDrawerId);
    } catch {
      showToast('שגיאה');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: 'STAFF' | 'CLINIC_ADMIN') => {
    if (!clinicDrawerId) return;
    try {
      const res = await fetch('/api/admin/update-role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, clinic_id: clinicDrawerId, role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error ?? 'עדכון תפקיד נכשל');
        return;
      }
      showToast('התפקיד עודכן');
      fetchClinicUsers(clinicDrawerId);
    } catch {
      showToast('שגיאה');
    }
  };

  const handleResetPassword = async (userId: string) => {
    const pwd = prompt('סיסמה חדשה (לפחות 8 תווים):');
    if (!pwd || pwd.length < 8) return;
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_password: pwd }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error ?? 'איפוס סיסמה נכשל');
        return;
      }
      showToast('הסיסמה עודכנה');
    } catch {
      showToast('שגיאה');
    }
  };

  const handleDisableUser = async (userId: string, disable: boolean) => {
    try {
      const res = await fetch('/api/admin/disable-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, disable }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error ?? (disable ? 'השבתה נכשלה' : 'הפעלה נכשלה'));
        return;
      }
      showToast(disable ? 'המשתמש הושבת' : 'המשתמש הופעל');
      if (clinicDrawerId) fetchClinicUsers(clinicDrawerId);
    } catch {
      showToast('שגיאה');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!clinicDrawerId || !confirm('להסיר משתמש זה מהקליניקה?')) return;
    try {
      const res = await fetch(`/api/admin/delete-user?user_id=${encodeURIComponent(userId)}&clinic_id=${encodeURIComponent(clinicDrawerId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error ?? 'הסרה נכשלה');
        return;
      }
      showToast('המשתמש הוסר');
      fetchClinicUsers(clinicDrawerId);
    } catch {
      showToast('שגיאה');
    }
  };

  const copyLoginDetails = (email: string, password: string) => {
    navigator.clipboard.writeText(`אימייל: ${email}\nסיסמה: ${password}`);
    showToast('פרטי ההתחברות הועתקו');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchClinics();
        if (section === 'integrations') await fetchMappings();
        if (section === 'overview' || section === 'traffic') await fetchStats();
        if (section === 'pricing' && selectedClinicId) await fetchServices(selectedClinicId);
        if (section === 'overview') await fetchStats();
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [section, fetchClinics, fetchMappings, fetchStats, fetchServices, selectedClinicId]);

  useEffect(() => {
    if (section === 'pricing' && selectedClinicId) fetchServices(selectedClinicId);
  }, [section, selectedClinicId, fetchServices]);

  const filteredClinics = clinics.filter(
    (c) => !clinicSearch || (c.name ?? '').toLowerCase().includes(clinicSearch.toLowerCase())
  );

  const handleAddService = async () => {
    if (!selectedClinicId || !formServiceName.trim() || formPrice === '') return;
    setSaving(true);
    try {
      const res = await fetch('/api/super-admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: selectedClinicId,
          service_name: formServiceName.trim(),
          price: Number(formPrice),
          aliases: formAliases.split(',').map((s) => s.trim()).filter(Boolean),
          is_active: formActive,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      showToast('השירות נוסף בהצלחה');
      setServiceModal(null);
      setFormServiceName('');
      setFormPrice('');
      setFormAliases('');
      setFormActive(true);
      fetchServices(selectedClinicId);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/services/${editingService.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: formServiceName.trim(),
          price: Number(formPrice),
          aliases: formAliases.split(',').map((s) => s.trim()).filter(Boolean),
          is_active: formActive,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      showToast('השירות עודכן');
      setServiceModal(null);
      setEditingService(null);
      if (selectedClinicId) fetchServices(selectedClinicId);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('למחוק שירות זה?')) return;
    try {
      const res = await fetch(`/api/super-admin/services/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      showToast('השירות נמחק');
      if (selectedClinicId) fetchServices(selectedClinicId);
    } catch {
      showToast('שגיאה במחיקה');
    }
  };

  const handleToggleServiceActive = async (s: ServiceRow) => {
    try {
      const res = await fetch(`/api/super-admin/services/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !s.is_active }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast(s.is_active ? 'השירות הושבת' : 'השירות הופעל');
      if (selectedClinicId) fetchServices(selectedClinicId);
    } catch {
      showToast('שגיאה');
    }
  };

  const handleAddDiscord = async () => {
    if (!formGuildId.trim() || !formClinicId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/super-admin/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: formGuildId.trim(), clinic_id: formClinicId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      showToast('המיפוי נוסף');
      setDiscordModal(false);
      setFormGuildId('');
      setFormClinicId('');
      fetchMappings();
      fetchClinics();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDiscord = async (id: string) => {
    if (!confirm('להסיר מיפוי Discord?')) return;
    try {
      const res = await fetch(`/api/super-admin/discord?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      showToast('המיפוי הוסר');
      fetchMappings();
      fetchClinics();
    } catch {
      showToast('שגיאה');
    }
  };

  const openEditService = (s: ServiceRow) => {
    setEditingService(s);
    setFormServiceName(s.service_name);
    setFormPrice(String(s.price));
    setFormAliases((s.aliases ?? []).join(', '));
    setFormActive(s.is_active);
    setServiceModal('edit');
  };

  return (
    <div className="flex flex-col md:flex-row-reverse min-h-0 flex-1 gap-0">
      {/* Mobile: section tabs */}
      <div className="flex md:hidden gap-1 p-2 overflow-x-auto border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${section === id ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-zinc-100' : 'text-slate-500 dark:text-zinc-400'}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      {/* Sidebar — RTL right, desktop only */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col gap-0.5 border-e border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 rounded-s-xl shadow-sm">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all flex-row-reverse justify-end text-right ${
              section === id
                ? 'bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-4 py-6 md:px-6">
          {loading && section !== 'pricing' && section !== 'overview' && (
            <div className="flex items-center justify-center min-h-[200px] text-slate-500 dark:text-zinc-400">
              טוען…
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* סקירה (Overview) */}
          {section === 'overview' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 text-right">סקירה</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">סך קליניקות פעילות</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100">{stats?.active_clinics ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">סך משתמשים</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100">{stats?.total_users ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">סך לידים</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100">{stats?.total_leads ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">סך תורים</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100">{stats?.total_appointments ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">שימוש AI חודשי</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100">{stats?.daily_ai_usage ?? '0'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">שיחות Discord</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100">{stats?.discord_conversations ?? '0'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">שיחות WhatsApp</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100">{stats?.whatsapp_conversations ?? '0'}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 text-right mb-4">גרף צמיחה (30 יום)</h3>
                <div className="h-48 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-zinc-900/50 text-slate-400 dark:text-zinc-500 text-sm">גרף יופיע כאן</div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 text-right mb-4">נפח לידים לפי קליניקה</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredClinics.slice(0, 8).map((c) => (
                      <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-zinc-700/50 text-right flex-row-reverse">
                        <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">{c.name ?? c.id}</span>
                        <span className="text-sm text-slate-500 dark:text-zinc-400 tabular-nums">{c.leads_count}</span>
                      </div>
                    ))}
                    {filteredClinics.length === 0 && <p className="text-sm text-slate-500 dark:text-zinc-400 text-center py-4">אין נתונים</p>}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 text-right mb-4">חמש קליניקות מובילות (פעילות)</h3>
                  <div className="space-y-2">
                    {[...filteredClinics]
                      .sort((a, b) => (b.leads_count + b.appointments_count) - (a.leads_count + a.appointments_count))
                      .slice(0, 5)
                      .map((c) => (
                        <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-zinc-700/50 text-right flex-row-reverse">
                          <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">{c.name ?? c.id}</span>
                          <span className="text-xs text-slate-500 dark:text-zinc-400 tabular-nums">{c.leads_count} לידים · {c.appointments_count} תורים</span>
                        </div>
                      ))}
                    {filteredClinics.length === 0 && <p className="text-sm text-slate-500 dark:text-zinc-400 text-center py-4">אין נתונים</p>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {!loading && section === 'clinics' && (
            <section className="space-y-4">
              <div className="flex flex-row-reverse justify-between items-center gap-4 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">קליניקות</h2>
                <button
                  type="button"
                  onClick={() => { setCreateClinicOpen(true); setCreateClinicSuccess(null); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  צור קליניקה חדשה
                </button>
              </div>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="חיפוש קליניקה"
                  value={clinicSearch}
                  onChange={(e) => setClinicSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 pr-10 pl-4 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400"
                />
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80">
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">שם קליניקה</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">סטטוס</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">לידים</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">תורים</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">Discord</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClinics.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 px-4 text-center text-slate-500 dark:text-zinc-400">
                          אין קליניקות במערכת
                        </td>
                      </tr>
                    ) : (
                      filteredClinics.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 dark:border-zinc-700/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-zinc-100">{c.name ?? c.id}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              (c as ClinicRow).status === 'inactive' ? 'bg-slate-200 dark:bg-zinc-600 text-slate-600 dark:text-zinc-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              {(c as ClinicRow).status === 'inactive' ? 'מושבת' : 'פעיל'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-zinc-400">{c.leads_count}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-zinc-400">{c.appointments_count}</td>
                          <td className="py-3 px-4">
                            {c.discord_connected ? (
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs">מחובר</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 text-xs">לא מחובר</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => { setClinicDrawerId(c.id); setClinicDrawerTab('users'); }}
                              className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 text-xs font-medium"
                            >
                              ניהול
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === 'pricing' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">תמחור</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">בחר קליניקה לניהול תמחור</label>
                <select
                  value={selectedClinicId ?? ''}
                  onChange={(e) => setSelectedClinicId(e.target.value || null)}
                  className="w-full max-w-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-4 text-sm text-slate-900 dark:text-zinc-100"
                >
                  <option value="">— בחר קליניקה —</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
                  ))}
                </select>
              </div>
              {selectedClinicId && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-zinc-400">
                      {services.length} שירותים
                    </span>
                    <button
                      type="button"
                      onClick={() => { setServiceModal('add'); setEditingService(null); setFormServiceName(''); setFormPrice(''); setFormAliases(''); setFormActive(true); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      הוסף שירות
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80">
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">שם שירות</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">מחיר</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">כינויים</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">סטטוס</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-zinc-400">
                              אין שירותים. הוסף שירות לתמחור.
                            </td>
                          </tr>
                        ) : (
                          services.map((s) => (
                            <tr key={s.id} className="border-b border-slate-100 dark:border-zinc-700/50">
                              <td className="py-3 px-4 font-medium text-slate-900 dark:text-zinc-100">{s.service_name}</td>
                              <td className="py-3 px-4 text-slate-600 dark:text-zinc-400">{s.price} ₪</td>
                              <td className="py-3 px-4 text-slate-500 dark:text-zinc-500 text-xs">{(s.aliases ?? []).join(', ') || '—'}</td>
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleToggleServiceActive(s)}
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.is_active ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-zinc-600 text-slate-600 dark:text-zinc-400'}`}
                                >
                                  {s.is_active ? 'פעיל' : 'מושבת'}
                                </button>
                              </td>
                              <td className="py-3 px-4 flex gap-2 justify-end">
                                <button type="button" onClick={() => openEditService(s)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600" aria-label="עריכה"><Pencil className="h-4 w-4" /></button>
                                <button type="button" onClick={() => handleDeleteService(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600" aria-label="מחיקה"><Trash2 className="h-4 w-4" /></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}

          {!loading && section === 'integrations' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 text-right">אינטגרציות</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
                  <div className="flex items-center gap-3 flex-row-reverse justify-end">
                    <Bot className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
                    <div className="text-right">
                      <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Discord</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">מיפוי שרת־קליניקה</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-zinc-400 text-right">ניהול מיפויי Guild למטה.</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
                  <div className="flex items-center gap-3 flex-row-reverse justify-end">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <span className="text-emerald-600 dark:text-emerald-400 text-lg font-bold">W</span>
                    </div>
                    <div className="text-right">
                      <h3 className="font-semibold text-slate-900 dark:text-zinc-100">WhatsApp</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">API & Webhook</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-zinc-400 text-right">לא מחובר — יוגדר בהמשך.</p>
                </div>
              </div>
              {clinics.some((c) => !c.discord_connected) && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 text-right">
                  קליניקה שלא מופיעה למטה אינה מחוברת ל-Discord.
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setDiscordModal(true); setFormClinicId(clinics[0]?.id ?? ''); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-semibold shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  הוסף מיפוי
                </button>
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 text-right">מיפויי Discord</h3>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80">
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">מזהה שרת (Guild)</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">שם קליניקה</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">סטטוס</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-zinc-400">
                          אין מיפויי Discord
                        </td>
                      </tr>
                    ) : (
                      mappings.map((m) => (
                        <tr key={m.id} className="border-b border-slate-100 dark:border-zinc-700/50">
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-zinc-300">{m.guild_id}</td>
                          <td className="py-3 px-4 text-slate-900 dark:text-zinc-100">{m.clinic_name}</td>
                          <td className="py-3 px-4"><span className="text-emerald-600 dark:text-emerald-400 text-xs">מחובר</span></td>
                          <td className="py-3 px-4">
                            <button type="button" onClick={() => handleDeleteDiscord(m.id)} className="text-red-600 hover:underline text-xs">הסר</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === 'traffic' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 text-right">תעבורה וביצועים</h2>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 flex-row-reverse justify-end">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">מערכת פעילה</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-zinc-400 text-right">מדדי API, webhooks ו־LLM יופיעו כאן.</p>
              </div>
            </section>
          )}

          {section === 'ai' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 text-right">AI & מודלים</h2>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
                <p className="text-sm text-slate-500 dark:text-zinc-400 text-right">הגדרת מודל גלובלי, טמפרטורה, טוקנים ושליטה בפרומפטים לפי קליניקה.</p>
              </div>
            </section>
          )}

          {section === 'users' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 text-right">משתמשים והרשאות</h2>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
                <p className="text-sm text-slate-500 dark:text-zinc-400 text-right">צפייה בכל המשתמשים, קידום/הורדה, איפוס סיסמה וניהול קליניקות.</p>
              </div>
            </section>
          )}

          {section === 'settings' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 text-right">הגדרות מערכת</h2>
              <p className="text-slate-600 dark:text-zinc-400 text-sm text-right">הגדרות פלטפורמה יופיעו כאן.</p>
            </section>
          )}
        </div>
      </div>

      {/* Service modal */}
      {(serviceModal === 'add' || serviceModal === 'edit') && selectedClinicId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setServiceModal(null)}>
          <div className="rounded-2xl bg-white dark:bg-zinc-800 shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-4">{serviceModal === 'add' ? 'הוסף שירות' : 'ערוך שירות'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">שם שירות</label>
                <input type="text" value={formServiceName} onChange={(e) => setFormServiceName(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" placeholder="למשל: ניקוי שיניים" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">מחיר (₪)</label>
                <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">כינויים (מופרדים בפסיק)</label>
                <input type="text" value={formAliases} onChange={(e) => setFormAliases(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" placeholder="שיננית, ניקוי, אבנית" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-slate-300" />
                <span className="text-sm text-slate-700 dark:text-zinc-300">פעיל</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button type="button" onClick={() => setServiceModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-300 text-sm font-medium">ביטול</button>
              <button type="button" onClick={serviceModal === 'add' ? handleAddService : handleUpdateService} disabled={saving || !formServiceName.trim()} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold disabled:opacity-50">{saving ? 'שומר…' : (serviceModal === 'add' ? 'הוסף' : 'שמור')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Clinic modal */}
      {createClinicOpen && !createClinicSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCreateClinicOpen(false)}>
          <div className="rounded-2xl bg-white dark:bg-zinc-800 shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-700 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-4">צור קליניקה חדשה</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">שם קליניקה *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" placeholder="שם הקליניקה" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">תוכנית מנוי</label>
                <select value={formPlanId} onChange={(e) => setFormPlanId(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm">
                  <option value="">— ללא —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} {p.price_monthly != null ? `(${p.price_monthly} ₪)` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">אימייל מנהל ראשי *</label>
                <input type="email" value={formAdminEmail} onChange={(e) => setFormAdminEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" placeholder="admin@clinic.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">שם מלא מנהל</label>
                <input type="text" value={formAdminFullName} onChange={(e) => setFormAdminFullName(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" placeholder="ישראל ישראלי" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">סיסמה זמנית (ריק = אוטומטי)</label>
                <input type="text" value={formAdminPassword} onChange={(e) => setFormAdminPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" placeholder="לפחות 8 תווים" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">טלפון</label>
                <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" placeholder="050-0000000" />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button type="button" onClick={() => setCreateClinicOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-300 text-sm font-medium">ביטול</button>
              <button type="button" onClick={handleCreateClinic} disabled={creatingClinic || !formName.trim() || !formAdminEmail.trim()} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold disabled:opacity-50">{creatingClinic ? 'יוצר…' : 'צור קליניקה'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Clinic success */}
      {createClinicOpen && createClinicSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setCreateClinicOpen(false); setCreateClinicSuccess(null); }}>
          <div className="rounded-2xl bg-white dark:bg-zinc-800 shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-700 text-right" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 w-12 h-12 flex items-center justify-center mx-auto">
              <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-1">קליניקה נוצרה בהצלחה</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">{createClinicSuccess.clinic.name}</p>
            <div className="rounded-xl bg-slate-50 dark:bg-zinc-900/80 p-4 text-sm text-slate-700 dark:text-zinc-300 mb-4">
              <p>אימייל: {createClinicSuccess.email}</p>
              <p>סיסמה זמנית: {createClinicSuccess.temporary_password}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => copyLoginDetails(createClinicSuccess.email, createClinicSuccess.temporary_password)} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
                <Copy className="h-4 w-4" />
                העתק פרטי התחברות
              </button>
              <button type="button" onClick={() => handleImpersonate(createClinicSuccess.clinic.id)} disabled={!!actingUser} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                <LogIn className="h-4 w-4" />
                {actingUser ? 'מעבר…' : 'היכנס כקליניקה'}
              </button>
              <button type="button" onClick={() => { setCreateClinicOpen(false); setCreateClinicSuccess(null); }} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 px-4 py-2 text-sm text-slate-600 dark:text-zinc-400">סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* Clinic detail drawer */}
      {clinicDrawerId && (
        <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setClinicDrawerId(null); setCreateUserOpen(false); }} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-2xl overflow-y-auto flex flex-col">
            <div className="sticky top-0 border-b border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between flex-row-reverse">
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">{clinics.find((c) => c.id === clinicDrawerId)?.name ?? 'קליניקה'}</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => handleImpersonate(clinicDrawerId)} disabled={!!actingUser} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60" title="כניסה כקליניקה">
                  <LogIn className="h-4 w-4" />
                  כניסה כקליניקה
                </button>
                <button type="button" onClick={() => { setClinicDrawerId(null); setCreateUserOpen(false); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="flex border-b border-slate-200 dark:border-zinc-700">
              <button type="button" onClick={() => setClinicDrawerTab('users')} className={`px-4 py-3 text-sm font-medium ${clinicDrawerTab === 'users' ? 'border-b-2 border-slate-900 dark:border-zinc-100 text-slate-900 dark:text-zinc-100' : 'text-slate-500 dark:text-zinc-400'}`}>משתמשים</button>
              <button type="button" onClick={() => setClinicDrawerTab('pricing')} className={`px-4 py-3 text-sm font-medium ${clinicDrawerTab === 'pricing' ? 'border-b-2 border-slate-900 dark:border-zinc-100 text-slate-900 dark:text-zinc-100' : 'text-slate-500 dark:text-zinc-400'}`}>תמחור</button>
            </div>
            <div className="p-6 flex-1">
              {clinicDrawerTab === 'users' && (
                <>
                  <div className="flex flex-row-reverse justify-between items-center mb-4">
                    <button type="button" onClick={() => { setCreateUserOpen(true); setFormUserEmail(''); setFormUserFullName(''); setFormUserRole('STAFF'); setFormUserPassword(''); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-semibold">
                      <UserPlus className="h-4 w-4" />
                      יצירת משתמש חדש
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80">
                          <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">שם</th>
                          <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">אימייל</th>
                          <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">תפקיד</th>
                          <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">סטטוס</th>
                          <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">כניסה אחרונה</th>
                          <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clinicUsers.length === 0 ? (
                          <tr><td colSpan={6} className="py-8 text-center text-slate-500 dark:text-zinc-400">אין משתמשים</td></tr>
                        ) : (
                          clinicUsers.map((u) => (
                            <tr key={u.user_id} className="border-b border-slate-100 dark:border-zinc-700/50">
                              <td className="py-3 px-4 font-medium text-slate-900 dark:text-zinc-100">{u.full_name || '—'}</td>
                              <td className="py-3 px-4 text-slate-600 dark:text-zinc-400">{u.email}</td>
                              <td className="py-3 px-4">
                                <select value={u.role} onChange={(e) => handleUpdateRole(u.user_id, e.target.value as 'STAFF' | 'CLINIC_ADMIN')} className="rounded-lg border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs">
                                  <option value="STAFF">צוות</option>
                                  <option value="CLINIC_ADMIN">מנהל קליניקה</option>
                                </select>
                              </td>
                              <td className="py-3 px-4">
                                <span className={u.banned_until ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>{u.banned_until ? 'מושבת' : 'פעיל'}</span>
                              </td>
                              <td className="py-3 px-4 text-slate-500 dark:text-zinc-500 text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('he-IL') : '—'}</td>
                              <td className="py-3 px-4">
                                <div className="flex gap-1 justify-end flex-row-reverse">
                                  <button type="button" onClick={() => handleResetPassword(u.user_id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500" title="איפוס סיסמה"><Key className="h-3.5 w-3.5" /></button>
                                  <button type="button" onClick={() => handleDisableUser(u.user_id, !u.banned_until)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500" title={u.banned_until ? 'הפעל' : 'השבת'}>{u.banned_until ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}</button>
                                  <button type="button" onClick={() => handleDeleteUser(u.user_id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="מחק"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {clinicDrawerTab === 'pricing' && (
                <>
                  <div className="flex flex-row-reverse justify-between items-center mb-4">
                    <button type="button" onClick={() => { setSelectedClinicId(clinicDrawerId); setServiceModal('add'); setEditingService(null); setFormServiceName(''); setFormPrice(''); setFormAliases(''); setFormActive(true); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-semibold">
                      <Plus className="h-4 w-4" />
                      הוסף שירות
                    </button>
                  </div>
                  {selectedClinicId === clinicDrawerId && (
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
                      <table className="w-full text-sm text-right">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80">
                            <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">שם שירות</th>
                            <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">מחיר</th>
                            <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">כינויים</th>
                            <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">סטטוס</th>
                            <th className="py-3 px-4 font-semibold text-slate-700 dark:text-zinc-300">פעולות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {services.length === 0 ? (
                            <tr><td colSpan={5} className="py-8 text-center text-slate-500 dark:text-zinc-400">אין שירותים</td></tr>
                          ) : (
                            services.map((s) => (
                              <tr key={s.id} className="border-b border-slate-100 dark:border-zinc-700/50">
                                <td className="py-3 px-4 font-medium text-slate-900 dark:text-zinc-100">{s.service_name}</td>
                                <td className="py-3 px-4 text-slate-600 dark:text-zinc-400">{s.price} ₪</td>
                                <td className="py-3 px-4 text-slate-500 text-xs">{(s.aliases ?? []).join(', ') || '—'}</td>
                                <td className="py-3 px-4">
                                  <button type="button" onClick={() => handleToggleServiceActive(s)} className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.is_active ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{s.is_active ? 'פעיל' : 'מושבת'}</button>
                                </td>
                                <td className="py-3 px-4">
                                  <button type="button" onClick={() => openEditService(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil className="h-4 w-4" /></button>
                                  <button type="button" onClick={() => handleDeleteService(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {selectedClinicId !== clinicDrawerId && (
                    <p className="text-sm text-slate-500 dark:text-zinc-400 text-right">טוען תמחור…</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create User modal (inside drawer context) */}
      {createUserOpen && clinicDrawerId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setCreateUserOpen(false)}>
          <div className="rounded-2xl bg-white dark:bg-zinc-800 shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-700 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-4">יצירת משתמש חדש</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">אימייל *</label>
                <input type="email" value={formUserEmail} onChange={(e) => setFormUserEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" placeholder="user@clinic.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">שם מלא</label>
                <input type="text" value={formUserFullName} onChange={(e) => setFormUserFullName(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">תפקיד</label>
                <select value={formUserRole} onChange={(e) => setFormUserRole(e.target.value as 'STAFF' | 'CLINIC_ADMIN')} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm">
                  <option value="STAFF">צוות</option>
                  <option value="CLINIC_ADMIN">מנהל קליניקה</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">סיסמה (ריק = אוטומטי)</label>
                <input type="text" value={formUserPassword} onChange={(e) => setFormUserPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm" placeholder="לפחות 8 תווים" />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button type="button" onClick={() => setCreateUserOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-300 text-sm font-medium">ביטול</button>
              <button type="button" onClick={handleCreateUser} disabled={creatingUser || !formUserEmail.trim()} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold disabled:opacity-50">{creatingUser ? 'יוצר…' : 'צור משתמש'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Discord modal */}
      {discordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDiscordModal(false)}>
          <div className="rounded-2xl bg-white dark:bg-zinc-800 shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-4">הוסף מיפוי Discord</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Guild ID</label>
                <input type="text" value={formGuildId} onChange={(e) => setFormGuildId(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-mono" placeholder="מזהה שרת הדיסקורד" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">קליניקה</label>
                <select value={formClinicId} onChange={(e) => setFormClinicId(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm">
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button type="button" onClick={() => setDiscordModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-300 text-sm font-medium">ביטול</button>
              <button type="button" onClick={handleAddDiscord} disabled={saving || !formGuildId.trim()} className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold disabled:opacity-50">{saving ? 'שומר…' : 'הוסף'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
