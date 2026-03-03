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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">CRM</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 sm:text-3xl">לקוחות</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">לידים שטופלו, לקוחות והכנסות.</p>
      </div>
      <CustomersTab />
    </>
  );
}
