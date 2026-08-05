import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { tenants, subscriptions, plans } from '@/lib/db/schema/control-plane';
import { provisionTenantQueue } from '@/lib/queue';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { eq, desc } from 'drizzle-orm';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);

    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, planId } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const schemaName = `tenant_${slug.replace(/[^a-z0-9_]/g, '')}`;

    const db = getDb();

    const [newTenant] = await db
      .insert(tenants)
      .values({
        name,
        slug,
        schemaName,
        status: 'provisioning',
        usage: { users: 0, projects: 0, storageGb: 0, apiCalls: 0 },
      })
      .returning();

    if (planId) {
      await db.insert(subscriptions).values({
        tenantId: newTenant.id,
        planId,
        status: 'trial',
      });
    }

    let queueError: string | null = null;
    try {
      await provisionTenantQueue.add('provision', { tenantId: newTenant.id, schemaName, name });
    } catch (err: any) {
      // Redis/worker may be unavailable locally — tenant row still created for retry.
      console.error('Failed to enqueue provision job:', err);
      queueError = err?.message || 'Queue unavailable';
    }

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Created Tenant',
      resource: 'tenant',
      resourceId: newTenant.id,
      details: queueError
        ? `Created tenant ${name} (provision job deferred: ${queueError})`
        : `Created tenant ${name}`,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json(
      {
        message: queueError
          ? 'Tenant created; provisioning queued when worker/redis is available'
          : 'Tenant provisioning started',
        tenant: newTenant,
        queueWarning: queueError,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Failed to provision tenant:', error);
    if (error.message?.includes('unique')) {
      return NextResponse.json({ error: 'A tenant with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to provision tenant', details: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    const allSubs = await db
      .select({
        tenantId: subscriptions.tenantId,
        planId: subscriptions.planId,
        status: subscriptions.status,
        planName: plans.displayName,
        planPrice: plans.price,
        maxUsers: plans.maxUsers,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id));

    const enriched = allTenants.map((t) => {
      const sub = allSubs.find((s) => s.tenantId === t.id);
      const usage = (t.usage || {}) as { users?: number };
      return {
        ...t,
        domain: `${t.slug}.hippobuildx.com`,
        planName: sub?.planName || null,
        planId: sub?.planId || null,
        subscriptionStatus: sub?.status || null,
        userCount: usage.users ?? 0,
      };
    });

    return NextResponse.json({ tenants: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}
