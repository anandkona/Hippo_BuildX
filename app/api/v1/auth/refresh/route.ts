import { NextRequest, NextResponse } from 'next/server';
import { getDb, createTenantSql } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { hashToken, createSession, revokeSession } from '@/lib/auth/session';
import { signAccessToken } from '@/lib/auth/jwt';
import { loadTenantAuthClaims } from '@/lib/auth/tenant-claims';
import { decodeJwt } from 'jose';

export async function POST(req: NextRequest) {
  try {
    let refreshToken = req.cookies.get('refresh_token')?.value;
    let body: Record<string, unknown> = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (!refreshToken && typeof body.refreshToken === 'string') {
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
    }

    let tenantSlug = typeof body.tenantSlug === 'string' ? body.tenantSlug : undefined;
    let schemaHint: string | undefined;

    const access = req.cookies.get('access_token')?.value;
    if (!tenantSlug && access) {
      try {
        const payload = decodeJwt(access);
        schemaHint = typeof payload.schemaName === 'string' ? payload.schemaName : undefined;
      } catch {
        /* ignore */
      }
    }

    const db = getDb();
    let tenant;
    if (tenantSlug) {
      [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug));
    } else if (schemaHint && schemaHint !== 'public') {
      [tenant] = await db.select().from(tenants).where(eq(tenants.schemaName, schemaHint));
    }

    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 });
    }

    const tenantSql = createTenantSql(tenant.schemaName);
    const hashed = hashToken(refreshToken);

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

    const [user] = await tenantSql`SELECT id, status FROM users WHERE id = ${tokenRecord.user_id}`;
    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'User inactive' }, { status: 403 });
    }

    await revokeSession(tenant.schemaName, refreshToken);

    const claims = await loadTenantAuthClaims(tenant.schemaName, user.id);

    const newAccessToken = await signAccessToken({
      userId: user.id,
      tenantId: tenant.id,
      schemaName: tenant.schemaName,
      roles: claims.roles,
      permissions: claims.permissions,
      projectIds: claims.projectIds,
      locationIds: claims.locationIds,
    });

    const newRefreshToken = await createSession(
      tenant.schemaName,
      tenant.id,
      user.id,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    const response = NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      roles: claims.roles,
    });

    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    });
    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
