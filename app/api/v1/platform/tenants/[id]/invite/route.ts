import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { sendTenantAdminInvite } from '@/lib/tenants/invite';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';

/** Resend set-password invite for an active tenant admin */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    if (tenant.status !== 'active') {
      return NextResponse.json({ error: 'Tenant must be active to send invite' }, { status: 400 });
    }

    const adminEmail = tenant.adminEmail?.trim().toLowerCase();
    if (!adminEmail) {
      return NextResponse.json({ error: 'Tenant has no admin email' }, { status: 400 });
    }

    const invite = await sendTenantAdminInvite({
      tenantId: tenant.id,
      companyName: tenant.name,
      workspace: tenant.slug,
      adminName: tenant.adminName || `${tenant.name} Admin`,
      adminEmail,
      req,
    });

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Resent Tenant Invite',
      resource: 'tenant',
      resourceId: tenant.id,
      details: invite.sent
        ? `Resent set-password invite to ${invite.to}`
        : `Invite resend failed: ${invite.error}`,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ invite });
  } catch (error) {
    console.error('Resend invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
