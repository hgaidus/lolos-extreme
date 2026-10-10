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

// One origin: https://cross-country-trips.com. Any other host, and any request
// that is positively known to be plain http, redirects here in a single hop.
//
// This lives in the app because on this host it is the ONLY layer the account
// controls. nginx fronts Passenger directly and .htaccess is never consulted
// for this docroot — probed 2026-08-16, an unconditional rewrite rule placed
// there did not fire, while the same file works for the account's PHP sites,
// which run under Apache. cPanel's "Force HTTPS Redirect" writes .htaccess, so
// it would be equally inert here.
//
// An allowlist, not a list of bad hosts. Naming only `www` (which is what
// next.config.mjs used to do) is exactly why mail.cross-country-trips.com went
// unnoticed until Search Console reported it: cPanel puts it on this vhost as a
// ServerAlias and it serves a byte-identical copy of the site. Aliases added
// later are covered without being named.
const PUBLIC_ADMIN_PATHS = new Set([
  '/admin/login', '/admin/forgot', '/admin/reset',
  '/api/admin/login', '/api/admin/forgot', '/api/admin/reset',
]);

const CANONICAL_HOST = 'cross-country-trips.com';
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
// Exempted by name rather than by NODE_ENV, so the local production build
// (`next start`, used to reproduce anything that only appears in a real build)
// keeps working too.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

// The scheme half: plain http is redirected to https.
//
// The only signal the app has is X-Forwarded-Proto, and it took a temporary
// diagnostic header on production to learn how it behaves here (measured
// 2026-08-16 and again 2026-10-09, identical both times):
//
//   over https  ->  "https, https"   two proxy hops, each appending
//   over http   ->  "http"
//   a value sent by the client is discarded and replaced, either way
//
// So it is a LIST, and it cannot be spoofed from outside. The rule is the
// conservative reading of it: redirect only when EVERY hop reports http. A
// list with https anywhere in it is never redirected, so a change in how the
// hops report themselves can fail to redirect, but cannot turn an https
// request into a redirect to itself.
//
// That loop is the one way this can hurt, because the server layer synthesises
// "http" when the header is missing altogether — "absent" is not a safe
// default here. If nginx ever stopped setting it, every https request would
// look like http. Hence the second guard: the redirect leaves a 20-second
// marker cookie, and a request that still looks like http while carrying the
// marker is served instead of redirected again. A browser therefore gets the
// page after one wasted hop rather than an endless loop. (Clients that ignore
// cookies would still loop; they give up after a few hops, and the fix would
// be to revert this block.)
const SCHEME_MARKER = '__to_https';

function forwardedAsPlainHttp(request) {
  const hops = (request.headers.get('x-forwarded-proto') || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return hops.length > 0 && hops.every((v) => v === 'http');
}

function canonicalOriginRedirect(request, pathname) {
  // Certificate validation has to keep working over http, on whatever host the
  // issuer probes. Never redirect it.
  if (pathname.startsWith('/.well-known/')) return null;

  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  // The Host header is the client's own, never synthesised, so unlike the
  // scheme this can be acted on without risking a loop: the target host is by
  // definition not the one being redirected away from.
  if (host === '') return null;

  // Loopback is not a wrong host, it is development. Without this, `next dev`
  // and the local production build both 308 every request straight to the live
  // site — which is exactly what happened the first time this shipped, and did
  // not show up in testing because those tests set Host explicitly.
  if (LOOPBACK_HOSTS.has(host)) return null;

  const target = new URL(`${pathname}${request.nextUrl.search}`, CANONICAL_ORIGIN);

  // Wrong host: always redirect. The target host is by definition not the one
  // being redirected away from, so this cannot loop. It also lands on https,
  // so a wrong host over http is still a single hop.
  // 308 rather than 301 so a POST is replayed to the canonical origin instead
  // of being silently downgraded to a GET.
  if (host !== CANONICAL_HOST) return NextResponse.redirect(target, 308);

  // Right host, plain http: redirect to the same URL over https — unless the
  // marker says we just did and it still arrived looking like http.
  if (forwardedAsPlainHttp(request) && !request.cookies.has(SCHEME_MARKER)) {
    const res = NextResponse.redirect(target, 308);
    // Not Secure, on purpose: it has to come back on the https request to do
    // its job. It carries no information.
    res.cookies.set(SCHEME_MARKER, '1', { maxAge: 20, path: '/', sameSite: 'lax' });
    return res;
  }

  return null;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Before canonicalising: an undecodable path names no content on any host,
  // so 404 it outright rather than bouncing garbage to the canonical origin.
  if (!pathIsDecodable(pathname)) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const originRedirect = canonicalOriginRedirect(request, pathname);
  if (originRedirect) return originRedirect;

  // Everything below is admin-only. The matcher now spans the whole site for
  // the decode guard above, so the auth check has to re-scope itself.
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (!isAdminPath) return NextResponse.next();

  // The account-recovery path has to work without a session, or the reset link
  // would bounce to the very login page it exists to get you past.
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

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
