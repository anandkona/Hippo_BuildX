import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { subscriptions, tenants, plans } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { extractContextFromHeaders } from '@/lib/tenant-context';

export async function GET() {
  try {
    const db = getDb();
    const allSubscriptions = await db
      .select({
        id: subscriptions.id,
        tenantId: subscriptions.tenantId,
        planId: subscriptions.planId,
        status: subscriptions.status,
        startsAt: subscriptions.startsAt,
        expiresAt: subscriptions.expiresAt,
        createdAt: subscriptions.createdAt,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        planName: plans.displayName,
        planPrice: plans.price,
      })
      .from(subscriptions)
      .leftJoin(tenants, eq(subscriptions.tenantId, tenants.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id));

    return NextResponse.json({ subscriptions: allSubscriptions });
  } catch (error: any) {
    console.error('Failed to fetch subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { tenantId, planId, status, expiresAt } = body;

    if (!tenantId || !planId) {
      return NextResponse.json({ error: 'Tenant ID and Plan ID are required' }, { status: 400 });
    }

    const db = getDb();

    // Check if tenant already has an active subscription
    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId));

    if (existing) {
      // Update existing subscription
      const [updated] = await db.update(subscriptions)
        .set({
          planId,
          status: status || 'active',
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existing.id))
        .returning();

      return NextResponse.json({ subscription: updated });
    }

    // Create new subscription
    const [newSubscription] = await db.insert(subscriptions).values({
      tenantId,
      planId,
      status: status || 'active',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();

    return NextResponse.json({ subscription: newSubscription }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create subscription:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
