import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Ensures the JWT tenant is still allowed to use the API.
 * Suspended / failed / missing tenants are rejected.
 */
export async function assertTenantActive(tenantId: string): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  if (!tenantId || tenantId === 'PLATFORM') {
    return { ok: true };
  }

  const db = getDb();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

  if (!tenant) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }),
    };
  }

  if (tenant.status === 'suspended') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Tenant suspended' }, { status: 403 }),
    };
  }

  if (tenant.status !== 'active') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Tenant not active (status=${tenant.status})` },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}
