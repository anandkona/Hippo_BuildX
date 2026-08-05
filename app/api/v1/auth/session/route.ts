import { NextResponse } from 'next/server';
import { getDb, createTenantSql } from '@/lib/db/client';
import { tenants, platformUsers } from '@/lib/db/schema/control-plane';
import { eq, sql } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/crypto';
import { signAccessToken } from '@/lib/auth/jwt';
import { loadTenantAuthClaims } from '@/lib/auth/tenant-claims';
import { createSession } from '@/lib/auth/session';
import { createPlatformSession } from '@/lib/auth/platform-session';

function redirectForRoles(roles: string[], isPlatformAdmin: boolean) {
  if (isPlatformAdmin) return '/platform';
  if (roles.includes('tenant_admin')) return '/dashboard';
  return '/dashboard';
}

async function loginPlatform(email: string, password: string, req: Request) {
  const db = getDb();
  const [user] = await db.select().from(platformUsers).where(eq(platformUsers.email, email));

  if (!user) {
    await verifyPassword('dummy', 'dummyhash');
    return null;
  }
  if (!user.isActive) {
    return { error: 'Account suspended', status: 403 as const };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;

  const roles = [user.role || 'platform_admin', 'super_admin'];
  const accessToken = await signAccessToken({
    userId: user.id,
    tenantId: 'PLATFORM',
    schemaName: 'public',
    roles,
    isPlatformAdmin: true,
  });

  await db.update(platformUsers).set({ lastLoginAt: new Date() }).where(eq(platformUsers.id, user.id));

  const refreshToken = await createPlatformSession(
    user.id,
    req.headers.get('x-forwarded-for') || undefined,
    req.headers.get('user-agent') || undefined
  );

  const response = NextResponse.json({
    message: 'Login successful',
    scope: 'platform',
    roles,
    redirectTo: redirectForRoles(roles, true),
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

  return { response };
}

async function loginTenantByRow(
  tenant: typeof tenants.$inferSelect,
  email: string,
  password: string,
  req: Request
) {
  if (tenant.status !== 'active') {
    return { error: 'Workspace not found or inactive', status: 404 as const };
  }

  const tenantSql = createTenantSql(tenant.schemaName);
  const [user] = await tenantSql`
    SELECT id, password_hash, status FROM users WHERE lower(email) = ${email} LIMIT 1
  `;

  if (!user) {
    await verifyPassword('dummy', 'dummyhash');
    return null;
  }
  if (user.status !== 'active') {
    return { error: 'Account suspended', status: 403 as const };
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;

  const claims = await loadTenantAuthClaims(tenant.schemaName, user.id);
  const roles = claims.roles;

  const accessToken = await signAccessToken({
    userId: user.id,
    tenantId: tenant.id,
    schemaName: tenant.schemaName,
    roles,
    permissions: claims.permissions,
    projectIds: claims.projectIds,
    locationIds: claims.locationIds,
  });

  const refreshToken = await createSession(
    tenant.schemaName,
    tenant.id,
    user.id,
    req.headers.get('x-forwarded-for') || undefined,
    req.headers.get('user-agent') || undefined
  );

  await tenantSql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;

  const response = NextResponse.json({
    message: 'Login successful',
    scope: 'tenant',
    workspace: tenant.slug,
    roles,
    permissions: claims.permissions,
    redirectTo: redirectForRoles(roles, false),
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

  return { response };
}

/** Resolve which active tenant schema contains this user email */
async function findTenantForEmail(email: string) {
  const db = getDb();

  // Fast path: stored admin email on control-plane tenant row
  const [byAdmin] = await db
    .select()
    .from(tenants)
    .where(sql`lower(${tenants.adminEmail}) = ${email} AND ${tenants.status} = 'active'`)
    .limit(1);
  if (byAdmin) return byAdmin;

  const active = await db.select().from(tenants).where(eq(tenants.status, 'active'));
  for (const tenant of active) {
    try {
      const tenantSql = createTenantSql(tenant.schemaName);
      const [user] = await tenantSql`
        SELECT id FROM users WHERE lower(email) = ${email} LIMIT 1
      `;
      if (user) return tenant;
    } catch {
      // Schema may not exist yet / failed provision
    }
  }
  return null;
}

/**
 * Central login (email + password only):
 * 1) Platform users
 * 2) Auto-resolve tenant by email across active workspaces
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    // Optional override still supported for API/tests, not shown in UI
    const workspace = String(body.workspace || body.tenantSlug || '').trim().toLowerCase();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Explicit workspace (API / legacy)
    if (workspace) {
      const db = getDb();
      const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, workspace));
      if (!tenant) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      const result = await loginTenantByRow(tenant, email, password, req);
      if (!result) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return result.response;
    }

    const platform = await loginPlatform(email, password, req);
    if (platform && 'response' in platform) return platform.response;
    if (platform && 'error' in platform) {
      return NextResponse.json({ error: platform.error }, { status: platform.status });
    }

    const tenant = await findTenantForEmail(email);
    if (tenant) {
      const result = await loginTenantByRow(tenant, email, password, req);
      if (result && 'response' in result) return result.response;
      if (result && 'error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Central login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
