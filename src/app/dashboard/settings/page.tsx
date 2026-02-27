'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SettingsTab } from '@/components/dashboard/SettingsTab';

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserEmail(session.user.email ?? null);

      const { data: clinicLink, error } = await supabase
        .from('clinic_users')
        .select(`clinic:clinics!clinic_users1_clinic_id_fkey (id, name)`)
        .eq('user_id', session.user.id)
        .single();

      if (!clinicLink || error) return;

      const clinic = (Array.isArray(clinicLink.clinic) ? clinicLink.clinic[0] : clinicLink.clinic) as { id: string; name: string } | null;
      if (clinic?.name) setClinicName(clinic.name);
    });
  }, []);

  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Clinic profile and account configuration.</p>
      </div>
      <SettingsTab clinicName={clinicName} userEmail={userEmail} />
    </>
  );
}
