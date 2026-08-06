import { createTenantSql } from '@/lib/db/client';
import { ensureDefaultUnitCategories } from '@/lib/projects/defaults';
import { bulkGenerateHierarchy, createProject } from '@/lib/projects/hierarchy';
import {
  addTaskDependency,
  createMilestone,
  createTask,
  upsertBoqItem,
  upsertBudgetLine,
} from '@/lib/projects/planning';

/**
 * Seed one demo project tree + planning-lite sample (PRD §14.9 / Phase 2 DoD).
 * Idempotent by project code DEMO_PRJ.
 */
export async function seedDemoProject(
  schemaName: string,
  tenantId: string,
  userId?: string | null
) {
  await ensureDefaultUnitCategories(schemaName, tenantId, userId);

  const sql = createTenantSql(schemaName);
  const [existing] = await sql`
    SELECT id FROM projects WHERE code = 'DEMO_PRJ' AND deleted_at IS NULL LIMIT 1
  `;
  if (existing) {
    return { projectId: existing.id as string, created: false };
  }

  const [category] = await sql`
    SELECT id FROM unit_categories WHERE code = 'FLAT_2BHK' AND deleted_at IS NULL LIMIT 1
  `;

  const project = await createProject(schemaName, {
    tenantId,
    userId,
    code: 'DEMO_PRJ',
    name: 'Demo Residency',
    description: 'Seeded Phase 2 property + planning demo project',
    status: 'active',
    city: 'Hyderabad',
    state: 'Telangana',
  });

  const projectId = project.id as string;

  await bulkGenerateHierarchy(schemaName, {
    tenantId,
    userId,
    projectId,
    block: { code: 'BLK_A', name: 'Block A' },
    towers: [
      {
        code: 'T1',
        name: 'Tower 1',
        floorCount: 2,
        unitsPerFloor: 2,
        unitType: 'flat',
        categoryId: (category?.id as string) || null,
        unitPrefix: 'T1',
        carpetAreaSqft: 980,
        basePrice: 4500000,
      },
    ],
  });

  const m1 = await createMilestone(schemaName, {
    tenantId,
    userId,
    projectId,
    name: 'Foundation',
    plannedStart: '2026-01-01',
    plannedEnd: '2026-03-31',
    sortOrder: 1,
  });
  const m2 = await createMilestone(schemaName, {
    tenantId,
    userId,
    projectId,
    name: 'Structure',
    plannedStart: '2026-04-01',
    plannedEnd: '2026-09-30',
    sortOrder: 2,
  });

  const t1 = await createTask(schemaName, {
    tenantId,
    userId,
    projectId,
    milestoneId: m1.id as string,
    name: 'Excavation',
    plannedStart: '2026-01-01',
    plannedEnd: '2026-01-31',
    progressPct: 100,
  });
  const t2 = await createTask(schemaName, {
    tenantId,
    userId,
    projectId,
    milestoneId: m1.id as string,
    name: 'Footings',
    plannedStart: '2026-02-01',
    plannedEnd: '2026-03-15',
    progressPct: 40,
  });
  const t3 = await createTask(schemaName, {
    tenantId,
    userId,
    projectId,
    milestoneId: m2.id as string,
    name: 'Columns & Slabs',
    plannedStart: '2026-04-01',
    plannedEnd: '2026-08-31',
    progressPct: 0,
  });

  await addTaskDependency(schemaName, {
    tenantId,
    userId,
    projectId,
    predecessorTaskId: t1.id as string,
    successorTaskId: t2.id as string,
  });
  await addTaskDependency(schemaName, {
    tenantId,
    userId,
    projectId,
    predecessorTaskId: t2.id as string,
    successorTaskId: t3.id as string,
  });

  await upsertBoqItem(schemaName, {
    tenantId,
    userId,
    projectId,
    code: 'CIV-001',
    description: 'M25 Ready Mix Concrete',
    unitOfMeasure: 'cum',
    quantity: 1200,
    unitRate: 5500,
    category: 'Civil',
  });

  await upsertBudgetLine(schemaName, {
    tenantId,
    userId,
    projectId,
    category: 'Civil Works',
    plannedAmount: 25000000,
  });

  return { projectId, created: true };
}
