import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { provisionTenantQueue } from '@/lib/queue';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
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

    // Set status back to provisioning and enqueue
    await db.update(tenants).set({ status: 'provisioning' }).where(eq(tenants.id, id));
    await provisionTenantQueue.add('provision', { tenantId: tenant.id, schemaName: tenant.schemaName, name: tenant.name });

    return NextResponse.json({ message: 'Tenant provisioning retried' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retry provisioning' }, { status: 500 });
  }
}
