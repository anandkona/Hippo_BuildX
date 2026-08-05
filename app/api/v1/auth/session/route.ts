import { NextResponse } from 'next/server';
import { getDb, createTenantSql } from '@/lib/db/client';
import { tenants, platformUsers } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/crypto';
import { signAccessToken } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';

function redirectForRoles(roles: string[], isPlatformAdmin: boolean) {
  if (isPlatformAdmin) return '/platform';
  if (roles.includes('tenant_admin')) return '/dashboard';
  return '/dashboard';
}

async function loginPlatform(email: string, password: string) {
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

  const response = NextResponse.json({
    message: 'Login successful',
    scope: 'platform',
    roles,
    redirectTo: redirectForRoles(roles, true),
  });

  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60,
    path: '/',
  });

  return { response };
}

async function loginTenant(tenantSlug: string, email: string, password: string, req: Request) {
  const db = getDb();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug));

  if (!tenant || tenant.status !== 'active') {
    return { error: 'Workspace not found or inactive', status: 404 as const };
  }

  const tenantSql = createTenantSql(tenant.schemaName);
  const [user] = await tenantSql`SELECT id, password_hash, status FROM users WHERE email = ${email}`;

  if (!user) {
    await verifyPassword('dummy', 'dummyhash');
    return null;
  }
  if (user.status !== 'active') {
    return { error: 'Account suspended', status: 403 as const };
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;

  const userRoles = await tenantSql`
    SELECT r.name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ${user.id}
  `;
  const roles = userRoles.map((r: { name: string }) => r.name);

  const accessToken = await signAccessToken({
    userId: user.id,
    tenantId: tenant.id,
    schemaName: tenant.schemaName,
    roles,
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
    path: '/api/v1/auth/refresh',
  });

  return { response };
}

/**
 * Central login:
 * - With workspace → tenant auth
 * - Without workspace → platform auth
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const workspace = String(body.workspace || body.tenantSlug || '').trim().toLowerCase();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (workspace) {
      const result = await loginTenant(workspace, email, password, req);
      if (!result) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return result.response;
    }

    const platform = await loginPlatform(email, password);
    if (platform && 'response' in platform) return platform.response;
    if (platform && 'error' in platform) {
      return NextResponse.json({ error: platform.error }, { status: platform.status });
    }

    return NextResponse.json(
      {
        error: 'Invalid credentials. If you are a tenant user, enter your workspace slug.',
        needsWorkspace: true,
      },
      { status: 401 }
    );
  } catch (error) {
    console.error('Central login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
