import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getSupabaseAuthCookiePrefix() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
    const projectRef = url.hostname.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return 'sb-';
  }
}

/** Routes that use their own bearer-token auth and don't need origin-based CSRF protection. */
const CSRF_EXEMPT_PREFIXES = ['/api/webhook/', '/api/cron/', '/api/messages/incoming', '/api/book/', '/api/public/', '/api/clinics/', '/api/availability', '/api/cancel/', '/api/health'];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  // ── CSRF: Origin check for state-changing API requests ──
  const method = request.method;
  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    request.nextUrl.pathname.startsWith('/api/') &&
    !isCsrfExempt(request.nextUrl.pathname)
  ) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: 'CSRF origin mismatch' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid origin header' }, { status: 403 });
      }
    }
    // If no Origin header: could be same-origin fetch (browsers omit Origin for same-origin).
    // We allow it — same-origin requests are safe. Cross-origin POSTs always include Origin.
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    await supabase.auth.getUser();
  } catch (e: unknown) {
    const isRefreshTokenError =
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'refresh_token_not_found';
    if (isRefreshTokenError) {
      const prefix = getSupabaseAuthCookiePrefix();
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith(prefix)) {
          response.cookies.set(name, '', { maxAge: 0, path: '/' });
        }
      });
    }
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
