'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SettingsTab } from '@/components/dashboard/SettingsTab';
import type { ClinicSettings } from '@/services/settings.service';

export default function SettingsPage() {
  const [userEmail, setUserEmail]   = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [clinicSlug, setClinicSlug] = useState<string | null>(null);
  const [settings, setSettings]     = useState<ClinicSettings | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserEmail(session.user.email ?? null);

      const { data: clinicLink, error } = await supabase
        .from('clinic_users')
        .select(`clinic:clinics!clinic_users1_clinic_id_fkey (id, name, slug)`)
        .eq('user_id', session.user.id)
        .single();

      if (!clinicLink || error) return;

      const clinic = (
        Array.isArray(clinicLink.clinic) ? clinicLink.clinic[0] : clinicLink.clinic
      ) as { id: string; name: string; slug: string } | null;

      if (clinic?.name) setClinicName(clinic.name);
      if (clinic?.slug) setClinicSlug(clinic.slug);

      // Fetch full clinic settings from the API
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data as ClinicSettings);
        }
      } catch {
        // Non-blocking — SettingsTab will fall back to defaults
      }
    });
  }, []);

  return (
    <>
      <div className="mb-6 text-right">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">לוח בקרה</p>
        <h1 className="mt-1 text-[28px] font-bold text-slate-900 dark:text-slate-50">הגדרות</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">מרכז שליטה לעסק.</p>
      </div>
      <SettingsTab clinicName={clinicName} clinicSlug={clinicSlug} userEmail={userEmail} settings={settings} />
    </>
  );
}
