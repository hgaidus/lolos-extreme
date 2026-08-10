import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, isValidSessionToken } from '@/lib/adminAuth';

// Next.js 16 renamed the `middleware` file convention to `proxy` — this file
// intentionally is NOT named middleware.js, which would be silently ignored.

// A path whose percent-escapes don't decode to valid UTF-8 (/go%F0afoss, /%,
// /a/b/%C3) makes Next's own router throw URIError while decoding route params,
// BEFORE any page code runs — so it surfaces as a 500. That is what Search
// Console has been recording against this site as "Server error (5xx)"; the
// examples it listed were all shapes like this rather than real pages.
//
// Guarding here is the only place early enough. new URL() keeps escapes
// verbatim, so reading pathname is safe; decodeURIComponent is what throws.
// Such a path cannot name any content, so 404 is the honest answer — and it is
// what a crawler should see, instead of a 5xx that suggests the site is broken.
function pathIsDecodable(pathname) {
  try {
    decodeURIComponent(pathname);
    return true;
  } catch {
    return false;
  }
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (!pathIsDecodable(pathname)) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  // Everything below is admin-only. The matcher now spans the whole site for
  // the decode guard above, so the auth check has to re-scope itself.
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (!isAdminPath) return NextResponse.next();

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
  // Everything except Next's own static output and the image optimizer — those
  // never carry a user-authored slug and shouldn't pay for the hop.
  matcher: ['/((?!_next/static|_next/image).*)'],
};
