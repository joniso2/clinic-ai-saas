'use client';

/**
 * Section 3 — Global Pricing
 * Plan tier overview + per-tenant service management.
 * Tier cards are mock (no plan CRUD API yet).
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, Zap, Building2, Crown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TierFeature {
  readonly label: string;
  readonly included: boolean;
}

interface PlanTier {
  readonly id: string;
  readonly name: string;
  readonly priceMonthly: number;
  readonly icon: typeof Zap;
  readonly color: string;
  readonly features: TierFeature[];
  readonly limits: { leads: number | 'unlimited'; users: number; ai_tokens: number | 'unlimited' };
}

interface TenantOption {
  id: string;
  name: string | null;
}

interface ServiceRow {
  id: string;
  service_name: string;
  price: number;
  aliases: string[];
  is_active: boolean;
}

// ─── Mock plan tiers (replace with DB fetch when backend ready) ───────────────
const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free', name: 'Free', priceMonthly: 0, icon: Zap, color: 'zinc',
    features: [{ label: 'עד 50 לידים/חודש', included: true }, { label: 'בוט Discord', included: true }, { label: 'תמיכה בסיסית', included: true }, { label: 'WhatsApp', included: false }, { label: 'Analytics מתקדם', included: false }],
    limits: { leads: 50, users: 2, ai_tokens: 50_000 },
  },
  {
    id: 'starter', name: 'Starter', priceMonthly: 299, icon: Zap, color: 'indigo',
    features: [{ label: 'עד 300 לידים/חודש', included: true }, { label: 'בוט Discord', included: true }, { label: 'WhatsApp', included: true }, { label: 'Analytics בסיסי', included: true }, { label: 'SLA 99.5%', included: false }],
    limits: { leads: 300, users: 5, ai_tokens: 300_000 },
  },
  {
    id: 'pro', name: 'Pro', priceMonthly: 799, icon: Crown, color: 'violet',
    features: [{ label: 'לידים ללא הגבלה', included: true }, { label: 'בוט Discord + WhatsApp', included: true }, { label: 'Analytics מתקדם', included: true }, { label: 'SLA 99.9%', included: true }, { label: 'תמיכה עדיפותית', included: true }],
    limits: { leads: 'unlimited', users: 20, ai_tokens: 'unlimited' },
  },
  {
    id: 'enterprise', name: 'Enterprise', priceMonthly: 0, icon: Building2, color: 'amber',
    features: [{ label: 'הכל ב-Pro', included: true }, { label: 'SLA מותאם', included: true }, { label: 'אינטגרציות ייחודיות', included: true }, { label: 'מנהל לקוח ייעודי', included: true }, { label: 'חיוב מותאם', included: true }],
    limits: { leads: 'unlimited', users: 'unlimited' as unknown as number, ai_tokens: 'unlimited' },
  },
];

const COLOR_MAP: Record<string, { card: string; badge: string; button: string }> = {
  zinc:    { card: 'border-zinc-700 bg-zinc-900',           badge: 'bg-zinc-700 text-zinc-200',          button: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100' },
  indigo:  { card: 'border-indigo-500/40 bg-indigo-950/40', badge: 'bg-indigo-500/20 text-indigo-300',   button: 'bg-indigo-600 hover:bg-indigo-500 text-white' },
  violet:  { card: 'border-violet-500/40 bg-violet-950/40', badge: 'bg-violet-500/20 text-violet-300',   button: 'bg-violet-600 hover:bg-violet-500 text-white' },
  amber:   { card: 'border-amber-500/40 bg-amber-950/30',   badge: 'bg-amber-500/20 text-amber-300',     button: 'bg-amber-600 hover:bg-amber-500 text-white' },
};

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);
  return { toast, show };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PricingSection() {
  const { toast, show } = useToast();

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loadingSvc, setLoadingSvc] = useState(false);

  const [svcModal, setSvcModal] = useState<'add' | 'edit' | null>(null);
  const [editingSvc, setEditingSvc] = useState<ServiceRow | null>(null);
  const [svName, setSvName] = useState('');
  const [svPrice, setSvPrice] = useState('');
  const [svAliases, setSvAliases] = useState('');
  const [svActive, setSvActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTenants = useCallback(async () => {
    const res = await fetch('/api/super-admin/clinics');
    const data = await res.json().catch(() => ({}));
    setTenants((data.clinics ?? []).map((c: { id: string; name: string | null }) => ({ id: c.id, name: c.name })));
  }, []);

  const fetchServices = useCallback(async (id: string) => {
    setLoadingSvc(true);
    try {
      const res = await fetch(`/api/super-admin/services?clinic_id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      setServices(data.services ?? []);
    } finally { setLoadingSvc(false); }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);
  useEffect(() => { if (selectedTenantId) fetchServices(selectedTenantId); }, [selectedTenantId, fetchServices]);

  const handleAdd = async () => {
    if (!selectedTenantId || !svName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/super-admin/services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: selectedTenantId, service_name: svName.trim(), price: Number(svPrice), aliases: svAliases.split(',').map((s) => s.trim()).filter(Boolean), is_active: svActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'שגיאה');
      show('השירות נוסף'); setSvcModal(null); setSvName(''); setSvPrice(''); setSvAliases(''); setSvActive(true);
      fetchServices(selectedTenantId);
    } catch (e) { show((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editingSvc || !selectedTenantId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/services/${editingSvc.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_name: svName.trim(), price: Number(svPrice), aliases: svAliases.split(',').map((s) => s.trim()).filter(Boolean), is_active: svActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'שגיאה');
      show('עודכן'); setSvcModal(null); setEditingSvc(null); fetchServices(selectedTenantId);
    } catch (e) { show((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק שירות?') || !selectedTenantId) return;
    await fetch(`/api/super-admin/services/${id}`, { method: 'DELETE' });
    show('נמחק'); fetchServices(selectedTenantId);
  };

  const handleToggle = async (s: ServiceRow) => {
    if (!selectedTenantId) return;
    await fetch(`/api/super-admin/services/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !s.is_active }) });
    show(s.is_active ? 'הושבת' : 'הופעל'); fetchServices(selectedTenantId);
  };

  return (
    <div dir="rtl" className="space-y-8">
      {/* Header */}
      <div className="text-right">
        <h2 className="text-xl font-bold text-zinc-100">תמחור גלובלי</h2>
        <p className="mt-0.5 text-sm text-zinc-400">ניהול תכניות מנוי, בניית Tiers ושיוך שירותים לפי לקוח.</p>
      </div>

      {/* Tier cards */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">תכניות מנוי</h3>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLAN_TIERS.map((tier) => {
            const colors = COLOR_MAP[tier.color];
            const Icon = tier.icon;
            return (
              <div key={tier.id} className={`rounded-xl border p-5 flex flex-col gap-4 ${colors.card}`}>
                <div className="flex items-center justify-between flex-row-reverse">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${colors.badge}`}>{tier.name}</span>
                  <Icon className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="text-right">
                  {tier.priceMonthly === 0 && tier.id !== 'free' ? (
                    <p className="text-lg font-bold text-zinc-100">מחיר מותאם</p>
                  ) : (
                    <p className="text-2xl font-bold text-zinc-100 tabular-nums">
                      {tier.priceMonthly === 0 ? 'חינם' : `₪${tier.priceMonthly}`}
                      {tier.priceMonthly > 0 && <span className="text-xs text-zinc-400 font-normal">/חודש</span>}
                    </p>
                  )}
                </div>
                <ul className="space-y-1.5 text-right text-xs text-zinc-400 flex-1">
                  {tier.features.map((f) => (
                    <li key={f.label} className={`flex items-center gap-2 flex-row-reverse ${f.included ? 'text-zinc-300' : 'text-zinc-600 line-through'}`}>
                      <Check className={`h-3 w-3 shrink-0 ${f.included ? 'text-emerald-400' : 'text-zinc-700'}`} />
                      {f.label}
                    </li>
                  ))}
                </ul>
                <div className="text-right text-[11px] text-zinc-500 border-t border-zinc-800 pt-3 space-y-0.5">
                  <p>לידים: {tier.limits.leads === 'unlimited' ? '∞' : tier.limits.leads.toLocaleString()}</p>
                  <p>משתמשים: {typeof tier.limits.users === 'number' ? tier.limits.users : '∞'}</p>
                  <p>טוקני AI: {tier.limits.ai_tokens === 'unlimited' ? '∞' : (tier.limits.ai_tokens as number).toLocaleString()}</p>
                </div>
                <button type="button" onClick={() => show('עורך תכניות — בקרוב')}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${colors.button}`}>
                  ערוך תכנית
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-tenant service management */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">ניהול שירותים לפי לקוח</h3>
        <div className="flex flex-row-reverse gap-4 items-end flex-wrap mb-5">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">בחר לקוח</label>
            <select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 px-4 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 min-w-[220px]">
              <option value="">— בחר לקוח —</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name ?? t.id}</option>)}
            </select>
          </div>
          {selectedTenantId && (
            <button type="button"
              onClick={() => { setSvcModal('add'); setEditingSvc(null); setSvName(''); setSvPrice(''); setSvAliases(''); setSvActive(true); }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-sm font-semibold transition-colors flex-row-reverse">
              <Plus className="h-4 w-4" />הוסף שירות
            </button>
          )}
        </div>

        {selectedTenantId && (
          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900">
            {loadingSvc ? (
              <div className="py-10 text-center text-zinc-500 text-sm">טוען…</div>
            ) : (
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/50">
                    {['שם שירות','מחיר','כינויים','סטטוס','פעולות'].map((h) => (
                      <th key={h} className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {services.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-zinc-500">אין שירותים — הוסף שירות ראשון</td></tr>
                  ) : services.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-zinc-100">{s.service_name}</td>
                      <td className="py-3 px-4 text-zinc-300 tabular-nums">{s.price} ₪</td>
                      <td className="py-3 px-4 text-zinc-500 text-xs">{(s.aliases ?? []).join(', ') || '—'}</td>
                      <td className="py-3 px-4">
                        <button type="button" onClick={() => handleToggle(s)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${s.is_active ? 'bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}>
                          {s.is_active ? 'פעיל' : 'מושבת'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-end flex-row-reverse">
                          <button type="button" onClick={() => { setEditingSvc(s); setSvName(s.service_name); setSvPrice(String(s.price)); setSvAliases((s.aliases ?? []).join(', ')); setSvActive(s.is_active); setSvcModal('edit'); }}
                            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => handleDelete(s.id)}
                            className="p-1.5 rounded hover:bg-red-900/30 text-zinc-500 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Service modal */}
      {svcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setSvcModal(null)}>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl max-w-sm w-full p-6 text-right" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-100 mb-5">{svcModal === 'add' ? 'הוסף שירות' : 'ערוך שירות'}</h3>
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
              <button type="button" onClick={() => setSvcModal(null)} className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800">ביטול</button>
              <button type="button" onClick={svcModal === 'add' ? handleAdd : handleUpdate} disabled={saving || !svName.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                {saving ? 'שומר…' : svcModal === 'add' ? 'הוסף' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-zinc-100 text-zinc-900 px-4 py-2.5 text-sm font-medium shadow-xl">{toast}</div>
      )}
    </div>
  );
}
