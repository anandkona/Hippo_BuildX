import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSql, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { generateUuid } from '../lib/utils';
import { migrateTenant } from '../lib/db/migrate-tenant';
import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db/client';

describe('Phase 2: Project & Unit Bulk Generation', () => {
  const tenantC = {
    id: generateUuid(),
    name: 'Tenant C',
    slug: 'tenant-c',
    schemaName: 'tenant_c_test',
  };

  const sql = getSql();
  const db = getDb();

  beforeAll(async () => {
    // Clean up
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantC.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-c'));

    // Insert tenant C
    await db.insert(tenants).values(tenantC);

    // Provision schema
    await migrateTenant(tenantC.schemaName);
  });

  afterAll(async () => {
    // Cleanup
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantC.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.id, tenantC.id));
  });

  it('Generates a project and a full block/tower/floor/unit tree', async () => {
    const tenantSql = createTenantSql(tenantC.schemaName);
    
    // 1. Create a Project
    const projectId = generateUuid();
    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${tenantC.schemaName}", public`);
      await tx`INSERT INTO projects (id, tenant_id, name, code, status) VALUES (${projectId}, ${tenantC.id}, 'Test Project', 'TP-01', 'planning')`;
    });
    
    // 2. Simulate the Bulk API logic
    const blocksCount = 2;
    const towersPerBlock = 2;
    const floorsPerTower = 5;
    const unitsPerFloor = 4;
    
    let totalUnitsGenerated = 0;
    
    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${tenantC.schemaName}", public`);
      
      for (let b = 1; b <= blocksCount; b++) {
        const blockId = generateUuid();
        await tx`INSERT INTO blocks (id, tenant_id, project_id, name) VALUES (${blockId}, ${tenantC.id}, ${projectId}, 'Block ' || ${b})`;

        for (let t = 1; t <= towersPerBlock; t++) {
          const towerId = generateUuid();
          await tx`INSERT INTO towers (id, tenant_id, block_id, name) VALUES (${towerId}, ${tenantC.id}, ${blockId}, 'Tower ' || ${t})`;

          for (let f = 1; f <= floorsPerTower; f++) {
            const floorId = generateUuid();
            await tx`INSERT INTO floors (id, tenant_id, tower_id, name, floor_number) VALUES (${floorId}, ${tenantC.id}, ${towerId}, 'Floor ' || ${f}, ${f})`;

            for (let u = 1; u <= unitsPerFloor; u++) {
              const unitId = generateUuid();
              await tx`INSERT INTO units (id, tenant_id, floor_id, number, status) VALUES (${unitId}, ${tenantC.id}, ${floorId}, ${u}, 'available')`;
              totalUnitsGenerated++;
            }
          }
        }
      }
    });
    
    expect(totalUnitsGenerated).toBe(blocksCount * towersPerBlock * floorsPerTower * unitsPerFloor); // 2 * 2 * 5 * 4 = 80 units
    
    // 3. Verify in DB
    const [counts] = await tenantSql`
      SELECT 
        (SELECT COUNT(*) FROM blocks) as blocks_count,
        (SELECT COUNT(*) FROM towers) as towers_count,
        (SELECT COUNT(*) FROM floors) as floors_count,
        (SELECT COUNT(*) FROM units) as units_count
    `;
    
    expect(Number(counts.blocks_count)).toBe(blocksCount);
    expect(Number(counts.towers_count)).toBe(blocksCount * towersPerBlock);
    expect(Number(counts.floors_count)).toBe(blocksCount * towersPerBlock * floorsPerTower);
    expect(Number(counts.units_count)).toBe(80);
  }, 30000);
});
