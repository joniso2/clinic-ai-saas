import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { CustomersTab } from '@/components/dashboard/customers/CustomersTab';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <>
      <div className="mb-6 text-right" dir="rtl">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">ניהול</p>
        <h1 className="mt-1 text-[28px] font-bold text-slate-900 dark:text-slate-50 leading-tight tracking-tight">לקוחות</h1>
        <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">לקוחות פעילים שהשלימו תור</p>
      </div>
      <CustomersTab />
    </>
  );
}
