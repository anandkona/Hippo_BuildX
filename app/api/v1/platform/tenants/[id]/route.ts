import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { tenants, subscriptions, plans } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { provisionTenantQueue } from '@/lib/queue';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [sub] = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        planId: subscriptions.planId,
        startsAt: subscriptions.startsAt,
        expiresAt: subscriptions.expiresAt,
        planName: plans.displayName,
        planPrice: plans.price,
        billingCycle: plans.billingCycle,
        maxUsers: plans.maxUsers,
        maxProjects: plans.maxProjects,
        maxStorageGb: plans.maxStorageGb,
        maxApiCalls: plans.maxApiCalls,
        supportLevel: plans.supportLevel,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.tenantId, id));

    const usage = (tenant.usage || {
      users: 0,
      projects: 0,
      storageGb: 0,
      apiCalls: 0,
    }) as {
      users?: number;
      projects?: number;
      storageGb?: number;
      apiCalls?: number;
    };

    return NextResponse.json({
      tenant: {
        ...tenant,
        domain: `${tenant.slug}.hippobuildx.com`,
      },
      subscription: sub || null,
      usage: {
        users: { used: usage.users || 0, limit: sub?.maxUsers || 0 },
        projects: { used: usage.projects || 0, limit: sub?.maxProjects || 0 },
        storage: { used: usage.storageGb || 0, limit: sub?.maxStorageGb || 0 },
        apiCalls: { used: usage.apiCalls || 0, limit: sub?.maxApiCalls || 0 },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const db = getDb();

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const stringFields = [
      'name',
      'legalName',
      'industry',
      'companySize',
      'gstin',
      'pan',
      'cin',
      'website',
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'pincode',
      'country',
      'contactName',
      'contactEmail',
      'contactPhone',
      'contactDesignation',
      'billingEmail',
      'adminName',
      'adminEmail',
      'status',
    ] as const;

    for (const key of stringFields) {
      if (body[key] !== undefined) {
        const value = typeof body[key] === 'string' ? body[key].trim() : body[key];
        updates[key] = value === '' ? null : value;
      }
    }
    if (typeof updates.gstin === 'string') updates.gstin = updates.gstin.toUpperCase();
    if (typeof updates.pan === 'string') updates.pan = updates.pan.toUpperCase();
    if (typeof updates.cin === 'string') updates.cin = updates.cin.toUpperCase();
    if (typeof updates.contactEmail === 'string') updates.contactEmail = updates.contactEmail.toLowerCase();
    if (typeof updates.billingEmail === 'string') updates.billingEmail = updates.billingEmail.toLowerCase();
    if (typeof updates.adminEmail === 'string') updates.adminEmail = updates.adminEmail.toLowerCase();

    if (body.branding !== undefined) updates.branding = body.branding;
    if (body.featureFlags !== undefined) updates.featureFlags = body.featureFlags;
    if (body.usage !== undefined) updates.usage = body.usage;

    const [updated] = await db.update(tenants).set(updates).where(eq(tenants.id, id)).returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Updated Tenant',
      resource: 'tenant',
      resourceId: id,
      details: `Updated tenant ${updated.name}`,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ tenant: { ...updated, domain: `${updated.slug}.hippobuildx.com` } });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (tenant.status === 'active') {
      return NextResponse.json({ message: 'Tenant is already active' }, { status: 400 });
    }

    await db.update(tenants).set({ status: 'provisioning' }).where(eq(tenants.id, id));
    await provisionTenantQueue.add('provision', {
      tenantId: tenant.id,
      schemaName: tenant.schemaName,
      name: tenant.name,
    });

    return NextResponse.json({ message: 'Tenant provisioning retried' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retry provisioning' }, { status: 500 });
  }
}
