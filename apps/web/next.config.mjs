/** @type {import('next').NextConfig} */

// ── Content Security Policy ────────────────────────────────────────────────
// Tight policy: only allow resources from our own domain,
// Google (for OAuth), and the backend API.
const isDev = process.env.NODE_ENV !== 'production';

const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' blob: data: https://*.googleusercontent.com https://lh3.googleusercontent.com",
  "connect-src 'self' http://localhost:4000 ws://localhost:4000",
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
].join('; ');

const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' blob: data: https://*.googleusercontent.com https://lh3.googleusercontent.com",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? ''} wss://${process.env.NEXT_PUBLIC_WS_URL?.replace(/^wss?:\/\//, '') ?? ''}`,
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Docker: produces a self-contained server.js at .next/standalone
  output: 'standalone',
  transpilePackages: ["@traffic/shared"],
  experimental: {
    externalDir: true,
  },

  // ── Security Headers ───────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Stop browsers leaking referrer to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Opt out of FLoC / Topics API
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // HSTS (only meaningful in prod behind HTTPS)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Content Security Policy
          { key: 'Content-Security-Policy', value: isDev ? CSP_DEV : CSP_PROD },
          // Prevent XSS in older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      // ── API routes: no caching, no indexing ──────────────────────────────
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      // ── Auth routes: extra strict ─────────────────────────────────────────
      {
        source: '/auth/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
};

export default nextConfig;
