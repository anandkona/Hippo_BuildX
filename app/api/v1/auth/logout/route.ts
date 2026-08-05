import { NextRequest, NextResponse } from 'next/server';
import { revokeSession } from '@/lib/auth/session';
import { revokePlatformSession } from '@/lib/auth/platform-session';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { decodeJwt } from 'jose';

function clearAuthCookies(response: NextResponse) {
  const expire = { httpOnly: true, path: '/', maxAge: 0 } as const;
  response.cookies.set('access_token', '', expire);
  response.cookies.set('refresh_token', '', expire);
  response.cookies.set('refresh_token', '', { ...expire, path: '/api/v1/auth/refresh' });
}

export async function POST(req: NextRequest) {
  try {
    const context = extractContextFromHeaders(req.headers);
    let refreshToken = req.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      const body = await req.json().catch(() => ({}));
      refreshToken = (body as { refreshToken?: string }).refreshToken;
    }

    let schemaName = context.schemaName;
    let isPlatform = context.tenantId === 'PLATFORM';
    if (req.cookies.get('access_token')?.value) {
      try {
        const payload = decodeJwt(req.cookies.get('access_token')!.value);
        if (typeof payload.schemaName === 'string') schemaName = payload.schemaName;
        if (payload.isPlatformAdmin === true || payload.tenantId === 'PLATFORM') {
          isPlatform = true;
        }
      } catch {
        /* ignore */
      }
    }

    if (refreshToken) {
      if (isPlatform || schemaName === 'public') {
        await revokePlatformSession(refreshToken);
      } else if (schemaName) {
        await revokeSession(schemaName, refreshToken);
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    clearAuthCookies(response);
    return response;
  } catch (error: unknown) {
    console.error('Logout error:', error);
    const response = NextResponse.json({ message: 'Logged out' });
    clearAuthCookies(response);
    return response;
  }
}
