'use client';

import { useState, useEffect, useCallback } from 'react';
import { TenantSelector } from './TenantSelector';
import { TenantServicesTable } from './TenantServicesTable';
import { ServiceFormModal } from './ServiceFormModal';
import { EmptyState } from './EmptyState';
import type { TenantOption, ServiceRow } from './types';

interface TenantServicesOverrideSectionProps {
  /** Optional: tenants from server (single source of truth). */
  initialTenants?: TenantOption[];
}

/** Section 9: Single source of truth — same clinic_services used by Tenant panel and AI bot. */
export default function TenantServicesOverrideSection({
  initialTenants = [],
}: TenantServicesOverrideSectionProps) {
  const [tenants, setTenants] = useState<TenantOption[]>(initialTenants);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(initialTenants.length === 0);
  const [loadingServices, setLoadingServices] = useState(false);

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, []);

  const fetchTenants = useCallback(async () => {
    if (initialTenants.length > 0) {
      setTenants(initialTenants);
      setLoadingTenants(false);
      return;
    }
    setLoadingTenants(true);
    try {
      const res = await fetch('/api/super-admin/clinics');
      const data = await res.json().catch(() => ({}));
      const list = (data.clinics ?? []).map((c: { id: string; name: string | null }) => ({
        id: c.id,
        name: c.name,
      }));
      setTenants(list);
    } finally {
      setLoadingTenants(false);
    }
  }, [initialTenants]);

  const fetchServices = useCallback(async (tenantId: string) => {
    setLoadingServices(true);
    try {
      const res = await fetch(
        `/api/super-admin/services?clinic_id=${encodeURIComponent(tenantId)}`
      );
      const data = await res.json().catch(() => ({}));
      setServices(data.services ?? []);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    if (selectedTenantId) fetchServices(selectedTenantId);
    else setServices([]);
  }, [selectedTenantId, fetchServices]);

  const openAdd = () => {
    setEditingService(null);
    setFormName('');
    setFormPrice('');
    setFormAliases('');
    setFormActive(true);
    setModal('add');
  };

  const openEdit = (s: ServiceRow) => {
    setEditingService(s);
    setFormName(s.service_name);
    setFormPrice(String(s.price));
    setFormAliases((s.aliases ?? []).join(', '));
    setFormActive(s.is_active);
    setModal('edit');
  };

  const saveService = async () => {
    if (!selectedTenantId || !formName.trim()) return;
    const aliases = formAliases
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      if (modal === 'add') {
        const res = await fetch('/api/super-admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinic_id: selectedTenantId,
            service_name: formName.trim(),
            price: Number(formPrice),
            aliases,
            is_active: formActive,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? 'שגיאה');
        }
        showToast('השירות נוסף');
      } else if (editingService) {
        const res = await fetch(`/api/super-admin/services/${editingService.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_name: formName.trim(),
            price: Number(formPrice),
            aliases,
            is_active: formActive,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? 'שגיאה');
        }
        showToast('עודכן');
      }
      setModal(null);
      setEditingService(null);
      fetchServices(selectedTenantId);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!selectedTenantId) return;
    try {
      const res = await fetch(`/api/super-admin/services/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('שגיאה במחיקה');
      showToast('נמחק');
      fetchServices(selectedTenantId);
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  const toggleService = async (s: ServiceRow) => {
    if (!selectedTenantId) return;
    try {
      const res = await fetch(`/api/super-admin/services/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !s.is_active }),
      });
      if (!res.ok) throw new Error('שגיאה');
      showToast(s.is_active ? 'הושבת' : 'הופעל');
      fetchServices(selectedTenantId);
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="text-right">
        <h2 className="text-xl font-bold text-zinc-100">ניהול שירותים לקליניקות</h2>
        <p className="mt-0.5 text-sm text-zinc-400">
          עריכת שירותי הקליניקה — אותם נתונים מוצגים בלוח הקליניקה ובבוט.
        </p>
      </div>

      <TenantSelector
        tenants={tenants}
        selectedTenantId={selectedTenantId}
        onSelect={setSelectedTenantId}
        loading={loadingTenants}
      />

      {!selectedTenantId && <EmptyState noTenant />}
      {selectedTenantId && services.length === 0 && !loadingServices && (
        <EmptyState noServices onAdd={openAdd} />
      )}
      {selectedTenantId && (services.length > 0 || loadingServices) && (
        <TenantServicesTable
          services={services}
          loading={loadingServices}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={deleteService}
          onToggle={toggleService}
        />
      )}

      {modal && (
        <ServiceFormModal
          mode={modal}
          name={formName}
          price={formPrice}
          aliases={formAliases}
          active={formActive}
          onNameChange={setFormName}
          onPriceChange={setFormPrice}
          onAliasesChange={setFormAliases}
          onActiveChange={setFormActive}
          onSave={saveService}
          onClose={() => { setModal(null); setEditingService(null); }}
          saving={saving}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-zinc-100 text-zinc-900 px-4 py-2.5 text-sm font-medium shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
