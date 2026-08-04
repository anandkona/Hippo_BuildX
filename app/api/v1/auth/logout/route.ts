import { NextResponse } from 'next/server';
import { revokeSession } from '@/lib/auth/session';
import { extractContextFromHeaders } from '@/lib/tenant-context';

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.schemaName) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    let refreshToken = req.cookies.get('refresh_token')?.value;
    if (!refreshToken) {
      const body = await req.json().catch(() => ({}));
      refreshToken = body.refreshToken;
    }

    if (refreshToken) {
      await revokeSession(context.schemaName, refreshToken);
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
