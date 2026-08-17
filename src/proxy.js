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
const CANONICAL_HOST = 'cross-country-trips.com';
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
// Exempted by name rather than by NODE_ENV, so the local production build
// (`next start`, used to reproduce anything that only appears in a real build)
// keeps working too.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

// NOTE — the scheme half of this is deliberately NOT implemented yet, and the
// reason is worth keeping. Redirecting http→https from here requires knowing
// the request was plain http, and the only signal available to the app is
// X-Forwarded-Proto. Measured 2026-08-16: when a client sends no such header,
// the server layer SYNTHESISES `x-forwarded-proto: http` rather than leaving it
// absent. So "absent means unknown, don't redirect" is not a safety net that
// exists. If nginx does not set the header in production, every https request
// would look like http and redirect to itself — a site-wide loop.
//
// That cannot be determined without deploying: the app's own redirects emit
// relative Location headers, so nothing observable from outside reveals the
// scheme it perceives. The `x-fwd-proto-seen` header below answers it from a
// single live request; once it reads `https` over TLS and `http` over port 80,
// the scheme redirect is safe to add and that header comes back out.
//
// Little is lost by waiting. http URLs already carry a correct canonical to the
// https original, so search is unaffected, and HSTS (set in next.config.mjs)
// stops browsers issuing http requests at all after first contact.
function canonicalOriginRedirect(request, pathname) {
  // Certificate validation has to keep working over http, on whatever host the
  // issuer probes. Never redirect it.
  if (pathname.startsWith('/.well-known/')) return null;

  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  // The Host header is the client's own, never synthesised, so unlike the
  // scheme this can be acted on without risking a loop: the target host is by
  // definition not the one being redirected away from.
  if (host === '' || host === CANONICAL_HOST) return null;

  // Loopback is not a wrong host, it is development. Without this, `next dev`
  // and the local production build both 308 every request straight to the live
  // site — which is exactly what happened the first time this shipped, and did
  // not show up in testing because those tests set Host explicitly.
  if (LOOPBACK_HOSTS.has(host)) return null;

  // 308 rather than 301 so a POST is replayed to the canonical origin instead
  // of being silently downgraded to a GET.
  return NextResponse.redirect(
    new URL(`${pathname}${request.nextUrl.search}`, CANONICAL_ORIGIN),
    308,
  );
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

  // TEMPORARY diagnostic — reports the forwarded scheme this app actually
  // receives in production, which cannot be observed any other way. Read it
  // once over https and once over port 80, then delete this block and add the
  // scheme redirect described above. Discloses nothing sensitive.
  const observedProto = request.headers.get('x-forwarded-proto');
  const withDiagnostic = (res) => {
    res.headers.set('x-fwd-proto-seen', observedProto === null ? '(absent)' : observedProto);
    return res;
  };

  // Everything below is admin-only. The matcher now spans the whole site for
  // the decode guard above, so the auth check has to re-scope itself.
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (!isAdminPath) return withDiagnostic(NextResponse.next());

  const isLoginPage = pathname === '/admin/login';
  const isLoginApi = pathname === '/api/admin/login';
  if (isLoginPage || isLoginApi) return withDiagnostic(NextResponse.next());

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidSessionToken(token)) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return withDiagnostic(NextResponse.next());
}

export const config = {
  // Everything except Next's own static output and the image optimizer — those
  // never carry a user-authored slug and shouldn't pay for the hop.
  matcher: ['/((?!_next/static|_next/image).*)'],
};
