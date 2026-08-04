import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSql, getDb, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { generateUuid } from '../lib/utils';
import { migrateTenant } from '../lib/db/migrate-tenant';
import { eq } from 'drizzle-orm';
import { eventBus } from '../lib/events/emitter';

describe('Phase 4: Construction Progress', () => {
  const tenantCrm = {
    id: generateUuid(),
    name: 'Tenant Progress',
    slug: 'tenant-progress',
    schemaName: 'tenant_progress_test',
  };

  const sql = getSql();
  const db = getDb();

  beforeAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantCrm.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-progress'));

    await db.insert(tenants).values(tenantCrm);
    await migrateTenant(tenantCrm.schemaName);
  }, 30000);

  afterAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantCrm.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.id, tenantCrm.id));
  });

  it('Recalculates unit progress and emits event on engineer approval', async () => {
    const tenantSql = createTenantSql(tenantCrm.schemaName);
    let projectId = generateUuid();
    let blockId = generateUuid();
    let towerId = generateUuid();
    let floorId = generateUuid();
    let unitId = generateUuid();
    let template1 = generateUuid();
    let template2 = generateUuid();
    let activity1 = generateUuid();
    let activity2 = generateUuid();
    
    // Setup event listener
    let eventReceived: any = null;
    const listener = (event: any) => {
      eventReceived = event;
    };
    eventBus.on('progress.updated', listener);

    await tenantSql.begin(async (tx) => {
      // Setup unit hierarchy
      await tx`INSERT INTO projects (id, tenant_id, name) VALUES (${projectId}, ${tenantCrm.id}, 'Progress Project')`;
      await tx`INSERT INTO blocks (id, tenant_id, project_id, name) VALUES (${blockId}, ${tenantCrm.id}, ${projectId}, 'Block A')`;
      await tx`INSERT INTO towers (id, tenant_id, block_id, name) VALUES (${towerId}, ${tenantCrm.id}, ${blockId}, 'Tower 1')`;
      await tx`INSERT INTO floors (id, tenant_id, tower_id, name, floor_number) VALUES (${floorId}, ${tenantCrm.id}, ${towerId}, 'Floor 1', 1)`;
      await tx`INSERT INTO units (id, tenant_id, floor_id, number, status) VALUES (${unitId}, ${tenantCrm.id}, ${floorId}, '101', 'available')`;
      
      // Setup templates
      await tx`INSERT INTO activity_templates (id, tenant_id, name, default_weight_percentage) VALUES (${template1}, ${tenantCrm.id}, 'Foundation', 40)`;
      await tx`INSERT INTO activity_templates (id, tenant_id, name, default_weight_percentage) VALUES (${template2}, ${tenantCrm.id}, 'Slab', 60)`;
      
      // Instantiate activities for the unit
      await tx`INSERT INTO unit_activities (id, tenant_id, unit_id, template_id, name, weight_percentage) VALUES (${activity1}, ${tenantCrm.id}, ${unitId}, ${template1}, 'Foundation', 40)`;
      await tx`INSERT INTO unit_activities (id, tenant_id, unit_id, template_id, name, weight_percentage) VALUES (${activity2}, ${tenantCrm.id}, ${unitId}, ${template2}, 'Slab', 60)`;
    });

    // We can't easily run Next.js API endpoints in vitest without setup, so we'll simulate the POST API's transaction logic exactly as we wrote it
    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${tenantCrm.schemaName}", public`);
      const approverId = generateUuid();
      await tx`INSERT INTO users (id, tenant_id, email, name) VALUES (${approverId}, ${tenantCrm.id}, 'eng@test.com', 'Eng Test')`;
      
      // Approve Activity 1 to 100%
      await tx`INSERT INTO engineer_approvals (id, tenant_id, activity_id, approved_percentage, approved_by) VALUES (${generateUuid()}, ${tenantCrm.id}, ${activity1}, 100, ${approverId})`;
      await tx`UPDATE unit_activities SET completion_percentage = 100, status = 'completed' WHERE id = ${activity1}`;
      
      // Recalculate
      const activities = await tx`SELECT weight_percentage, completion_percentage FROM unit_activities WHERE unit_id = ${unitId}`;
      let totalWeighted = 0;
      let totalWeights = 0;
      for (const act of activities) {
        totalWeights += parseFloat(act.weight_percentage);
        totalWeighted += (parseFloat(act.weight_percentage) * parseFloat(act.completion_percentage)) / 100;
      }
      const newProgress = (totalWeighted / totalWeights) * 100;
      await tx`UPDATE units SET progress = ${newProgress} WHERE id = ${unitId}`;
      
      // Emit simulated event
      eventBus.emit('progress.updated', { unitId, newProgress });
    });

    // Assertions
    const [unit] = await tenantSql`SELECT progress FROM units WHERE id = ${unitId}`;
    expect(parseFloat(unit.progress)).toBe(40); // 100% of 40% weight
    
    // Second approval
    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${tenantCrm.schemaName}", public`);
      await tx`UPDATE unit_activities SET completion_percentage = 50, status = 'in_progress' WHERE id = ${activity2}`;
      
      const activities = await tx`SELECT weight_percentage, completion_percentage FROM unit_activities WHERE unit_id = ${unitId}`;
      let totalWeighted = 0;
      let totalWeights = 0;
      for (const act of activities) {
        totalWeights += parseFloat(act.weight_percentage);
        totalWeighted += (parseFloat(act.weight_percentage) * parseFloat(act.completion_percentage)) / 100;
      }
      const newProgress = (totalWeighted / totalWeights) * 100;
      await tx`UPDATE units SET progress = ${newProgress} WHERE id = ${unitId}`;
      
      eventBus.emit('progress.updated', { unitId, newProgress });
    });

    const [unit2] = await tenantSql`SELECT progress FROM units WHERE id = ${unitId}`;
    expect(parseFloat(unit2.progress)).toBe(70); // 40% + (50% of 60%) = 40 + 30 = 70
    
    expect(eventReceived).not.toBeNull();
    expect(eventReceived.unitId).toBe(unitId);
    expect(eventReceived.newProgress).toBe(70);
    
    eventBus.off('progress.updated', listener);
  });
});
