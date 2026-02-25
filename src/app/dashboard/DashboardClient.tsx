'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Users, BarChart3, Settings as SettingsIcon } from 'lucide-react';

type Lead = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  status: string | null;
  created_at: string;
};

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
  const [newLeadInterest, setNewLeadInterest] = useState('');
  const [newLeadStatus, setNewLeadStatus] = useState<'New' | 'Contacted' | 'Closed'>('New');
  const [submittingLead, setSubmittingLead] = useState(false);

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
        phone: newLeadPhone || null,
        interest: newLeadInterest || null,
        status: newLeadStatus,
      })
      .select('id, full_name, phone, interest, status, created_at')
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setLeads((current) => [data as Lead, ...current]);
      setShowNewLeadForm(false);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadInterest('');
      setNewLeadStatus('New');
    }

    setSubmittingLead(false);
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {leads.length} leads in pipeline
              </div>
              <button
                type="button"
                onClick={() => setShowNewLeadForm(true)}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-white"
              >
                Add New Lead
              </button>
            </div>

            {showNewLeadForm && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  New lead for this clinic
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Fill in the basic contact details and treatment interest.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={newLeadName}
                      onChange={(e) => setNewLeadName(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={newLeadPhone}
                      onChange={(e) => setNewLeadPhone(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Interest (Treatment)
                    </label>
                    <input
                      type="text"
                      value={newLeadInterest}
                      onChange={(e) => setNewLeadInterest(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      placeholder="Teeth whitening, physiotherapy, etc."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      value={newLeadStatus}
                      onChange={(e) =>
                        setNewLeadStatus(
                          e.target.value as 'New' | 'Contacted' | 'Closed',
                        )
                      }
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Closed">Converted</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (submittingLead) return;
                      setShowNewLeadForm(false);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingLead || !clinicId}
                    onClick={handleCreateLead}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingLead ? 'Saving...' : 'Save Lead'}
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-10 flex justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
              </div>
            )}

            {!loading && error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && leads.length === 0 && (
              <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <p className="text-sm font-medium text-slate-800">
                  No leads found for your clinic yet.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Once new inquiries are created for this clinic, they will appear here.
                </p>
              </div>
            )}

            {!loading && !error && leads.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Client Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                          <div className="font-medium">
                            {lead.full_name || 'Unnamed lead'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          {lead.email || 'No email'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          {lead.phone || 'No phone'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          <span
                            className={[
                              'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                              lead.status === 'Converted' || lead.status === 'Closed'
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : lead.status === 'Contacted'
                                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                  : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
                            ].join(' ')}
                          >
                            {lead.status ?? 'New'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                          {new Date(lead.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
      </main>
    </div>
  );
}
