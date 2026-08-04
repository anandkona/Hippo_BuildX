import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, createTenantSql, getSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { migrateTenant } from '../lib/db/migrate-tenant';

// A simple UUID generator for testing purposes since we don't have uuid imported
function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

describe('Cross-Tenant Data Isolation', () => {
  let tenantA: any;
  let tenantB: any;
  
  beforeAll(async () => {
    const db = getDb();
    const sql = getSql();
    
    // Ensure we start clean for these test schemas
    await sql.unsafe(`DROP SCHEMA IF EXISTS "tenant_a_test" CASCADE`);
    await sql.unsafe(`DROP SCHEMA IF EXISTS "tenant_b_test" CASCADE`);
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-a'));
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-b'));

    // Create Tenant A
    tenantA = {
      id: generateUuid(),
      name: 'Tenant A',
      slug: 'tenant-a',
      schemaName: 'tenant_a_test',
    };
    
    await db.insert(tenants).values(tenantA);
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${tenantA.schemaName}"`);
    await migrateTenant(tenantA.schemaName);

    // Create Tenant B
    tenantB = {
      id: generateUuid(),
      name: 'Tenant B',
      slug: 'tenant-b',
      schemaName: 'tenant_b_test',
    };
    await db.insert(tenants).values(tenantB);
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${tenantB.schemaName}"`);
    await migrateTenant(tenantB.schemaName);
  });
  
  afterAll(async () => {
    const db = getDb();
    const sql = getSql();
    // Cleanup
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantA.schemaName}" CASCADE`);
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantB.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.id, tenantA.id));
    await db.delete(tenants).where(eq(tenants.id, tenantB.id));
  });

  it('Tenant A cannot see Tenant B data', async () => {
    const sqlA = createTenantSql(tenantA.schemaName);
    const sqlB = createTenantSql(tenantB.schemaName);
    
    // Insert user into Tenant A
    const userAId = generateUuid();
    await sqlA`INSERT INTO users (id, tenant_id, email, name) VALUES (${userAId}, ${tenantA.id}, 'userA@test.com', 'User A')`;
    
    // Insert user into Tenant B
    const userBId = generateUuid();
    await sqlB`INSERT INTO users (id, tenant_id, email, name) VALUES (${userBId}, ${tenantB.id}, 'userB@test.com', 'User B')`;
    
    // Query users in Tenant A
    const usersInA = await sqlA`SELECT * FROM users`;
    expect(usersInA).toHaveLength(1);
    expect(usersInA[0].email).toBe('userA@test.com');
    
    // Query users in Tenant B
    const usersInB = await sqlB`SELECT * FROM users`;
    expect(usersInB).toHaveLength(1);
    expect(usersInB[0].email).toBe('userB@test.com');
  });
});
