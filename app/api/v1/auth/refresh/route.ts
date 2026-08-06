import { NextRequest, NextResponse } from 'next/server';
import { getDb, createTenantSql } from '@/lib/db/client';
import { platformUsers, tenants } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { hashToken, createSession, revokeSession } from '@/lib/auth/session';
import {
  createPlatformSession,
  findValidPlatformSession,
  revokePlatformSession,
} from '@/lib/auth/platform-session';
import { signAccessToken } from '@/lib/auth/jwt';
import { loadTenantAuthClaims } from '@/lib/auth/tenant-claims';
import { decodeJwt } from 'jose';

function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
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
}

async function refreshPlatform(refreshToken: string, req: NextRequest) {
  const session = await findValidPlatformSession(refreshToken);
  if (!session) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(platformUsers)
    .where(eq(platformUsers.id, session.platformUserId))
    .limit(1);

  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'User inactive' }, { status: 403 });
  }

  await revokePlatformSession(refreshToken);

  const roles = [user.role || 'platform_admin', 'super_admin'];
  const newAccessToken = await signAccessToken({
    userId: user.id,
    tenantId: 'PLATFORM',
    schemaName: 'public',
    roles,
    isPlatformAdmin: true,
  });

  const newRefreshToken = await createPlatformSession(
    user.id,
    req.headers.get('x-forwarded-for') || undefined,
    req.headers.get('user-agent') || undefined
  );

  const response = NextResponse.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    roles,
    scope: 'platform',
  });
  setAuthCookies(response, newAccessToken, newRefreshToken);
  return response;
}

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
    let isPlatformHint = false;

    const access = req.cookies.get('access_token')?.value;
    if (access) {
      try {
        const payload = decodeJwt(access);
        schemaHint = typeof payload.schemaName === 'string' ? payload.schemaName : undefined;
        isPlatformHint = payload.isPlatformAdmin === true || payload.tenantId === 'PLATFORM';
      } catch {
        /* ignore */
      }
    }

    // Platform refresh path
    if (isPlatformHint || schemaHint === 'public' || body.scope === 'platform') {
      const platformSession = await findValidPlatformSession(refreshToken);
      if (platformSession) {
        return refreshPlatform(refreshToken, req);
      }
      if (isPlatformHint || body.scope === 'platform') {
        return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
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
      // Last resort: maybe this is a platform refresh without a live access cookie
      const platformSession = await findValidPlatformSession(refreshToken);
      if (platformSession) {
        return refreshPlatform(refreshToken, req);
      }
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
      scope: 'tenant',
    });
    setAuthCookies(response, newAccessToken, newRefreshToken);
    return response;
  } catch (error: unknown) {
    console.error('Refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
