import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSql, getDb, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { generateUuid } from '../lib/utils';
import { migrateTenant } from '../lib/db/migrate-tenant';
import { eq } from 'drizzle-orm';

describe('Phase 6: Procurement & Planning', () => {
  const tenantProcurement = {
    id: generateUuid(),
    name: 'Tenant Procurement',
    slug: 'tenant-proc',
    schemaName: 'tenant_proc_test',
  };

  const sql = getSql();
  const db = getDb();

  beforeAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantProcurement.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-proc'));

    await db.insert(tenants).values(tenantProcurement);
    await migrateTenant(tenantProcurement.schemaName);
  }, 30000);

  afterAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantProcurement.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.id, tenantProcurement.id));
  });

  it('Creates a BOQ, vendor, and calculates PO totals correctly', async () => {
    const tenantSql = createTenantSql(tenantProcurement.schemaName);
    let projectId = generateUuid();
    let boqId = generateUuid();
    let vendorId = generateUuid();
    let poId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${tenantProcurement.schemaName}", public`);

      // 1. Setup project
      await tx`INSERT INTO projects (id, tenant_id, name) VALUES (${projectId}, ${tenantProcurement.id}, 'Procurement Project')`;
      
      // 2. Setup BOQ Item
      const boqQty = 1000;
      const boqRate = 50;
      await tx`
        INSERT INTO boq_items (id, tenant_id, project_id, name, quantity, uom, rate, amount) 
        VALUES (${boqId}, ${tenantProcurement.id}, ${projectId}, 'Cement (Bags)', ${boqQty}, 'bags', ${boqRate}, ${boqQty * boqRate})
      `;

      // 3. Setup Vendor
      await tx`
        INSERT INTO vendors (id, tenant_id, name, contact_name, status) 
        VALUES (${vendorId}, ${tenantProcurement.id}, 'UltraTech Cement', 'John Doe', 'active')
      `;

      // 4. Create PO (simulate API logic)
      const lineQty = 500;
      const lineRate = 52; // Market rate fluctuated
      const lineAmount = lineQty * lineRate;
      
      await tx`
        INSERT INTO purchase_orders (id, tenant_id, vendor_id, project_id, po_number, total_amount, status)
        VALUES (${poId}, ${tenantProcurement.id}, ${vendorId}, ${projectId}, 'PO-001', ${lineAmount}, 'draft')
      `;

      await tx`
        INSERT INTO po_lines (id, tenant_id, po_id, item_id, quantity, rate, amount)
        VALUES (${generateUuid()}, ${tenantProcurement.id}, ${poId}, ${boqId}, ${lineQty}, ${lineRate}, ${lineAmount})
      `;
    });

    // 5. Verify PO total and vendor mapping
    const [poRecord] = await tenantSql`
      SELECT po.total_amount, po.po_number, v.name as vendor_name 
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE po.id = ${poId}
    `;

    expect(poRecord).toBeDefined();
    expect(poRecord.po_number).toBe('PO-001');
    expect(poRecord.vendor_name).toBe('UltraTech Cement');
    expect(parseFloat(poRecord.total_amount)).toBe(26000); // 500 * 52
  }, 30000);
});
