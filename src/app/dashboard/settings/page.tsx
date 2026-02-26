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
      const cid = (session.user.app_metadata as { clinic_id?: string } | null)?.clinic_id ?? null;
      if (cid) {
        const { data } = await supabase.from('clinics').select('name').eq('id', cid).maybeSingle();
        if (data?.name) setClinicName(data.name as string);
      }
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
