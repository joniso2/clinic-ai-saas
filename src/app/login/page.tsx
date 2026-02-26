import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="relative min-h-screen w-full">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 h-full w-full object-cover blur-md"
        src="/videos/clinic.mp4"
      />
      <div className="fixed inset-0 bg-black/50" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <LoginForm />
      </div>
    </div>
  );
}
