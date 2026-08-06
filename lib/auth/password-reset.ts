import { createHash, randomBytes } from 'crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb, getSql, createTenantSql } from '@/lib/db/client';
import { passwordResetTokens, platformUsers, tenants } from '@/lib/db/schema/control-plane';
import { hashPassword } from '@/lib/auth/crypto';
import { isBrevoConfigured, sendBrevoEmail } from '@/lib/email/brevo';
import { buildPasswordResetEmail } from '@/lib/email/templates/password-reset';
import { appBaseUrl } from '@/lib/tenants/invite';

const RESET_TTL_HOURS = 1;
const GENERIC_OK =
  'If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.';

export type ResolvedAccount =
  | {
      scope: 'platform';
      userId: string;
      email: string;
      name: string;
      tenantId?: undefined;
      schemaName?: undefined;
      workspace?: undefined;
    }
  | {
      scope: 'tenant';
      userId: string;
      email: string;
      name: string;
      tenantId: string;
      schemaName: string;
      workspace: string;
    };

function generateToken() {
  return randomBytes(32).toString('hex');
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

let ensured = false;
export async function ensurePasswordResetTable() {
  if (ensured) return;
  const sqlClient = getSql();
  await sqlClient.unsafe(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope VARCHAR(20) NOT NULL,
      user_id UUID NOT NULL,
      tenant_id UUID REFERENCES tenants(id),
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  ensured = true;
}

async function findTenantForEmail(email: string) {
  const db = getDb();
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
        SELECT id FROM users WHERE lower(email) = ${email} AND deleted_at IS NULL LIMIT 1
      `;
      if (user) return tenant;
    } catch {
      /* schema missing */
    }
  }
  return null;
}

export async function resolveAccountByEmail(emailRaw: string): Promise<ResolvedAccount | null> {
  const email = emailRaw.trim().toLowerCase();
  if (!email.includes('@')) return null;

  const db = getDb();
  const [platform] = await db
    .select()
    .from(platformUsers)
    .where(sql`lower(${platformUsers.email}) = ${email}`)
    .limit(1);

  if (platform && platform.isActive) {
    return {
      scope: 'platform',
      userId: platform.id,
      email: platform.email,
      name: platform.name || 'Admin',
    };
  }

  const tenant = await findTenantForEmail(email);
  if (!tenant) return null;

  const tenantSql = createTenantSql(tenant.schemaName);
  const [user] = await tenantSql`
    SELECT id, name, status FROM users
    WHERE lower(email) = ${email} AND deleted_at IS NULL
    LIMIT 1
  `;
  if (!user || user.status !== 'active') return null;

  return {
    scope: 'tenant',
    userId: user.id as string,
    email,
    name: (user.name as string) || 'User',
    tenantId: tenant.id,
    schemaName: tenant.schemaName,
    workspace: tenant.slug,
  };
}

export async function requestPasswordReset(opts: { email: string; req?: Request }) {
  const email = opts.email.trim().toLowerCase();

  // Always same message (anti-enumeration)
  const ok = { ok: true as const, message: GENERIC_OK };

  if (!email.includes('@') || email.endsWith('.local')) {
    return ok;
  }

  if (!isBrevoConfigured()) {
    return {
      ok: false as const,
      error: 'Email delivery is not configured. Contact your administrator.',
      status: 503,
    };
  }

  const account = await resolveAccountByEmail(email);
  if (!account) return ok;

  await ensurePasswordResetTable();
  const db = getDb();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);

  // Invalidate prior unused tokens for this user
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.scope, account.scope),
        eq(passwordResetTokens.userId, account.userId),
        isNull(passwordResetTokens.usedAt)
      )
    );

  await db.insert(passwordResetTokens).values({
    scope: account.scope,
    userId: account.userId,
    tenantId: account.tenantId || null,
    email: account.email,
    name: account.name,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${appBaseUrl(opts.req)}/reset-password?token=${token}`;
  const mail = buildPasswordResetEmail({
    name: account.name,
    email: account.email,
    resetUrl,
    expiresHours: RESET_TTL_HOURS,
    scopeLabel: account.scope === 'platform' ? 'Platform admin' : `Tenant (${account.workspace})`,
  });

  const sent = await sendBrevoEmail({
    toEmail: account.email,
    toName: account.name,
    subject: mail.subject,
    htmlContent: mail.htmlContent,
    textContent: mail.textContent,
    tags: ['password-reset'],
  });

  if (!sent.ok) {
    console.error('Password reset email failed:', sent.error);
    // Still generic to the client
    return ok;
  }

  return { ...ok, debugResetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined };
}

export async function getPasswordResetPreview(token: string) {
  await ensurePasswordResetTable();
  const db = getDb();
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) return { ok: false as const, error: 'Invalid or expired reset link' };
  if (row.usedAt) return { ok: false as const, error: 'This reset link was already used' };
  if (row.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, error: 'This reset link has expired' };
  }

  return {
    ok: true as const,
    email: row.email,
    name: row.name || 'User',
    scope: row.scope,
    expiresAt: row.expiresAt.toISOString(),
  };
}

export async function resetPasswordWithToken(opts: { token: string; password: string }) {
  await ensurePasswordResetTable();
  const db = getDb();
  const tokenHash = hashToken(opts.token);
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) return { ok: false as const, error: 'Invalid or expired reset link', status: 400 };
  if (row.usedAt) return { ok: false as const, error: 'This reset link was already used', status: 400 };
  if (row.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, error: 'This reset link has expired', status: 400 };
  }
  if (!opts.password || opts.password.length < 8) {
    return { ok: false as const, error: 'Password must be at least 8 characters', status: 400 };
  }

  const passwordHash = await hashPassword(opts.password);

  if (row.scope === 'platform') {
    const [user] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.id, row.userId))
      .limit(1);
    if (!user || !user.isActive) {
      return { ok: false as const, error: 'Account is not active', status: 400 };
    }
    await db
      .update(platformUsers)
      .set({ passwordHash })
      .where(eq(platformUsers.id, user.id));
  } else {
    if (!row.tenantId) {
      return { ok: false as const, error: 'Invalid reset record', status: 400 };
    }
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, row.tenantId)).limit(1);
    if (!tenant || tenant.status !== 'active') {
      return { ok: false as const, error: 'Workspace is not active', status: 400 };
    }
    const tenantSql = createTenantSql(tenant.schemaName);
    const [user] = await tenantSql`
      SELECT id, status FROM users WHERE id = ${row.userId} AND deleted_at IS NULL LIMIT 1
    `;
    if (!user || user.status !== 'active') {
      return { ok: false as const, error: 'Account is not active', status: 400 };
    }
    await tenantSql`
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${user.id}
    `;
  }

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));

  return {
    ok: true as const,
    email: row.email,
    scope: row.scope,
    redirectTo: '/login?reset=1',
  };
}
