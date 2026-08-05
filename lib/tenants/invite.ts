import { randomBytes } from 'crypto';
import { isBrevoConfigured, sendBrevoEmail } from '@/lib/email/brevo';
import { buildTenantInviteEmail } from '@/lib/email/templates/tenant-invite';

export type TenantInviteResult =
  | { sent: true; messageId: string; to: string }
  | { sent: false; skipped?: boolean; error: string; to?: string };

/** Strong temporary password for first login (no ambiguous chars). */
export function generateTempPassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

function appBaseUrl(req?: Request): string {
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

export async function sendTenantAdminInvite(opts: {
  companyName: string;
  workspace: string;
  adminName: string;
  adminEmail: string;
  tempPassword: string;
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

  const loginUrl = `${appBaseUrl(opts.req)}/login`;
  const mail = buildTenantInviteEmail({
    companyName: opts.companyName,
    workspace: opts.workspace,
    adminName: opts.adminName,
    adminEmail: to,
    tempPassword: opts.tempPassword,
    loginUrl,
  });

  const result = await sendBrevoEmail({
    toEmail: to,
    toName: opts.adminName,
    subject: mail.subject,
    htmlContent: mail.htmlContent,
    textContent: mail.textContent,
    tags: ['tenant-invite', 'platform-provision'],
  });

  if (!result.ok) {
    return { sent: false, error: result.error, to };
  }

  return { sent: true, messageId: result.messageId, to };
}
