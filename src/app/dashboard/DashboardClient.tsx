'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Users, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import type { Lead, LeadStatus } from '../../types/leads';
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'leads' | 'analytics' | 'settings'>('leads');

  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadInterest, setNewLeadInterest] = useState('');
  const [newLeadStatus, setNewLeadStatus] = useState<LeadStatus>('New');
  const [submittingLead, setSubmittingLead] = useState(false);

  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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

      const email = session.user.email ?? null;
      const clinicIdFromMetadata =
        (session.user.app_metadata as { clinic_id?: string } | null)?.clinic_id ??
        null;

      setUserEmail(email);
      setClinicId(clinicIdFromMetadata);

      if (clinicIdFromMetadata) {
        console.log('Clinic ID from metadata:', clinicIdFromMetadata);

        try {
          const { data: clinicRow, error: clinicError } = await supabase
            .from('clinics')
            .select('name')
            .eq('id', clinicIdFromMetadata)
            .maybeSingle();

          if (clinicError) {
            console.error('Error fetching clinic name:', clinicError);
          }

          if (clinicRow?.name) {
            setClinicName(clinicRow.name as string);
          }
        } catch (err) {
          console.error('Unexpected error fetching clinic name:', err);
        }
      }

      if (clinicIdFromMetadata) {
        const { data, error } = await supabase
          .from('leads')
          .select('id, full_name, email, phone, interest, status, created_at')
          .eq('clinic_id', clinicIdFromMetadata)
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message);
        } else {
          setLeads(data ?? []);
        }
      }

      setLoading(false);
    };

    load();
  }, [router]);

  const handleCreateLead = async () => {
    if (!clinicId) return;
    setSubmittingLead(true);
    setError(null);

    const { error: insertError, data } = await supabase
      .from('leads')
      .insert({
        clinic_id: clinicId,
        full_name: newLeadName || null,
        email: newLeadEmail || null,
        phone: newLeadPhone || null,
        interest: newLeadInterest || null,
        status: newLeadStatus,
      })
      .select('id, full_name, email, phone, interest, status, created_at')
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setLeads((current) => [data as Lead, ...current]);
      setShowNewLeadForm(false);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadEmail('');
      setNewLeadInterest('');
      setNewLeadStatus('New');
    }

    setSubmittingLead(false);
  };

  const handleUpdateLeadStatus = async (leadId: string, status: LeadStatus) => {
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);
    if (error) {
      setError(error.message);
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

  const handleScheduleFollowUp = async (leadId: string) => {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    const dateStr = next.toISOString().slice(0, 10);
    const { error } = await supabase
      .from('leads')
      .update({ next_follow_up_date: dateStr })
      .eq('id', leadId);
    if (error) {
      setError(error.message);
      return;
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, next_follow_up_date: dateStr } : l))
    );
    setDrawerLead((prev) =>
      prev?.id === leadId ? { ...prev, next_follow_up_date: dateStr } : prev
    );
  };

  const handleEditSave = async (id: string, data: Partial<Lead>) => {
    setSavingEdit(true);
    setError(null);
    const { error } = await supabase.from('leads').update(data).eq('id', id);
    if (error) {
      setError(error.message);
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
    const { error } = await supabase.from('leads').delete().eq('id', deleteLead.id);
    if (error) {
      setError(error.message);
      setDeleting(false);
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== deleteLead.id));
    setDeleteLead(null);
    setDrawerLead((prev) => (prev?.id === deleteLead.id ? null : prev));
    setDeleting(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <span className="text-xl font-semibold">λ</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Clinic AI
              </p>
              <p className="text-sm text-slate-700">Clinic CRM Dashboard</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-right">
            <p className="text-[11px] text-slate-500">
              {userEmail
                ? `Logged in as ${userEmail}`
                : 'Logged in as unknown user'}
              {' · '}
              {clinicName
                ? `Managing: ${clinicName}`
                : clinicId
                  ? 'Managing: Loading clinic name...'
                  : 'Managing: Clinic not set'}
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/login');
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-[80vh] bg-gradient-to-b from-slate-50/50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
              {activeTab === 'leads'
                ? 'Leads'
                : activeTab === 'analytics'
                  ? 'Analytics'
                  : 'Settings'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activeTab === 'leads' &&
                'Review and manage leads for your clinic.'}
              {activeTab === 'analytics' &&
                'High-level performance metrics for your pipeline.'}
              {activeTab === 'settings' &&
                'Clinic profile and account configuration.'}
            </p>
          </div>
        </div>

        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`inline-flex items-center gap-2 border-b-2 px-0.5 pb-3 text-xs font-medium transition ${
                activeTab === 'leads'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Leads</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-2 border-b-2 px-0.5 pb-3 text-xs font-medium transition ${
                activeTab === 'analytics'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-2 border-b-2 px-0.5 pb-3 text-xs font-medium transition ${
                activeTab === 'settings'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {activeTab === 'leads' && (
          <>
            {!loading && !error && leads.length > 0 && (
              <div className="mb-8">
                <LeadsKpiCards leads={leads} />
              </div>
            )}

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {leads.length} leads in pipeline
              </div>
              <button
                type="button"
                onClick={() => setShowNewLeadForm(true)}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              >
                Add New Lead
              </button>
            </div>

            {showNewLeadForm && (
              <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/30 backdrop-blur-sm">
                <h2 className="text-base font-semibold text-slate-900">
                  New lead
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a contact to your pipeline.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newLeadName}
                      onChange={(e) => setNewLeadName(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newLeadEmail}
                      onChange={(e) => setNewLeadEmail(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newLeadPhone}
                      onChange={(e) => setNewLeadPhone(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Interest
                    </label>
                    <input
                      type="text"
                      value={newLeadInterest}
                      onChange={(e) => setNewLeadInterest(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      placeholder="Treatment or service"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      value={newLeadStatus}
                      onChange={(e) =>
                        setNewLeadStatus(e.target.value as LeadStatus)
                      }
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Closed">Closed</option>
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
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingLead || !clinicId}
                    onClick={handleCreateLead}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60"
                  >
                    {submittingLead ? 'Saving…' : 'Save Lead'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
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
          </>
        )}

        {activeTab === 'analytics' && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Pipeline summary
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Analytics for total leads and conversion rate will appear here.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Total leads</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {leads.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Conversion rate</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">—</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Contacted leads</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {leads.filter((l) => l.status === 'Contacted').length}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Clinic profile
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Basic information about the clinic linked to this account.
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Clinic name
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {clinicName ?? 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Account email
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {userEmail ?? 'Not available'}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        )}
        </div>
      </main>
    </div>
  );
}
