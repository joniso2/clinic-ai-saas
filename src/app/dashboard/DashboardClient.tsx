'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import type { Lead, LeadStatus } from '../../types/leads';
import type { Appointment } from '@/types/appointments';
import { LeadsKpiCards } from '../../components/dashboard/LeadsKpiCards';
import { LeadsTable } from '../../components/dashboard/LeadsTable';
import { ConfirmDeleteModal } from '../../components/dashboard/ConfirmDeleteModal';
import { LeadsEmptyState } from '../../components/dashboard/LeadsEmptyState';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useCommandPalette } from '@/contexts/CommandPaletteContext';
import NewLeadDrawer from '@/components/dashboard/NewLeadDrawer';

const LeadDetailDrawer = dynamic(
  () => import('../../components/dashboard/LeadDetailDrawer').then((m) => m.LeadDetailDrawer),
  { ssr: false },
);
const EditLeadModal = dynamic(
  () => import('../../components/dashboard/EditLeadModal').then((m) => m.EditLeadModal),
  { ssr: false },
);
const ScheduleAppointmentModal = dynamic(
  () => import('./ScheduleAppointmentModal').then((m) => m.ScheduleAppointmentModal),
  { ssr: false },
);

export default function DashboardClient() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { registerLeads, registerOnNewLead } = useCommandPalette();

  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [appointmentLead, setAppointmentLead] = useState<Lead | null>(null);
  const [nextAppointmentsByLeadId, setNextAppointmentsByLeadId] = useState<Record<string, string>>({});
  const [pricingServices, setPricingServices] = useState<{ service_name: string; price: number }[]>([]);

  const fetchLeads = async (effectiveClinicId?: string | null) => {
    const url = effectiveClinicId ? `/api/leads?clinic_id=${encodeURIComponent(effectiveClinicId)}` : '/api/leads';
    const res = await fetch(url, { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as { leads?: Lead[]; error?: string };
    if (!res.ok) {
      setError(json.error ?? 'טעינת לידים נכשלה');
      setLeads([]);
    } else {
      setLeads(json.leads ?? []);
      if (json.error === 'Clinic not set for user') {
        setError('אין עסק מקושר לחשבון. פנה למנהל לשיוך.');
      } else {
        setError(null);
      }
    }
  };

  const fetchPricingServices = async () => {
    const res = await fetch('/api/clinic-services', { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as {
      services?: { service_name: string; price?: number; is_active?: boolean }[];
    };
    if (res.ok && Array.isArray(json.services)) {
      const list = json.services
        .filter((s) => s.is_active !== false)
        .map((s) => ({
          service_name: (s.service_name ?? '').trim(),
          price: typeof s.price === 'number' && !Number.isNaN(s.price) ? s.price : 0,
        }))
        .filter((s) => s.service_name);
      setPricingServices(list);
    }
  };

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace('/login');
        return;
      }

      const { data: clinicRows } = await supabase
        .from('clinic_users')
        .select('clinic_id, role')
        .eq('user_id', session.user.id);
      const rows = (Array.isArray(clinicRows) ? clinicRows : []) as { clinic_id: string | null; role?: string }[];
      const clinicRow = rows.find((r) => r?.clinic_id && r.role !== 'SUPER_ADMIN') ?? rows.find((r) => r?.clinic_id);
      const clinicIdFromMetadata = clinicRow?.clinic_id ?? null;

      setClinicId(clinicIdFromMetadata);

      await Promise.all([
        fetchLeads(clinicIdFromMetadata),
        fetchPricingServices(),
      ]);
      setLoading(false);
    };

    load();
  }, [router]);

  useEffect(() => {
    refreshNextAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads.length]);

  // Realtime subscription — auto-update leads without page refresh
  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel(`leads:clinic:${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads((prev) => {
            const idx = prev.findIndex((l) => l.id === newLead.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...newLead };
              return updated;
            }
            return [newLead, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          const updated = payload.new as Lead;
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
          );
          setDrawerLead((prev) =>
            prev?.id === updated.id ? { ...prev, ...updated } : prev
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'leads',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setLeads((prev) => prev.filter((l) => l.id !== deletedId));
          setDrawerLead((prev) => (prev?.id === deletedId ? null : prev));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clinicId]);

  // Refetch leads when tab becomes visible (e.g. after Discord bot created a lead)
  useEffect(() => {
    if (!clinicId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchLeads(clinicId);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [clinicId]);

  // Register leads in CommandPalette context
  useEffect(() => { registerLeads(leads); }, [leads, registerLeads]);
  useEffect(() => { registerOnNewLead(() => setShowNewLeadForm(true)); }, [registerOnNewLead]);

  const handleUpdateLeadStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? 'Failed to update');
      return;
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status } : l))
    );
    setDrawerLead((prev) => (prev?.id === leadId ? { ...prev, status } : prev));
  }, []);

  const handleMarkContacted = useCallback(async (leadId: string) => {
    await handleUpdateLeadStatus(leadId, 'Contacted');
  }, [handleUpdateLeadStatus]);

  /** When accepting a pending lead: if it has a requested appointment (e.g. from website), create it in the calendar only if this lead does not already have an appointment (avoid duplicate). */
  const handleAcceptPendingLead = async (lead: Lead) => {
    if (lead.next_appointment) {
      const datetime = lead.next_appointment.includes('T') ? lead.next_appointment : `${lead.next_appointment}T00:00:00`;
      const d = new Date(datetime);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const resList = await fetch(`/api/appointments?month=${month}&year=${year}`, { credentials: 'include' });
      const jsonList = (await resList.json().catch(() => ({}))) as { appointments?: { lead_id?: string | null }[] };
      const existingForLead = (jsonList.appointments ?? []).some((a) => a.lead_id === lead.id);
      if (!existingForLead) {
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            patient_name: lead.full_name ?? 'ליד',
            datetime,
            type: 'new',
            lead_id: lead.id,
          }),
        });
        if (res.status === 201) {
          const json = (await res.json().catch(() => ({}))) as { appointment?: { datetime: string; lead_id?: string } };
          if (json.appointment?.datetime) {
            setNextAppointmentsByLeadId((prev) => ({
              ...prev,
              [lead.id]: json.appointment!.datetime,
            }));
          }
        }
      }
    }
    await handleUpdateLeadStatus(lead.id, 'Appointment scheduled');
    await refreshNextAppointments();
  };

  const handleRejectLead = useCallback(async (leadId: string, reason: string) => {
    const rejectedAt = new Date().toISOString();
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: 'Disqualified',
        reject_reason: reason,
        rejected_at: rejectedAt,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? 'Failed to update');
      return;
    }
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, status: 'Disqualified', reject_reason: reason, rejected_at: rejectedAt }
          : l
      )
    );
    setDrawerLead((prev) =>
      prev?.id === leadId
        ? { ...prev, status: 'Disqualified', reject_reason: reason, rejected_at: rejectedAt }
        : prev
    );
  }, []);

  const handleScheduleFollowUp = useCallback(async (leadId: string) => {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    const dateStr = next.toISOString().slice(0, 10);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ next_follow_up_date: dateStr }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? 'Failed to update');
      return;
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, next_follow_up_date: dateStr } : l))
    );
    setDrawerLead((prev) =>
      prev?.id === leadId ? { ...prev, next_follow_up_date: dateStr } : prev
    );
  }, []);

  const handleUpdateDealValue = useCallback(async (leadId: string, value: number) => {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ estimated_deal_value: value }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return (json as { error?: string }).error ?? 'עדכון נכשל';
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, estimated_deal_value: value } : l))
    );
    setDrawerLead((prev) =>
      prev?.id === leadId ? { ...prev, estimated_deal_value: value } : prev
    );
    return null;
  }, []);

  const [existingPatientPending, setExistingPatientPending] = useState<{
    leadId: string;
    value: number;
    notes?: string;
    serviceType?: string;
    patient: { id: string; full_name: string; phone: string };
  } | null>(null);

  const handleCompleteLead = async (
    leadId: string,
    value: number,
    notes?: string,
    serviceType?: string,
    opts?: { forceUpdate?: boolean; createNewAnyway?: boolean },
  ) => {
    const body: Record<string, unknown> = {
      status: 'Closed',
      estimated_deal_value: value,
      notes: notes ?? null,
      service_name: serviceType ?? null,
    };
    if (opts?.forceUpdate) body.forceUpdate = true;
    if (opts?.createNewAnyway) body.createNewAnyway = true;

    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      ok?: boolean;
      existingPatient?: boolean;
      patient?: { id: string; full_name: string; phone: string };
      warning?: string;
    };
    if (!res.ok) {
      return json.error ?? 'עדכון נכשל';
    }
    if (json.existingPatient === true && json.patient && !opts?.forceUpdate && !opts?.createNewAnyway) {
      setExistingPatientPending({
        leadId,
        value,
        notes,
        serviceType,
        patient: json.patient,
      });
      return null;
    }
    setExistingPatientPending(null);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, status: 'Closed', estimated_deal_value: value } : l
      )
    );
    setDrawerLead((prev) =>
      prev?.id === leadId ? { ...prev, status: 'Closed', estimated_deal_value: value } : prev
    );
    if (json.warning) return { warning: json.warning };
    return null;
  };

  const resolveExistingPatient = (forceUpdate: boolean) => {
    if (!existingPatientPending) return;
    const { leadId, value, notes, serviceType } = existingPatientPending;
    setExistingPatientPending(null);
    void handleCompleteLead(leadId, value, notes, serviceType, {
      forceUpdate,
      createNewAnyway: !forceUpdate,
    });
  };

  const refreshNextAppointments = async () => {
    if (!leads.length) return;
    const now = new Date();
    const monthsToFetch = [0, 1];
    const all: Appointment[] = [];
    for (const offset of monthsToFetch) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const res = await fetch(`/api/appointments?month=${month}&year=${year}`, {
        credentials: 'include',
      });
      if (!res.ok) continue;
      const json = (await res.json().catch(() => ({}))) as {
        appointments?: Appointment[];
      };
      if (json.appointments) all.push(...json.appointments);
    }
    const map: Record<string, string> = {};
    const nowMs = now.getTime();
    for (const apt of all) {
      if (!apt.lead_id) continue;
      const t = new Date(apt.datetime).getTime();
      if (t < nowMs) continue;
      const existing = map[apt.lead_id];
      if (!existing || new Date(apt.datetime) < new Date(existing)) {
        map[apt.lead_id] = apt.datetime;
      }
    }
    // Show requested appointment (e.g. from website booking) when no calendar appointment yet
    for (const lead of leads) {
      if (lead.next_appointment && map[lead.id] === undefined) {
        const t = new Date(lead.next_appointment).getTime();
        if (t >= nowMs) map[lead.id] = lead.next_appointment;
      }
    }
    setNextAppointmentsByLeadId(map);
  };

  const handleEditSave = useCallback(async (id: string, data: Partial<Lead>) => {
    setSavingEdit(true);
    setError(null);
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? 'Failed to update');
      setSavingEdit(false);
      return;
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...data } : l))
    );
    setDrawerLead((prev) => (prev?.id === id ? { ...prev, ...data } : prev));
    setEditLead(null);
    setSavingEdit(false);
  }, []);

  const handleDeleteLead = async () => {
    if (!deleteLead) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/leads/${deleteLead.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? 'Failed to delete');
      setDeleting(false);
      return;
    }
    const deletedId = deleteLead.id;
    setDeleteLead(null);
    setDrawerLead((prev) => (prev?.id === deletedId ? null : prev));
    setLeads((prev) => prev.filter((l) => l.id !== deletedId));
    setDeleting(false);
  };

  const handleViewLead = useCallback((lead: Lead) => setDrawerLead(lead), []);
  const handleOpenEdit = useCallback((lead: Lead) => setEditLead(lead), []);
  const handleOpenDelete = useCallback((lead: Lead) => setDeleteLead(lead), []);
  const handleOpenAppointment = useCallback((lead: Lead) => setAppointmentLead(lead), []);
  const handleCloseDrawer = useCallback(() => setDrawerLead(null), []);
  const handleEditFromDrawer = useCallback((lead: Lead) => {
    setDrawerLead(null);
    setEditLead(lead);
  }, []);

  return (
    <>
      <div dir="rtl">
        {/* Table panel */}
        <div>
          <div className="mb-6 text-right">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">CRM</p>
            <h1 className="mt-1 text-[28px] font-bold text-slate-900 dark:text-slate-50 leading-tight tracking-tight">לידים</h1>
            <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">ניהול וטיפול בלידים נכנסים</p>
          </div>

          {!loading && !error && leads.length > 0 && (
            <div className="mb-8">
              <LeadsKpiCards leads={leads} />
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200/80 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-6 py-4">
              {/* KPI skeletons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                    <div className="h-10 w-10 rounded-full animate-pulse bg-slate-200/70 dark:bg-slate-800/60" />
                    <div className="h-7 w-20 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60" />
                    <div className="h-4 w-28 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60" />
                  </div>
                ))}
              </div>
              {/* Table skeleton */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="flex gap-4 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/50">
                  {['w-28','w-20','w-24','w-16'].map((w, i) => (
                    <div key={i} className={`h-3 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60 ${w}`} />
                  ))}
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-4 px-4 py-3.5 border-t border-slate-100 dark:border-slate-800">
                    {['w-32','w-24','w-28','w-20'].map((w, j) => (
                      <div key={j} className={`h-4 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60 ${w}`} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && leads.length === 0 && (
            <LeadsEmptyState onAddLead={() => setShowNewLeadForm(true)} />
          )}

          {!loading && !error && leads.length > 0 && (
            <LeadsTable
              leads={leads}
              onView={handleViewLead}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onStatusChange={handleUpdateLeadStatus}
              onAcceptPendingLead={handleAcceptPendingLead}
              onMarkContacted={handleMarkContacted}
              onScheduleFollowUp={handleScheduleFollowUp}
              onScheduleAppointment={handleOpenAppointment}
              onUpdateDealValue={handleUpdateDealValue}
              onCompleteLead={handleCompleteLead}
              pricingServices={pricingServices}
              nextAppointmentsByLeadId={nextAppointmentsByLeadId}
              onRejectLead={handleRejectLead}
              toolbarStartContent={
                <>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 card-shadow flex-row-reverse">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {leads.length} לידים במעקב
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewLeadForm(true)}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 active:scale-[0.98]"
                  >
                    ליד חדש +
                  </button>
                </>
              }
            />
          )}
        </div>
      </div>

      {/* Lead detail overlay drawer */}
      <LeadDetailDrawer
        lead={drawerLead}
        open={!!drawerLead}
        onClose={handleCloseDrawer}
        onStatusChange={handleUpdateLeadStatus}
        onMarkContacted={handleMarkContacted}
        onScheduleFollowUp={handleScheduleFollowUp}
        onEdit={handleEditFromDrawer}
        mode="overlay"
      />

      {/* New lead drawer */}
      <NewLeadDrawer
        open={showNewLeadForm}
        clinicId={clinicId}
        onClose={() => setShowNewLeadForm(false)}
        onCreated={(lead) => {
          setLeads((prev) => [lead, ...prev]);
          setShowNewLeadForm(false);
          if (!isMobile) setDrawerLead(lead);
        }}
        pricingServices={pricingServices}
      />

      <ConfirmDeleteModal
        open={!!deleteLead}
        title="מחק ליד"
        message={
          deleteLead
            ? `האם למחוק את "${deleteLead.full_name || 'הליד'}"? לא ניתן לשחזר.`
            : ''
        }
        confirmLabel="מחק"
        onConfirm={handleDeleteLead}
        onCancel={() => setDeleteLead(null)}
        loading={deleting}
      />

      <EditLeadModal
        lead={editLead}
        open={!!editLead}
        onClose={() => setEditLead(null)}
        onSave={handleEditSave}
        loading={savingEdit}
      />

      {existingPatientPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="לקוח קיים">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setExistingPatientPending(null)} aria-hidden="true" />
          <div className="modal-enter relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-5 shadow-xl text-right" dir="rtl">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">לקוח קיים נמצא</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">לעדכן לקוח קיים או ליצור רשומה חדשה?</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{existingPatientPending.patient.full_name} · {existingPatientPending.patient.phone}</p>
            <div className="mt-4 flex gap-2 justify-start">
              <button
                type="button"
                onClick={() => resolveExistingPatient(true)}
                className="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white"
              >
                עדכן לקוח קיים
              </button>
              <button
                type="button"
                onClick={() => resolveExistingPatient(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                צור רשומה חדשה
              </button>
              <button
                type="button"
                onClick={() => setExistingPatientPending(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {appointmentLead && (
        <ScheduleAppointmentModal
          lead={appointmentLead}
          onClose={() => setAppointmentLead(null)}
          onScheduled={(appointment) => {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === appointmentLead.id
                  ? { ...l, status: 'Appointment scheduled' }
                  : l,
              ),
            );
            setDrawerLead((prev) =>
              prev?.id === appointmentLead.id
                ? { ...prev, status: 'Appointment scheduled' }
                : prev,
            );
            setNextAppointmentsByLeadId((prev) => ({
              ...prev,
              [appointment.lead_id ?? appointmentLead.id]: appointment.datetime,
            }));
            void handleUpdateLeadStatus(appointmentLead.id, 'Appointment scheduled');
          }}
        />
      )}
    </>
  );
}
