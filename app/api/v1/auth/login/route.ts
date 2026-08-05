import { NextResponse } from 'next/server';
import { getDb, createTenantSql } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/crypto';
import { signAccessToken } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';
import { loadTenantAuthClaims } from '@/lib/auth/tenant-claims';

export async function POST(req: Request) {
  try {
    const { tenantSlug, email, password } = await req.json();

    if (!tenantSlug || !email || !password) {
      return NextResponse.json({ error: 'Tenant, email, and password required' }, { status: 400 });
    }

    const db = getDb();
    
    // 1. Resolve tenant from slug
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug));
    
    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 });
    }

    // 2. Look up the user in the specific tenant's schema
    const tenantSql = createTenantSql(tenant.schemaName);
    const [user] = await tenantSql`SELECT id, password_hash, status FROM users WHERE email = ${email}`;

    if (!user) {
      await verifyPassword('dummy', 'dummyhash');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    // 3. Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 4. Fetch roles + permissions
    const claims = await loadTenantAuthClaims(tenant.schemaName, user.id);
    const roles = claims.roles;

    // 5. Issue Tokens
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

    // 6. Update last login
    await tenantSql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;

    const response = NextResponse.json({ accessToken, refreshToken, roles, permissions: claims.permissions });
    
    // Set HttpOnly Cookies
    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('access_token', accessToken, {
      httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 15 * 60, path: '/'
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 30 * 24 * 60 * 60, path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
