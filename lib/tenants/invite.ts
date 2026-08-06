import { createHash, randomBytes } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb, getSql } from '@/lib/db/client';
import { tenantInvites, tenants } from '@/lib/db/schema/control-plane';
import { isBrevoConfigured, sendBrevoEmail } from '@/lib/email/brevo';
import { buildTenantInviteEmail } from '@/lib/email/templates/tenant-invite';
import { hashPassword } from '@/lib/auth/crypto';
import { createTenantSql } from '@/lib/db/client';

export type TenantInviteResult =
  | { sent: true; messageId: string; to: string; inviteUrl: string; expiresAt: string }
  | { sent: false; skipped?: boolean; error: string; to?: string; inviteUrl?: string };

const INVITE_TTL_HOURS = 72;

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Random hash nobody knows — buyer must use invite link to set password. */
export async function generateLockedPasswordHash() {
  return hashPassword(generateInviteToken());
}

export function appBaseUrl(req?: Request): string {
  const fromEnv =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    if (fromEnv.startsWith('http')) return fromEnv.replace(/\/$/, '');
    return `https://${fromEnv.replace(/\/$/, '')}`;
  }
  if (req) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    if (host) return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

function isDeliverableEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (!lower.includes('@') || lower.endsWith('.local')) return false;
  return true;
}

let ensured = false;
export async function ensureTenantInvitesTable() {
  if (ensured) return;
  const sql = getSql();
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS tenant_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  ensured = true;
}

export async function createTenantInviteToken(opts: {
  tenantId: string;
  email: string;
  name?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  await ensureTenantInvitesTable();
  const db = getDb();
  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  // Invalidate prior unused invites for this tenant+email
  await db
    .update(tenantInvites)
    .set({ acceptedAt: new Date() })
    .where(
      and(
        eq(tenantInvites.tenantId, opts.tenantId),
        eq(tenantInvites.email, opts.email.toLowerCase()),
        isNull(tenantInvites.acceptedAt)
      )
    );

  await db.insert(tenantInvites).values({
    tenantId: opts.tenantId,
    email: opts.email.toLowerCase(),
    name: opts.name || null,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function sendTenantAdminInvite(opts: {
  tenantId: string;
  companyName: string;
  workspace: string;
  adminName: string;
  adminEmail: string;
  req?: Request;
}): Promise<TenantInviteResult> {
  const to = opts.adminEmail.trim().toLowerCase();

  if (!isDeliverableEmail(to)) {
    return {
      sent: false,
      skipped: true,
      error: 'Admin email is missing or not deliverable (.local addresses are skipped)',
      to,
    };
  }

  if (!isBrevoConfigured()) {
    return {
      sent: false,
      skipped: true,
      error: 'Brevo is not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL)',
      to,
    };
  }

  const { token, expiresAt } = await createTenantInviteToken({
    tenantId: opts.tenantId,
    email: to,
    name: opts.adminName,
  });

  const inviteUrl = `${appBaseUrl(opts.req)}/invite?token=${token}`;
  const mail = buildTenantInviteEmail({
    companyName: opts.companyName,
    workspace: opts.workspace,
    adminName: opts.adminName,
    adminEmail: to,
    inviteUrl,
    expiresHours: INVITE_TTL_HOURS,
  });

  const result = await sendBrevoEmail({
    toEmail: to,
    toName: opts.adminName,
    subject: mail.subject,
    htmlContent: mail.htmlContent,
    textContent: mail.textContent,
    tags: ['tenant-invite', 'set-password'],
  });

  if (!result.ok) {
    return { sent: false, error: result.error, to, inviteUrl };
  }

  return {
    sent: true,
    messageId: result.messageId,
    to,
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getInvitePreview(token: string) {
  await ensureTenantInvitesTable();
  const db = getDb();
  const tokenHash = hashInviteToken(token);
  const [invite] = await db
    .select()
    .from(tenantInvites)
    .where(eq(tenantInvites.tokenHash, tokenHash))
    .limit(1);

  if (!invite) return { ok: false as const, error: 'Invalid or expired invite link' };
  if (invite.acceptedAt) return { ok: false as const, error: 'This invite was already used' };
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, error: 'This invite link has expired' };
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, invite.tenantId)).limit(1);
  if (!tenant || tenant.status !== 'active') {
    return { ok: false as const, error: 'Workspace is not active' };
  }

  return {
    ok: true as const,
    email: invite.email,
    name: invite.name || tenant.adminName || 'Admin',
    companyName: tenant.name,
    workspace: tenant.slug,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export async function acceptTenantInvite(opts: {
  token: string;
  password: string;
  name?: string;
}) {
  await ensureTenantInvitesTable();
  const db = getDb();
  const tokenHash = hashInviteToken(opts.token);
  const [invite] = await db
    .select()
    .from(tenantInvites)
    .where(eq(tenantInvites.tokenHash, tokenHash))
    .limit(1);

  if (!invite) return { ok: false as const, error: 'Invalid or expired invite link', status: 400 };
  if (invite.acceptedAt) return { ok: false as const, error: 'This invite was already used', status: 400 };
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, error: 'This invite link has expired', status: 400 };
  }

  if (!opts.password || opts.password.length < 8) {
    return { ok: false as const, error: 'Password must be at least 8 characters', status: 400 };
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, invite.tenantId)).limit(1);
  if (!tenant || tenant.status !== 'active') {
    return { ok: false as const, error: 'Workspace is not active', status: 400 };
  }

  const passwordHash = await hashPassword(opts.password);
  const displayName = (opts.name || invite.name || tenant.adminName || 'Tenant Admin').trim();
  const sql = createTenantSql(tenant.schemaName);

  const [user] = await sql`
    SELECT id FROM users WHERE lower(email) = ${invite.email} AND deleted_at IS NULL LIMIT 1
  `;
  if (!user) {
    return { ok: false as const, error: 'Invited user was not found in workspace', status: 404 };
  }

  await sql`
    UPDATE users
    SET password_hash = ${passwordHash},
        name = ${displayName},
        status = 'active',
        updated_at = NOW()
    WHERE id = ${user.id}
  `;

  await db
    .update(tenantInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(tenantInvites.id, invite.id));

  return {
    ok: true as const,
    tenantId: tenant.id,
    schemaName: tenant.schemaName,
    userId: user.id as string,
    email: invite.email,
    workspace: tenant.slug,
    name: displayName,
  };
}
