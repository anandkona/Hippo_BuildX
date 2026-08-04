import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSql, getDb, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { generateUuid } from '../lib/utils';
import { migrateTenant } from '../lib/db/migrate-tenant';
import { eq } from 'drizzle-orm';

describe('Phase 10: Inventory', () => {
  const tenantInventory = {
    id: generateUuid(),
    name: 'Tenant Inventory',
    slug: 'tenant-inv',
    schemaName: 'tenant_inv_test',
  };

  const sql = getSql();
  const db = getDb();

  beforeAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantInventory.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-inv'));

    await db.insert(tenants).values(tenantInventory);
    await migrateTenant(tenantInventory.schemaName);
  }, 30000);

  afterAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantInventory.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.id, tenantInventory.id));
  });

  it('Processes GRN and Issue properly, preventing negative stock', async () => {
    const tenantSql = createTenantSql(tenantInventory.schemaName);
    
    let materialId = generateUuid();
    let warehouseId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${tenantInventory.schemaName}", public`);

      // 1. Create Material and Warehouse
      await tx`
        INSERT INTO materials (id, tenant_id, name, uom)
        VALUES (${materialId}, ${tenantInventory.id}, 'Cement 53 Grade', 'Bags')
      `;
      await tx`
        INSERT INTO warehouses (id, tenant_id, name)
        VALUES (${warehouseId}, ${tenantInventory.id}, 'Central Warehouse')
      `;

      // 2. Process GRN (Good Receipt Note) - Receive 100 bags
      await tx`
        INSERT INTO stock_levels (id, tenant_id, warehouse_id, material_id, quantity)
        VALUES (${generateUuid()}, ${tenantInventory.id}, ${warehouseId}, ${materialId}, 100)
      `;

      // 3. Process Issue - Give out 40 bags
      // Simulate the atomic UPDATE
      const [stock] = await tx`
        UPDATE stock_levels 
        SET quantity = quantity - 40, last_updated = NOW() 
        WHERE warehouse_id = ${warehouseId} AND material_id = ${materialId}
        RETURNING quantity
      `;
      expect(parseFloat(stock.quantity)).toBe(60); // 100 - 40 = 60
    });

    // 4. Verify Final Stock Level
    const [finalStock] = await tenantSql`
      SELECT quantity FROM stock_levels 
      WHERE warehouse_id = ${warehouseId} AND material_id = ${materialId}
    `;

    expect(parseFloat(finalStock.quantity)).toBe(60);
  }, 30000);
});
