import { getSql, getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { migrateTenant } from '@/lib/db/migrate-tenant';

interface ProvisionJobData {
  tenantId: string;
  schemaName: string;
  name: string;
}

export async function handleProvisionTenant(data: ProvisionJobData) {
  const { tenantId, schemaName } = data;
  const sql = getSql();
  const db = getDb();

  try {
    console.log(`[Provisioning] Creating schema ${schemaName}...`);
    // 1. Create the database schema
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // 2. Run drizzle migrations targeting this schema
    await migrateTenant(schemaName);
    console.log(`[Provisioning] Applied migrations for ${schemaName}`);

    // 3. Update the tenant status to active
    await db.update(tenants).set({ status: 'active' }).where(eq(tenants.id, tenantId));
    console.log(`[Provisioning] Tenant ${tenantId} activated successfully.`);

  } catch (error) {
    console.error(`[Provisioning] Failed for tenant ${tenantId}`, error);
    // Mark as failed
    await db.update(tenants).set({ status: 'failed' }).where(eq(tenants.id, tenantId));
    throw error; // Rethrow so BullMQ registers the failure and can retry
  }
}
