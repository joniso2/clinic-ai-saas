'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Power, PowerOff, X, Search, Package } from 'lucide-react';
import { formatCurrencyILS } from '@/lib/hebrew';
import { ConfirmDeleteModal } from '@/components/dashboard/ConfirmDeleteModal';

type ClinicService = {
  id: string;
  clinic_id: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  aliases: string[];
  is_active: boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Role = 'CLINIC_ADMIN' | 'STAFF' | 'SUPER_ADMIN';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function PricingPage() {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editService, setEditService] = useState<ClinicService | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const canEdit = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN';

  const filteredServices = useMemo(() => {
    let list = services;
    if (statusFilter === 'active') list = list.filter((s) => s.is_active);
    else if (statusFilter === 'inactive') list = list.filter((s) => !s.is_active);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.service_name.toLowerCase().includes(q) ||
          (Array.isArray(s.aliases) && s.aliases.some((a) => a.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [services, search, statusFilter]);

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
      setRole((json.role ?? 'STAFF') as Role);
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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
  };

  const handleToggleActive = async (s: ClinicService) => {
    const next = !s.is_active;
    setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: next } : x)));
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clinic-services/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(next ? 'השירות הופעל' : 'השירות הושבת');
      } else {
        setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: s.is_active } : x)));
        showToast(json.error ?? 'שגיאה בעדכון', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clinic-services/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setServices((prev) => prev.filter((x) => x.id !== id));
        setDeleteId(null);
        showToast('השירות נמחק');
      } else {
        showToast(json.error ?? 'שגיאה במחיקה', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" dir="rtl">
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">לוח בקרה</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 sm:text-3xl">ניהול שירותים</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">ניהול שירותים, מחירים וכינויים לחיפוש בוט.</p>
        </div>
        <div className="flex shrink-0 justify-end sm:ms-auto sm:pe-0">
          <button
            type="button"
            onClick={() => {
              setEditService(null);
              setModal('add');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-lg transition hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-zinc-400 focus:ring-offset-2 flex-row-reverse"
          >
            <Plus className="h-4 w-4" />
            הוסף שירות
          </button>
        </div>
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-16 text-center shadow-sm" dir="rtl">
          <div className="mb-4 rounded-2xl bg-slate-100 dark:bg-zinc-800 p-6">
            <Package className="h-12 w-12 text-slate-400 dark:text-zinc-500" aria-hidden />
          </div>
          <p className="text-lg font-semibold text-slate-800 dark:text-zinc-200">טרם הוגדרו שירותים</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">הוסף שירות ראשון כדי להתחיל בניהול תמחור ובוט.</p>
          <button
            type="button"
            onClick={() => {
              setEditService(null);
              setModal('add');
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-md transition hover:bg-slate-800 dark:hover:bg-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-zinc-400 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            הוסף שירות ראשון
          </button>
        </div>
      )}

      {!loading && !error && services.length > 0 && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4" dir="rtl">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם או כינוי..."
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pe-10 ps-4 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 focus:border-slate-400 dark:focus:border-zinc-500 transition-colors"
                aria-label="חיפוש שירותים"
              />
            </div>
            <div className="flex rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 ${
                    statusFilter === f
                      ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {f === 'all' ? 'הכל' : f === 'active' ? 'פעיל' : 'מושבת'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden ring-1 ring-slate-900/[0.03] dark:ring-white/[0.03]">
            <div className="overflow-x-auto overflow-y-visible" dir="rtl">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-700 bg-slate-50/95 dark:bg-zinc-800/95">
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">שם שירות</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">מחיר</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">משך</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">סטטוס</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">שימושים</th>
                    <th className="w-32 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-zinc-500">
                        אין תוצאות לחיפוש
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 dark:border-zinc-800/50 transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-zinc-800/30"
                      >
                        <td className="px-4 py-3 text-right">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-zinc-100">{s.service_name}</span>
                            {Array.isArray(s.aliases) && s.aliases.length > 0 && (
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                                {s.aliases.join(', ')}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-zinc-300">
                          {formatCurrencyILS(s.price)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-zinc-400 tabular-nums">
                          {(s.duration_minutes ?? 30)} דק׳
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                              s.is_active
                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'
                            }`}
                          >
                            {s.is_active ? 'פעיל' : 'מושבת'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-500 dark:text-zinc-400 tabular-nums">
                          —
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-row-reverse justify-end">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(s)}
                              disabled={submitting}
                              className="rounded-lg p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-slate-400/30 disabled:opacity-50"
                              title={s.is_active ? 'השבת' : 'הפעל'}
                            >
                              {s.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditService(s);
                                setModal('edit');
                              }}
                              className="rounded-lg p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                              title="ערוך"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(s.id)}
                              className="rounded-lg p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:outline-none focus:ring-2 focus:ring-red-400/30"
                              title="מחק"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {(modal === 'add' || modal === 'edit') && (
        <ServiceFormModal
          service={editService ?? undefined}
          onClose={() => {
            setModal(null);
            setEditService(null);
          }}
          onSaved={(updated) => {
            if (editService) {
              setServices((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
              showToast('השירות עודכן');
            } else {
              setServices((prev) => [updated as ClinicService, ...prev]);
              showToast('השירות נוסף');
            }
            setModal(null);
            setEditService(null);
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      <ConfirmDeleteModal
        open={!!deleteId}
        title="מחק שירות"
        message="האם למחוק את השירות? לא ניתן לשחזר."
        confirmLabel="מחק"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={submitting}
      />

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
            toastType === 'error'
              ? 'bg-red-600 text-white dark:bg-red-700'
              : 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
          }`}
          role="status"
        >
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
  const [durationMinutes, setDurationMinutes] = useState(service?.duration_minutes ?? 30);
  const [aliasesStr, setAliasesStr] = useState(
    Array.isArray(service?.aliases) ? service.aliases.join(', ') : ''
  );
  const [description, setDescription] = useState(service?.description ?? '');
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
    const duration = Math.max(1, Math.min(480, Math.round(Number(durationMinutes)) || 30));
    const aliases = aliasesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setSubmitting(true);
    try {
      const payload = {
        service_name: trimmed,
        price: numPrice,
        duration_minutes: duration,
        aliases,
        is_active: active,
        description: description.trim() || null,
      };
      if (service) {
        const res = await fetch(`/api/clinic-services/${service.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          onSaved({ ...service, ...payload });
        } else {
          onError(json.error ?? 'שגיאה בעדכון');
        }
      } else {
        const res = await fetch('/api/clinic-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-5 py-4 flex-row-reverse">
          <h2 id="service-modal-title" className="text-lg font-semibold text-slate-900 dark:text-zinc-100 text-right">
            {service ? 'ערוך שירות' : 'הוסף שירות'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-slate-400/30 ms-auto"
            aria-label="סגור"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              שם שירות <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={`w-full rounded-xl border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors ${
                fieldErrors.name
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-slate-200 dark:border-zinc-700'
              }`}
              placeholder="לדוגמה: טיפול שורש"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 text-right">{fieldErrors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              מחיר (₪) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={price || ''}
              onChange={(e) => {
                setPrice(e.target.value === '' ? 0 : Number(e.target.value));
                setFieldErrors((prev) => ({ ...prev, price: undefined }));
              }}
              className={`w-full rounded-xl border bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right tabular-nums placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors ${
                fieldErrors.price
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-slate-200 dark:border-zinc-700'
              }`}
              placeholder="0"
            />
            {fieldErrors.price && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 text-right">{fieldErrors.price}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              משך הטיפול (דקות) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={480}
              step={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value === '' ? 30 : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right tabular-nums placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors"
              placeholder="30"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 text-right">1–480 דקות</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              כינויים לחיפוש (מילות מפתח לבוט, מופרדים בפסיק)
            </label>
            <input
              type="text"
              value={aliasesStr}
              onChange={(e) => setAliasesStr(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors"
              placeholder="טיפול שורש, שורש, רוט"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 text-right mb-1.5">
              תיאור (אופציונלי)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 text-right placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/50 transition-colors resize-none"
              placeholder="תיאור קצר לשירות"
            />
          </div>
          <div className="flex items-center gap-2 flex-row-reverse justify-end pt-1">
            <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">פעיל</label>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-slate-300 dark:border-zinc-600 text-slate-900 focus:ring-slate-400"
            />
          </div>
          <div className="flex gap-3 pt-2 flex-row-reverse justify-start">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              {submitting ? 'שומר…' : service ? 'שמור שינויים' : 'הוסף שירות'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
