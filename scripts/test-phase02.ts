/**
 * Phase 2 backend proof suite (Property + Planning-lite):
 * - migration 002 applied
 * - project tree + bulk unit generation
 * - unit status history audit
 * - FS task dependencies + gantt payload
 * - BOQ / drawings versioning / RFI versioning
 * - project scope axis denies foreign project
 *
 * Usage: npx tsx scripts/test-phase02.ts
 */
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getDb, getSql, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { provisionTenant } from '../lib/tenants/provision';
import { isMigrationApplied } from '../lib/tenants/migrations';
import { evaluateScope } from '../lib/rbac/scope';
import {
  bulkGenerateHierarchy,
  changeUnitStatus,
  createProject,
  getProjectTree,
  listUnits,
} from '../lib/projects/hierarchy';
import {
  addTaskDependency,
  createDrawingVersion,
  createMilestone,
  createRfiVersion,
  createTask,
  getGanttData,
  upsertBoqItem,
  upsertBudgetLine,
} from '../lib/projects/planning';
import { seedDemoProject } from '../lib/projects/seed-demo';
import { ensureDefaultUnitCategories } from '../lib/projects/defaults';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function cleanupTenant(slug: string) {
  const db = getDb();
  const sql = getSql();
  const [t] = await db.select().from(tenants).where(eq(tenants.slug, slug));
  if (!t) return;
  await sql.unsafe(`DROP SCHEMA IF EXISTS "${t.schemaName}" CASCADE`);
  await sql.unsafe(`DELETE FROM tenant_migrations WHERE tenant_id = $1`, [t.id]);
  await db.delete(tenants).where(eq(tenants.id, t.id));
}

