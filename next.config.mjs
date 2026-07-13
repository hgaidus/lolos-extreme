/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces .next/standalone/server.js — a self-contained entry point
  // (bundled node_modules, listens on process.env.PORT) that Phusion
  // Passenger can run directly on shared hosting without `next start`.
  output: 'standalone',
};

export default nextConfig;
