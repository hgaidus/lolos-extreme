/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces .next/standalone/server.js — a self-contained entry point
  // (bundled node_modules, listens on process.env.PORT) that Phusion
  // Passenger can run directly on shared hosting without `next start`.
  output: 'standalone',

  experimental: {
    // proxy.js makes Next buffer every request body, silently TRUNCATING
    // past this limit (default 10MB) — which broke photo uploads between
    // 10 and the API's own 30MB cap with "Failed to parse body as FormData".
    // 32MB leaves headroom above the API cap so the route's friendly 413
    // is what oversized uploads actually hit.
    proxyClientMaxBodySize: '32mb',
  },

  // Origin canonicalisation used to live here as a redirect naming exactly one
  // bad host (www). That missed mail.cross-country-trips.com — a ServerAlias
  // cPanel puts on this vhost, serving an identical copy of the site — and it
  // covered no scheme at all. Both now live as one allowlist rule in
  // src/proxy.js, which already runs on every request. It is not in the web
  // server because .htaccess is inert for this docroot (nginx → Passenger, no
  // Apache in the path) — see the note there.

  // HSTS. Sent from here rather than the web server for three reasons: every
  // response goes through Node under Passenger (even /photos/*), so coverage is
  // complete; it stays in version control; and mod_headers is not demonstrably
  // available on this host, while this is.
  //
  // Deliberately NOT includeSubDomains — that would force https on webmail.,
  // cpanel. and mail., and locking yourself out of webmail is a real way for
  // this to go wrong. Deliberately NOT preload — that list is effectively
  // one-way, and everything here should be revertible.
  //
  // max-age starts short on purpose. Once the redirect is confirmed working,
  // raise it to 31536000 (one year); until then a mistake ages out in minutes.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
