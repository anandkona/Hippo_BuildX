import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';

// Define the public routes that do not require authentication
const PUBLIC_ROUTES = [
  '/api/v1/health',
  '/api/v1/health/ready',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/platform/auth/login',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We only intercept /api/v1 routes in this middleware.
  // We leave Next.js pages untouched for now (they can handle auth in layouts/pages).
  if (pathname.startsWith('/api/v1')) {
    // 1. Bypass public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.next();
    }

    // 2. Extract JWT token from HttpOnly cookie or Authorization header
    let token = request.cookies.get('access_token')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // 3. Verify token
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    // 4. Platform Super Admin protection
    if (pathname.startsWith('/api/v1/platform') && !payload.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden: Platform Admin access required' }, { status: 403 });
    }

    // 5. Inject headers for downstream Next.js Route Handlers
    // Since we use AsyncLocalStorage in Route Handlers, they will read these headers
    // to initialize the tenant context.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', payload.tenantId);
    requestHeaders.set('x-schema-name', payload.schemaName);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-roles', JSON.stringify(payload.roles || []));
    requestHeaders.set('x-is-platform-admin', String(payload.isPlatformAdmin || false));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
