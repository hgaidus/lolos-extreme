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

  // Canonicalize the domain: 301 any www request to the non-www origin,
  // preserving the path. Both hostnames hit this same Passenger app, so the
  // app sees the Host header and can redirect. Non-www is the canonical
  // domain (matches the rel=canonical tags). No loop: the destination host
  // never matches the www condition.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.cross-country-trips.com' }],
        destination: 'https://cross-country-trips.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
