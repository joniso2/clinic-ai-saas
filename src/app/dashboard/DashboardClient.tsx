'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import type { Lead, LeadStatus } from '../../types/leads';
import type { Appointment } from '@/types/appointments';
import { ScheduleAppointmentModal } from './ScheduleAppointmentModal';
import { LeadsKpiCards } from '../../components/dashboard/LeadsKpiCards';
import { LeadsTable } from '../../components/dashboard/LeadsTable';
import { LeadDetailDrawer } from '../../components/dashboard/LeadDetailDrawer';
import { ConfirmDeleteModal } from '../../components/dashboard/ConfirmDeleteModal';
import { EditLeadModal } from '../../components/dashboard/EditLeadModal';
import { LeadsEmptyState } from '../../components/dashboard/LeadsEmptyState';

export default function DashboardClient() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadInterest, setNewLeadInterest] = useState('');
  const [newLeadStatus, setNewLeadStatus] = useState<LeadStatus>('Pending');
  const [submittingLead, setSubmittingLead] = useState(false);

  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [appointmentLead, setAppointmentLead] = useState<Lead | null>(null);
  const [nextAppointmentsByLeadId, setNextAppointmentsByLeadId] = useState<Record<string, string>>({});

  const fetchLeads = async () => {
    const res = await fetch('/api/leads', { credentials: 'include' });
    const json = await res.json().catch(() => ({})) as { leads?: Lead[]; error?: string };
    if (!res.ok) {
      setError(json.error ?? 'Failed to load leads');
      setLeads([]);
    } else {
      setLeads(json.leads ?? []);
      if (json.error === 'Clinic not set for user') {
        setError('No clinic linked to your account. Ask an admin to assign your user to a clinic.');
      } else {
        setError(null);
      }
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

      const { data: clinicLink } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', session.user.id)
        .single();
      const clinicIdFromMetadata = clinicLink?.clinic_id ?? null;

      setClinicId(clinicIdFromMetadata);

      await fetchLeads();
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
            if (prev.find((l) => l.id === newLead.id)) return prev;
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

  const handleCreateLead = async () => {
    if (!clinicId) return;
    setSubmittingLead(true);
    setError(null);

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        full_name: newLeadName || '',
        email: newLeadEmail || null,
        phone: newLeadPhone || null,
        interest: newLeadInterest || null,
        status: newLeadStatus,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((json as { error?: string }).error ?? 'Failed to create lead');
    } else if ((json as { lead?: Lead }).lead) {
      const data = (json as { lead: Lead }).lead;
      setLeads((current) => [data, ...current]);
      setShowNewLeadForm(false);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadEmail('');
      setNewLeadInterest('');
      setNewLeadStatus('Pending');
    }

    setSubmittingLead(false);
  };

  const handleUpdateLeadStatus = async (leadId: string, status: LeadStatus) => {
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
  };

  const handleMarkContacted = async (leadId: string) => {
    await handleUpdateLeadStatus(leadId, 'Contacted');
  };

  const handleRejectLead = async (leadId: string, reason: string) => {
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
  };

  const handleScheduleFollowUp = async (leadId: string) => {
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
    setNextAppointmentsByLeadId(map);
  };

  const handleEditSave = async (id: string, data: Partial<Lead>) => {
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
  };

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
    await fetchLeads();
    setDeleting(false);
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 sm:text-3xl">Leads</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Review and manage leads for your clinic.</p>
        </div>
      </div>

      {!loading && !error && leads.length > 0 && (
        <div className="mb-8">
          <LeadsKpiCards leads={leads} />
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-slate-600 dark:text-zinc-300 card-shadow">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {leads.length} leads in pipeline
        </div>
        <button
          type="button"
          onClick={() => setShowNewLeadForm(true)}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-zinc-400 focus:ring-offset-2"
        >
          Add New Lead
        </button>
      </div>

      {showNewLeadForm && (
        <div className="mb-8 rounded-2xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 p-6 card-shadow">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">New lead</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Add a contact to your pipeline.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Name</label>
              <input
                type="text"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Email</label>
              <input
                type="email"
                value={newLeadEmail}
                onChange={(e) => setNewLeadEmail(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Phone</label>
              <input
                type="tel"
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Interest</label>
              <input
                type="text"
                value={newLeadInterest}
                onChange={(e) => setNewLeadInterest(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
                placeholder="Treatment or service"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Status</label>
              <select
                value={newLeadStatus}
                onChange={(e) => setNewLeadStatus(e.target.value as LeadStatus)}
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 focus:border-slate-900 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-zinc-500"
              >
                <option value="Pending">Pending</option>
                <option value="Contacted">Contacted</option>
                <option value="Appointment scheduled">Appointment scheduled</option>
                <option value="Closed">Closed</option>
                <option value="Disqualified">Disqualified</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (submittingLead) return;
                setShowNewLeadForm(false);
                setNewLeadEmail('');
              }}
              disabled={submittingLead}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-zinc-700 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submittingLead || !clinicId}
              onClick={handleCreateLead}
              className="rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm transition hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-zinc-400 focus:ring-offset-2 disabled:opacity-60"
            >
              {submittingLead ? 'Saving…' : 'Save Lead'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200/80 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
        </div>
      )}

      {!loading && !error && leads.length === 0 && (
        <LeadsEmptyState onAddLead={() => setShowNewLeadForm(true)} />
      )}

      {!loading && !error && leads.length > 0 && (
        <LeadsTable
          leads={leads}
          onView={(lead) => setDrawerLead(lead)}
          onEdit={(lead) => setEditLead(lead)}
          onDelete={(lead) => setDeleteLead(lead)}
          onStatusChange={handleUpdateLeadStatus}
          onMarkContacted={handleMarkContacted}
          onScheduleFollowUp={handleScheduleFollowUp}
          onScheduleAppointment={(lead) => setAppointmentLead(lead)}
          nextAppointmentsByLeadId={nextAppointmentsByLeadId}
          onRejectLead={handleRejectLead}
        />
      )}

      <LeadDetailDrawer
        lead={drawerLead}
        open={!!drawerLead}
        onClose={() => setDrawerLead(null)}
        onStatusChange={handleUpdateLeadStatus}
        onMarkContacted={handleMarkContacted}
        onScheduleFollowUp={handleScheduleFollowUp}
        onEdit={(lead) => {
          setDrawerLead(null);
          setEditLead(lead);
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteLead}
        title="Delete lead"
        message={
          deleteLead
            ? `Are you sure you want to delete "${deleteLead.full_name || 'this lead'}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
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
