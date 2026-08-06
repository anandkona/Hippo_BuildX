import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';

// Public API routes that do not require authentication
const PUBLIC_API_ROUTES = [
  '/api/v1/health',
  '/api/v1/health/ready',
  '/api/v1/auth/login',
  '/api/v1/auth/session',
  '/api/v1/auth/refresh',
  '/api/v1/auth/invite',
  '/api/v1/auth/invite/accept',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/platform/auth/login',
];

// Public page routes (no auth required)
const PUBLIC_PAGE_ROUTES = [
  '/login',
  '/platform/login',
  '/api-docs',
  '/invite',
  '/forgot-password',
  '/reset-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- API route protection ---
  if (pathname.startsWith('/api/v1')) {
    if (PUBLIC_API_ROUTES.includes(pathname)) {
      return NextResponse.next();
    }

    let token = request.cookies.get('access_token')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    if (pathname.startsWith('/api/v1/platform') && !payload.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden: Platform Admin access required' }, { status: 403 });
    }

    const requestHeaders = new Headers(request.headers);
    // Always overwrite — never trust client-supplied tenant headers
    requestHeaders.set('x-tenant-id', payload.tenantId);
    requestHeaders.set('x-schema-name', payload.schemaName);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-roles', JSON.stringify(payload.roles || []));
    requestHeaders.set('x-permissions', JSON.stringify(payload.permissions || []));
    requestHeaders.set('x-project-ids', JSON.stringify(payload.projectIds || []));
    requestHeaders.set('x-location-ids', JSON.stringify(payload.locationIds || []));
    requestHeaders.set('x-is-platform-admin', String(payload.isPlatformAdmin || false));

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- Page route protection ---
  // Allow public pages
  if (PUBLIC_PAGE_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check for access_token cookie on page routes
  const token = request.cookies.get('access_token')?.value;
  const isPlatformPage = pathname.startsWith('/platform');
  const loginPath = '/login';

  if (!token) {
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the token is still valid
  const payload = await verifyAccessToken(token);
  if (!payload) {
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPlatformPage && !payload.isPlatformAdmin) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Platform staff hitting tenant app root → send to platform home
  if (payload.isPlatformAdmin && (pathname === '/dashboard' || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/platform', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
