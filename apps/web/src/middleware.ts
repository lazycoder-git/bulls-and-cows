import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ── Route protection tiers ─────────────────────────────────────────────────

/** Requires login. Unauthenticated → redirect to /auth/signin */
const AUTH_REQUIRED = [
  '/game',
  '/profile',
  '/dashboard',
  '/rooms',
  '/tournaments',
  '/puzzles/daily',
  '/puzzles/oneshot',
];

/** Guests only. Logged-in user visiting these → redirect to /dashboard */
const GUEST_ONLY = ['/auth/signin', '/auth/username'];

// ── Helpers ────────────────────────────────────────────────────────────────

function matchesAny(pathname: string, routes: string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  // Belt-and-suspenders: middleware-level headers (Next.js config headers
  // also set these but middleware runs first for dynamic responses).
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  return res;
}

// ── Middleware ─────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // ── 1. Protect authenticated routes ────────────────────────────────────────
  if (matchesAny(pathname, AUTH_REQUIRED)) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.searchParams.set('callbackUrl', pathname);
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  // ── 2. Guest-only routes (signed-in users shouldn't be here) ──────────────
  if (matchesAny(pathname, GUEST_ONLY)) {
    if (token) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', req.url)));
    }
  }

  // ── 3. Block common attack probing paths ──────────────────────────────────
  const BLOCKED_PROBES = [
    '/wp-admin', '/wp-login', '/.env', '/admin.php', '/phpmyadmin',
    '/config', '/.git', '/xmlrpc', '/shell', '/eval', '/upload.php',
  ];
  if (BLOCKED_PROBES.some((p) => pathname.startsWith(p))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // ── 4. Enforce HTTPS in production ───────────────────────────────────────
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.get('x-forwarded-proto') === 'http'
  ) {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, public assets
     * - /api/auth (NextAuth's own endpoints — handled internally)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|icons/|fonts/|api/auth/).*)',
  ],
};
