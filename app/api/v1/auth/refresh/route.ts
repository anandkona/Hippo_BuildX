import { NextRequest, NextResponse } from 'next/server';
import { getDb, createTenantSql } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { hashToken, createSession, revokeSession } from '@/lib/auth/session';
import { signAccessToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    let refreshToken = req.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      // Fallback for Flutter which might send it in the body
      const body = await req.json().catch(() => ({}));
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
    }

    // We need tenant info. For refresh, the client must pass tenantSlug in body or header.
    // Or we decode the old expired access token (ignoring expiration) to find it.
    // Let's assume tenantSlug is provided in the request for simplicity.
    const { tenantSlug } = await req.json().catch(() => ({ tenantSlug: null }));
    if (!tenantSlug) {
       return NextResponse.json({ error: 'Tenant slug required for refresh' }, { status: 400 });
    }

    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug));
    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantSql = createTenantSql(tenant.schemaName);
    const hashed = hashToken(refreshToken);

    // 1. Verify token exists and is valid
    const [tokenRecord] = await tenantSql`
      SELECT user_id, expires_at, revoked_at 
      FROM refresh_tokens 
      WHERE token_hash = ${hashed}
    `;

    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }
    if (tokenRecord.revoked_at || new Date() > tokenRecord.expires_at) {
      return NextResponse.json({ error: 'Token expired or revoked' }, { status: 401 });
    }

    // 2. Fetch user
    const [user] = await tenantSql`SELECT id, status FROM users WHERE id = ${tokenRecord.user_id}`;
    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'User inactive' }, { status: 403 });
    }

    // 3. Revoke old token (Rotation)
    await revokeSession(tenant.schemaName, refreshToken);

    // 4. Issue new tokens
    const userRoles = await tenantSql`
      SELECT r.name 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${user.id}
    `;
    const roles = userRoles.map((r: any) => r.name);

    const newAccessToken = await signAccessToken({
      userId: user.id,
      tenantId: tenant.id,
      schemaName: tenant.schemaName,
      roles,
    });

    const newRefreshToken = await createSession(
      tenant.schemaName,
      tenant.id,
      user.id,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    const response = NextResponse.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    
    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 15 * 60, path: '/'
    });
    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 30 * 24 * 60 * 60, path: '/api/v1/auth/refresh'
    });

    return response;
  } catch (error: any) {
    console.error('Refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
