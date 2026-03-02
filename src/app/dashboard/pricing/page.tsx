'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power, PowerOff, X } from 'lucide-react';
import { formatCurrencyILS } from '@/lib/hebrew';

type ClinicService = {
  id: string;
  clinic_id: string;
  service_name: string;
  price: number;
  aliases: string[];
  is_active: boolean;
  created_at?: string;
};

type Role = 'CLINIC_ADMIN' | 'STAFF';

export default function PricingPage() {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editService, setEditService] = useState<ClinicService | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = role === 'CLINIC_ADMIN';

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clinic-services', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'טעינת תמחור נכשלה');
        setServices([]);
        return;
      }
      setServices(json.services ?? []);
      setRole(json.role ?? 'STAFF');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleToggleActive = async (s: ClinicService) => {
    if (!canEdit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clinic-services/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !s.is_active }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)));
        setToast(s.is_active ? 'השירות הושבת' : 'השירות הופעל');
      } else {
        setToast(json.error ?? 'שגיאה בעדכון');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clinic-services/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setServices((prev) => prev.filter((x) => x.id !== id));
        setDeleteId(null);
        setToast('השירות נמחק');
      } else {
        setToast(json.error ?? 'שגיאה במחיקה');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between flex-row-reverse sm:justify-end">
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">לוח בקרה</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 sm:text-3xl">תמחור</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">ניהול שירותים ומחירים למרפאה.</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => { setEditService(null); setModal('add'); }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-lg transition hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-zinc-400 focus:ring-offset-2 flex-row-reverse"
          >
            <Plus className="h-4 w-4" />
            הוסף שירות
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200/80 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400 text-right">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-16 text-center shadow-sm">
          <p className="text-slate-700 dark:text-zinc-300 font-semibold">לא הוגדרו שירותים למרפאה זו</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">הוסף שירות כדי להתחיל תמחור</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => { setEditService(null); setModal('add'); }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-md transition hover:bg-slate-800 dark:hover:bg-white hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              הוסף שירות
            </button>
          )}
        </div>
      )}

      {!loading && !error && services.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden ring-1 ring-slate-900/[0.03] dark:ring-white/[0.03]">
          <div className="overflow-x-auto" dir="rtl">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-700">
                  <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500">שם שירות</th>
                  <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500">מחיר</th>
                  <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500">כינויים</th>
                  <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500">סטטוס</th>
                  {canEdit && <th className="w-28 px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500">פעולות</th>}
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-zinc-800/60 transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900 dark:text-zinc-100">{s.service_name}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-700 dark:text-zinc-300">{formatCurrencyILS(s.price)}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-slate-500 dark:text-zinc-400">
                      {Array.isArray(s.aliases) && s.aliases.length > 0 ? s.aliases.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${s.is_active ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400' : 'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'}`}>
                        {s.is_active ? 'פעיל' : 'מושבת'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 flex-row-reverse justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(s)}
                            disabled={submitting}
                            className="rounded-md p-1.5 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200"
                            title={s.is_active ? 'השבת' : 'הפעל'}
                          >
                            {s.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditService(s); setModal('edit'); }}
                            className="rounded-md p-1.5 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200"
                            title="ערוך"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(s.id)}
                            className="rounded-md p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="מחק"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {(modal === 'add' || modal === 'edit') && (
        <ServiceFormModal
          service={editService ?? undefined}
          onClose={() => { setModal(null); setEditService(null); }}
          onSaved={(updated) => {
            if (editService) {
              setServices((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
              setToast('השירות עודכן');
            } else {
              setServices((prev) => [updated as ClinicService, ...prev]);
              setToast('השירות נוסף');
            }
            setModal(null);
            setEditService(null);
          }}
          onError={(msg) => setToast(msg)}
        />
      )}

      {deleteId && (
        <ConfirmDeleteServiceModal
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={submitting}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </>
  );
}

function ServiceFormModal({
  service,
  onClose,
  onSaved,
  onError,
}: {
  service?: ClinicService;
  onClose: () => void;
  onSaved: (s: Partial<ClinicService> & { id: string }) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(service?.service_name ?? '');
  const [price, setPrice] = useState(service?.price ?? 0);
  const [aliasesStr, setAliasesStr] = useState(
    Array.isArray(service?.aliases) ? service.aliases.join(', ') : ''
  );
  const [active, setActive] = useState(service?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; price?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const trimmed = name.trim();
    if (!trimmed) {
      setFieldErrors((prev) => ({ ...prev, name: 'שם שירות חובה' }));
      return;
    }
    const numPrice = Number(price);
    if (Number.isNaN(numPrice) || numPrice < 0) {
      setFieldErrors((prev) => ({ ...prev, price: 'יש להזין מחיר תקין (מספר אי־שלילי)' }));
      return;
    }
    const aliases = aliasesStr.split(',').map((s) => s.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      if (service) {
        const res = await fetch(`/api/clinic-services/${service.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            service_name: trimmed,
            price: numPrice,
            aliases,
            is_active: active,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          onSaved({ ...service, service_name: trimmed, price: numPrice, aliases, is_active: active });
        } else {
          onError(json.error ?? 'שגיאה בעדכון');
        }
      } else {
        const res = await fetch('/api/clinic-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            service_name: trimmed,
            price: numPrice,
            aliases,
            is_active: active,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          onSaved(json as ClinicService);
        } else {
          onError(json.error ?? 'שגיאה בהוספה');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-5 py-4 flex-row-reverse">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 text-right">
            {service ? 'ערוך שירות' : 'הוסף שירות'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">שם שירות <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
              className={`w-full rounded-xl border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 transition-colors ${
                fieldErrors.name
                  ? 'border-red-400 dark:border-red-600 focus:ring-red-400 dark:focus:ring-red-500'
                  : 'border-slate-200 dark:border-zinc-700 focus:border-slate-400 focus:ring-slate-400/30 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/50'
              }`}
              placeholder="לדוגמה: טיפול שורש"
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400 text-right">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">מחיר (₪) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={0}
              step={1}
              value={price || ''}
              onChange={(e) => { setPrice(e.target.value === '' ? 0 : Number(e.target.value)); setFieldErrors((prev) => ({ ...prev, price: undefined })); }}
              className={`w-full rounded-xl border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right tabular-nums placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 transition-colors ${
                fieldErrors.price
                  ? 'border-red-400 dark:border-red-600 focus:ring-red-400 dark:focus:ring-red-500'
                  : 'border-slate-200 dark:border-zinc-700 focus:border-slate-400 focus:ring-slate-400/30 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/50'
              }`}
              placeholder="0"
            />
            {fieldErrors.price && <p className="mt-1 text-xs text-red-600 dark:text-red-400 text-right">{fieldErrors.price}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">כינויים (אופציונלי, מופרדים בפסיק)</label>
            <input
              type="text"
              value={aliasesStr}
              onChange={(e) => setAliasesStr(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/50 transition-colors"
              placeholder="כינוי 1, כינוי 2"
            />
          </div>
          <div className="flex items-center gap-2 flex-row-reverse justify-end pt-1">
            <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">פעיל</label>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-slate-300 dark:border-zinc-600 text-slate-900 focus:ring-slate-400" />
          </div>
          <div className="flex gap-3 pt-2 flex-row-reverse justify-start">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-60">
              {submitting ? 'שומר…' : service ? 'שמור שינויים' : 'הוסף שירות'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteServiceModal({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-red-200/50 dark:border-red-900/40 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 text-right">מחק שירות</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 text-right">האם למחוק את השירות? לא ניתן לשחזר.</p>
        <div className="mt-6 flex gap-3 flex-row-reverse justify-start">
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-60">
            ביטול
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-xl bg-red-600 dark:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-60">
            {loading ? 'מוחק…' : 'מחק'}
          </button>
        </div>
      </div>
    </div>
  );
}