async function main() {
  console.log('\n▶ Phase 2 suite\n');
  const stamp = Date.now().toString(36);
  const slug = `p2_${stamp}`;
  const db = getDb();

  try {
    await cleanupTenant(slug);

    const [row] = await db
      .insert(tenants)
      .values({
        name: 'Phase2 Tenant',
        slug,
        schemaName: `tenant_${slug}`,
        status: 'provisioning',
        adminEmail: `admin@${slug}.test`,
        adminName: 'Phase2 Admin',
      })
      .returning();

    await provisionTenant({
      tenantId: row.id,
      schemaName: row.schemaName,
      name: row.name,
      adminEmail: `admin@${slug}.test`,
      adminName: 'Phase2 Admin',
      adminPassword: 'password123',
    });

    assert(await isMigrationApplied(row.id, '001_identity_core'), '001 applied');
    assert(await isMigrationApplied(row.id, '002_property_planning'), '002 applied');
    console.log('  ✓ migration 002_property_planning');

    await ensureDefaultUnitCategories(row.schemaName, row.id);
    const sql = createTenantSql(row.schemaName);
    const cats = await sql`SELECT code FROM unit_categories WHERE deleted_at IS NULL`;
    assert(cats.length >= 5, 'default unit categories seeded');
    console.log('  ✓ unit categories');

    const project = await createProject(row.schemaName, {
      tenantId: row.id,
      code: 'SKY-01',
      name: 'Skyline Heights',
      status: 'active',
      city: 'Bengaluru',
    });
    assert(project.id, 'project created');

    const [cat] = await sql`
      SELECT id FROM unit_categories WHERE code = 'FLAT_2BHK' LIMIT 1
    `;

    const gen = await bulkGenerateHierarchy(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      block: { code: 'A', name: 'Block A' },
      towers: [
        {
          code: 'T1',
          name: 'Tower 1',
          floorCount: 3,
          unitsPerFloor: 4,
          unitType: 'flat',
          categoryId: cat.id as string,
          unitPrefix: 'A1',
        },
      ],
    });
    assert(gen.towers === 1 && gen.floors === 3 && gen.units === 12, 'bulk generated 12 units');
    console.log('  ✓ bulk tower/floor/unit generation');

    const tree = await getProjectTree(row.schemaName, project.id as string);
    assert(tree && tree.unitCount === 12, 'tree unitCount');
    assert(tree!.availability.available === 12, 'all available after generation');
    console.log('  ✓ project tree + availability');

    const listed = await listUnits(row.schemaName, project.id as string, { status: 'available' });
    assert(listed.meta.total === 12, 'availability list');
    const unitId = listed.data[0].id as string;

    const changed = await changeUnitStatus(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      unitId,
      toStatus: 'reserved',
      reason: 'Sales hold',
    });
    assert((changed.unit.status as string) === 'reserved', 'status reserved');

    const history = await sql`
      SELECT from_status, to_status FROM unit_status_history
      WHERE unit_id = ${unitId}
      ORDER BY created_at
    `;
    assert(history.length >= 2, 'status history has create + change');
    assert(history.some((h: { to_status: string }) => h.to_status === 'reserved'), 'reserved audited');
    console.log('  ✓ unit status history');

    // FK placeholders for CRM/payment later
    const [u] = await sql`
      SELECT booking_id, customer_id, payment_plan_id FROM units WHERE id = ${unitId}
    `;
    assert(u.booking_id === null && u.customer_id === null && u.payment_plan_id === null, 'link columns present');
    console.log('  ✓ unit link columns for booking/customer/payment plan');

    const m1 = await createMilestone(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      name: 'Foundation',
      plannedStart: '2026-01-01',
      plannedEnd: '2026-02-28',
    });
    const t1 = await createTask(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      milestoneId: m1.id as string,
      name: 'Excavation',
      plannedStart: '2026-01-01',
      plannedEnd: '2026-01-20',
    });
    const t2 = await createTask(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      milestoneId: m1.id as string,
      name: 'Footings',
      plannedStart: '2026-01-21',
      plannedEnd: '2026-02-15',
    });
    await addTaskDependency(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      predecessorTaskId: t1.id as string,
      successorTaskId: t2.id as string,
    });

    let cycleBlocked = false;
    try {
      await addTaskDependency(row.schemaName, {
        tenantId: row.id,
        projectId: project.id as string,
        predecessorTaskId: t2.id as string,
        successorTaskId: t1.id as string,
      });
    } catch {
      cycleBlocked = true;
    }
    assert(cycleBlocked, 'cycle dependency rejected');

    const gantt = await getGanttData(row.schemaName, project.id as string);
    assert(gantt.tasks.length === 2, 'gantt tasks');
    assert(gantt.dependencies.length === 1, 'gantt FS dependency');
    assert(gantt.dependencies[0].dependency_type === 'FS', 'FS type');
    console.log('  ✓ milestones/tasks/FS deps + gantt payload');

    const boq = await upsertBoqItem(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      code: 'STL-001',
      description: 'TMT Steel 12mm',
      unitOfMeasure: 'MT',
      quantity: 50,
      unitRate: 62000,
      category: 'Steel',
    });
    assert(Number(boq.amount) === 3100000, 'BOQ amount calculated');
    console.log('  ✓ BOQ item');

    const d1 = await createDrawingVersion(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      drawingNo: 'AR-001',
      title: 'Floor Plan L1',
      discipline: 'Architecture',
      fileUrl: 'https://example.com/ar-001-v1.pdf',
    });
    const d2 = await createDrawingVersion(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      drawingNo: 'AR-001',
      title: 'Floor Plan L1 Rev A',
      discipline: 'Architecture',
      fileUrl: 'https://example.com/ar-001-v2.pdf',
    });
    assert(Number(d1.version) === 1 && Number(d2.version) === 2, 'drawing versions');
    assert(d2.is_current === true, 'latest drawing current');
    const [oldD] = await sql`SELECT is_current FROM drawings WHERE id = ${d1.id}`;
    assert(oldD.is_current === false, 'superseded drawing not current');
    console.log('  ✓ drawing versioning');

    const r1 = await createRfiVersion(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      rfiNo: 'RFI-01',
      subject: 'Beam size at grid B',
      question: 'Confirm beam depth at grid B-3?',
    });
    const r2 = await createRfiVersion(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      rfiNo: 'RFI-01',
      subject: 'Beam size at grid B (rev)',
      question: 'Confirm updated beam depth after MEP clash?',
    });
    assert(Number(r1.version) === 1 && Number(r2.version) === 2, 'RFI versions');
    console.log('  ✓ RFI versioning');

    await upsertBudgetLine(row.schemaName, {
      tenantId: row.id,
      projectId: project.id as string,
      category: 'Structure',
      plannedAmount: 15000000,
    });
    console.log('  ✓ project budget line');

    const foreignDeny = evaluateScope(
      {
        roles: ['project_manager'],
        permissions: ['projects.read'],
        projectIds: [project.id as string],
        locationIds: [],
      },
      { permission: 'projects.read', projectId: '00000000-0000-0000-0000-000000000099' }
    );
    assert(!foreignDeny.allowed && foreignDeny.axes.project === false, 'project scope deny');
    console.log('  ✓ project scope axis');

    const demo = await seedDemoProject(row.schemaName, row.id);
    assert(demo.projectId, 'demo seed');
    const demo2 = await seedDemoProject(row.schemaName, row.id);
    assert(demo2.created === false, 'demo seed idempotent');
    console.log('  ✓ demo project seed');

    console.log('\n✅ Phase 2 proofs passed\n');
  } finally {
    await cleanupTenant(slug);
    await getSql().end({ timeout: 2 }).catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
