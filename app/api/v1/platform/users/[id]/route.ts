import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { platformUsers } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { hashPassword } from '@/lib/auth/crypto';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function sanitize(user: typeof platformUsers.$inferSelect) {
  const { passwordHash, ...rest } = user;
  return rest;
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

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email;
    if (body.role !== undefined) updates.role = body.role;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.password) updates.passwordHash = await hashPassword(body.password);

    const [updated] = await db
      .update(platformUsers)
      .set(updates)
      .where(eq(platformUsers.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Updated Platform User',
      resource: 'platform_user',
      resourceId: id,
      details: `Updated user ${updated.email}`,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ user: sanitize(updated) });
  } catch (error: any) {
    console.error('Failed to update platform user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (context.userId === id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const db = getDb();
    const [updated] = await db
      .update(platformUsers)
      .set({ isActive: false })
      .where(eq(platformUsers.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Deactivated Platform User',
      resource: 'platform_user',
      resourceId: id,
      details: `Deactivated user ${updated.email}`,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ message: 'User deactivated', user: sanitize(updated) });
  } catch (error: any) {
    console.error('Failed to deactivate platform user:', error);
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
  }
}
