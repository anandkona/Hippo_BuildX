import { NextRequest, NextResponse } from 'next/server';
import { revokeSession } from '@/lib/auth/session';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { decodeJwt } from 'jose';

function clearAuthCookies(response: NextResponse) {
  const expire = { httpOnly: true, path: '/', maxAge: 0 } as const;
  response.cookies.set('access_token', '', expire);
  response.cookies.set('refresh_token', '', expire);
  // Also clear legacy path-scoped refresh cookie
  response.cookies.set('refresh_token', '', { ...expire, path: '/api/v1/auth/refresh' });
}

export async function POST(req: NextRequest) {
  try {
    const context = extractContextFromHeaders(req.headers);
    let refreshToken = req.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      const body = await req.json().catch(() => ({}));
      refreshToken = body.refreshToken;
    }

    let schemaName = context.schemaName;
    if ((!schemaName || schemaName === 'public') && req.cookies.get('access_token')?.value) {
      try {
        const payload = decodeJwt(req.cookies.get('access_token')!.value);
        if (typeof payload.schemaName === 'string') schemaName = payload.schemaName;
      } catch {
        /* ignore */
      }
    }

    if (refreshToken && schemaName && schemaName !== 'public') {
      await revokeSession(schemaName, refreshToken);
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    clearAuthCookies(response);
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    const response = NextResponse.json({ message: 'Logged out' });
    clearAuthCookies(response);
    return response;
  }
}
