import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { action } = body; // 'suspend' or 'resume'

    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let newStatus: string;
    if (action === 'suspend') {
      if (tenant.status === 'suspended') {
        return NextResponse.json({ error: 'Tenant is already suspended' }, { status: 400 });
      }
      newStatus = 'suspended';
    } else if (action === 'resume') {
      if (tenant.status !== 'suspended') {
        return NextResponse.json({ error: 'Tenant is not suspended' }, { status: 400 });
      }
      newStatus = 'active';
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "suspend" or "resume"' }, { status: 400 });
    }

    const [updated] = await db.update(tenants)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    await logPlatformAudit({
      actorUserId: context.userId,
      action: newStatus === 'suspended' ? 'Suspended Tenant' : 'Resumed Tenant',
      resource: 'tenant',
      resourceId: id,
      details: `${newStatus === 'suspended' ? 'Suspended' : 'Resumed'} ${tenant.name}`,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({
      message: `Tenant ${newStatus === 'suspended' ? 'suspended' : 'resumed'} successfully`,
      tenant: updated,
    });
  } catch (error) {
    console.error('Failed to update tenant status:', error);
    return NextResponse.json({ error: 'Failed to update tenant status' }, { status: 500 });
  }
}
