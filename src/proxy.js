import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, isValidSessionToken } from '@/lib/adminAuth';

// Next.js 16 renamed the `middleware` file convention to `proxy` — this file
// intentionally is NOT named middleware.js, which would be silently ignored.
export function proxy(request) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === '/admin/login';
  const isLoginApi = pathname === '/api/admin/login';
  if (isLoginPage || isLoginApi) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidSessionToken(token)) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
