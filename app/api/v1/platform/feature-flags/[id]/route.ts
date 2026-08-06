import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { featureFlags } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const db = getDb();

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.scope !== undefined) updates.scope = body.scope;

    const [updated] = await db
      .update(featureFlags)
      .set(updates)
      .where(eq(featureFlags.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Toggled Feature Flag',
      resource: 'feature_flag',
      resourceId: id,
      details: `${updated.name} is now ${updated.enabled ? 'Enabled' : 'Disabled'}`,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ featureFlag: updated });
  } catch (error: any) {
    console.error('Failed to update feature flag:', error);
    return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 });
  }
}
