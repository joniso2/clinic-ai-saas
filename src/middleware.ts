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

export async function middleware(request: NextRequest) {
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
