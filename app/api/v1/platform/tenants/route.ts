import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { provisionTenantQueue } from '@/lib/queue';
import { extractContextFromHeaders } from '@/lib/tenant-context';

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    
    // We already checked in middleware, but for extra safety check again
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const schemaName = `tenant_${slug.replace(/[^a-z0-9_]/g, '')}`;

    const db = getDb();
    
    // Insert into public.tenants as 'provisioning'
    const [newTenant] = await db.insert(tenants).values({
      name,
      slug,
      schemaName,
      status: 'provisioning',
    }).returning();

    // Enqueue the job for the BullMQ worker
    await provisionTenantQueue.add('provision', { tenantId: newTenant.id, schemaName, name });

    return NextResponse.json({ message: 'Tenant provisioning started', tenant: newTenant }, { status: 202 });
  } catch (error: any) {
    console.error('Failed to provision tenant:', error);
    return NextResponse.json({ error: 'Failed to provision tenant', details: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const allTenants = await db.select().from(tenants);
    return NextResponse.json({ tenants: allTenants });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}
