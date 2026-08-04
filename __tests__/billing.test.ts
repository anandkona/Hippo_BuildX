import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSql, getDb, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { generateUuid } from '../lib/utils';
import { migrateTenant } from '../lib/db/migrate-tenant';
import { eq } from 'drizzle-orm';
import { eventBus } from '../lib/events/emitter';
import { evaluateProgressForBilling } from '../lib/domain/billing/rules-engine';

// NOTE: Since the rules engine relies on the database, we simulate the event call directly 
// using the engine function to ensure promises resolve before checking db state.
describe('Phase 5: Payment-vs-Progress Engine', () => {
  const tenantBilling = {
    id: generateUuid(),
    name: 'Tenant Billing',
    slug: 'tenant-billing',
    schemaName: 'tenant_billing_test',
  };

  const sql = getSql();
  const db = getDb();

  beforeAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantBilling.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-billing'));

    await db.insert(tenants).values(tenantBilling);
    await migrateTenant(tenantBilling.schemaName);
  }, 30000);

  afterAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantBilling.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.id, tenantBilling.id));
  });

  it('Generates demand letters idempotently based on progress thresholds', async () => {
    const tenantSql = createTenantSql(tenantBilling.schemaName);
    let unitId = generateUuid();
    let planId = generateUuid();
    let ms1Id = generateUuid();
    let ms2Id = generateUuid();

    await tenantSql.begin(async (tx) => {
      // 1. Setup project/unit
      let projectId = generateUuid();
      let blockId = generateUuid();
      let towerId = generateUuid();
      let floorId = generateUuid();
      await tx`INSERT INTO projects (id, tenant_id, name) VALUES (${projectId}, ${tenantBilling.id}, 'Billing Project')`;
      await tx`INSERT INTO blocks (id, tenant_id, project_id, name) VALUES (${blockId}, ${tenantBilling.id}, ${projectId}, 'Block A')`;
      await tx`INSERT INTO towers (id, tenant_id, block_id, name) VALUES (${towerId}, ${tenantBilling.id}, ${blockId}, 'Tower 1')`;
      await tx`INSERT INTO floors (id, tenant_id, tower_id, name, floor_number) VALUES (${floorId}, ${tenantBilling.id}, ${towerId}, 'Floor 1', 1)`;
      await tx`INSERT INTO units (id, tenant_id, floor_id, number, status) VALUES (${unitId}, ${tenantBilling.id}, ${floorId}, '101', 'available')`;
      
      // 2. Setup Payment Plan
      await tx`INSERT INTO payment_plans (id, tenant_id, name) VALUES (${planId}, ${tenantBilling.id}, 'Standard Plan')`;
      await tx`INSERT INTO payment_milestones (id, tenant_id, plan_id, name, threshold_percentage, installment_percentage) VALUES (${ms1Id}, ${tenantBilling.id}, ${planId}, 'Plinth Completion', 20, 10)`;
      await tx`INSERT INTO payment_milestones (id, tenant_id, plan_id, name, threshold_percentage, installment_percentage) VALUES (${ms2Id}, ${tenantBilling.id}, ${planId}, 'Slab 1', 40, 15)`;
      
      // 3. Attach plan to unit (Total value 10,000,000)
      await tx`INSERT INTO unit_payment_plans (id, tenant_id, unit_id, plan_id, total_value) VALUES (${generateUuid()}, ${tenantBilling.id}, ${unitId}, ${planId}, 10000000)`;
    });

    // Fire 1st event: Progress is 25% (crosses ms1 but not ms2)
    await evaluateProgressForBilling(tenantBilling.id, unitId, 25);
    
    let letters = await tenantSql`SELECT id, amount, status, milestone_id FROM demand_letters WHERE unit_id = ${unitId}`;
    expect(letters.length).toBe(1);
    expect(letters[0].milestone_id).toBe(ms1Id);
    expect(parseFloat(letters[0].amount)).toBe(1000000); // 10% of 10M

    // Fire 1st event AGAIN: Progress is still 25%
    await evaluateProgressForBilling(tenantBilling.id, unitId, 25);
    letters = await tenantSql`SELECT id FROM demand_letters WHERE unit_id = ${unitId}`;
    expect(letters.length).toBe(1); // Idempotent!

    // Fire 2nd event: Progress is 45% (crosses ms2)
    await evaluateProgressForBilling(tenantBilling.id, unitId, 45);
    letters = await tenantSql`SELECT id, amount, status, milestone_id FROM demand_letters WHERE unit_id = ${unitId} ORDER BY created_at ASC`;
    expect(letters.length).toBe(2);
    expect(letters[1].milestone_id).toBe(ms2Id);
    expect(parseFloat(letters[1].amount)).toBe(1500000); // 15% of 10M

    // Test Receipts
    const demandLetterId = letters[0].id;
    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${tenantBilling.schemaName}", public`);
      await tx`INSERT INTO receipts (id, tenant_id, demand_letter_id, amount_received, payment_mode) VALUES (${generateUuid()}, ${tenantBilling.id}, ${demandLetterId}, 1000000, 'bank_transfer')`;
      await tx`UPDATE demand_letters SET status = 'paid' WHERE id = ${demandLetterId}`;
    });

    const [updatedLetter] = await tenantSql`SELECT status FROM demand_letters WHERE id = ${demandLetterId}`;
    expect(updatedLetter.status).toBe('paid');
  }, 30000);
});
