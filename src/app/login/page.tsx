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
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" />
      {/* Subtle noise/texture overlay */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
        aria-hidden
      />
      {/* Glow accents */}
      <div className="fixed -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" aria-hidden />
      <div className="fixed -bottom-32 -right-32 h-96 w-96 rounded-full bg-slate-600/30 blur-3xl" aria-hidden />
      {/* Video (optional, plays if available) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 h-full w-full object-cover opacity-10 blur-sm"
        src="/videos/clinic.mp4"
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <LoginForm />
      </div>
    </div>
  );
}
