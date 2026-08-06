import { NextResponse } from 'next/server';
import { acceptTenantInvite } from '@/lib/tenants/invite';
import { signAccessToken } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';
import { loadTenantAuthClaims } from '@/lib/auth/tenant-claims';

/** Public: buyer sets their own password from invite link */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token || '').trim();
    const password = String(body.password || '');
    const name = body.name ? String(body.name).trim() : undefined;

    if (!token) {
      return NextResponse.json({ error: 'Invite token required' }, { status: 400 });
    }

    const result = await acceptTenantInvite({ token, password, name });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const claims = await loadTenantAuthClaims(result.schemaName, result.userId);
    const accessToken = await signAccessToken({
      userId: result.userId,
      tenantId: result.tenantId,
      schemaName: result.schemaName,
      roles: claims.roles,
      permissions: claims.permissions,
      projectIds: claims.projectIds,
      locationIds: claims.locationIds,
    });

    const refreshToken = await createSession(
      result.schemaName,
      result.tenantId,
      result.userId,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    const response = NextResponse.json({
      message: 'Password set successfully',
      scope: 'tenant',
      workspace: result.workspace,
      email: result.email,
      roles: claims.roles,
      redirectTo: '/dashboard',
    });

    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
