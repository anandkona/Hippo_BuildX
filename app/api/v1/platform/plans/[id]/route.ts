import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { plans } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { extractContextFromHeaders } from '@/lib/tenant-context';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const db = getDb();
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
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

    const [updated] = await db.update(plans)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ plan: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const context = extractContextFromHeaders(_req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    const [deleted] = await db.update(plans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(plans.id, id))
      .returning();

    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ message: 'Plan deactivated' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
