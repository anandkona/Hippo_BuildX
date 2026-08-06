import { getSql } from '@/lib/db/client';
import { isUnitStatus, isUnitType, type UnitStatus, type UnitType } from '@/lib/projects/constants';

export type CreateProjectInput = {
  tenantId: string;
  userId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  status?: string;
  locationName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  metadata?: Record<string, unknown>;
};

export type BulkTowerSpec = {
  code?: string;
  name: string;
  floorCount: number;
  unitsPerFloor: number;
  unitType?: UnitType | string;
  categoryId?: string | null;
  unitPrefix?: string;
  startingFloor?: number;
  carpetAreaSqft?: number | null;
  basePrice?: number | null;
};

export type BulkGenerateInput = {
  tenantId: string;
  userId?: string | null;
  projectId: string;
  block?: { code?: string; name: string };
  towers: BulkTowerSpec[];
};

function slugCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export async function createProject(schemaName: string, input: CreateProjectInput) {
  const sql = getSql();
  let created: Record<string, unknown> | null = null;

  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const [row] = await tx`
      INSERT INTO projects (
        tenant_id, code, name, description, status,
        location_name, address, city, state, pincode,
        start_date, end_date, metadata, created_by
      )
      VALUES (
        ${input.tenantId},
        ${input.code.trim()},
        ${input.name.trim()},
        ${input.description || null},
        ${input.status || 'draft'},
        ${input.locationName || null},
        ${input.address || null},
        ${input.city || null},
        ${input.state || null},
        ${input.pincode || null},
        ${input.startDate || null},
        ${input.endDate || null},
        ${JSON.stringify(input.metadata || {})}::jsonb,
        ${input.userId || null}
      )
      RETURNING *
    `;
    created = row;
  });

  return created!;
}

export async function updateProject(
  schemaName: string,
  projectId: string,
  patch: Partial<CreateProjectInput> & { status?: string },
  userId?: string | null
) {
  const sql = getSql();
  let updated: Record<string, unknown> | null = null;

  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const [row] = await tx`
      UPDATE projects SET
        name = COALESCE(${patch.name ?? null}, name),
        description = COALESCE(${patch.description ?? null}, description),
        status = COALESCE(${patch.status ?? null}, status),
        location_name = COALESCE(${patch.locationName ?? null}, location_name),
        address = COALESCE(${patch.address ?? null}, address),
        city = COALESCE(${patch.city ?? null}, city),
        state = COALESCE(${patch.state ?? null}, state),
        pincode = COALESCE(${patch.pincode ?? null}, pincode),
        start_date = COALESCE(${patch.startDate ?? null}, start_date),
        end_date = COALESCE(${patch.endDate ?? null}, end_date),
        updated_by = ${userId || null},
        updated_at = NOW()
      WHERE id = ${projectId} AND deleted_at IS NULL
      RETURNING *
    `;
    updated = row || null;
  });

  return updated;
}

export async function softDeleteProject(
  schemaName: string,
  projectId: string,
  userId?: string | null
) {
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    await tx`
      UPDATE projects
      SET deleted_at = NOW(), updated_by = ${userId || null}, updated_at = NOW()
      WHERE id = ${projectId} AND deleted_at IS NULL
    `;
  });
}

export async function getProjectTree(schemaName: string, projectId: string) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);

    const [project] = await tx`
      SELECT * FROM projects WHERE id = ${projectId} AND deleted_at IS NULL LIMIT 1
    `;
    if (!project) return null;

    const blocks = await tx`
      SELECT * FROM blocks
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY sort_order, name
    `;
    const towers = await tx`
      SELECT * FROM towers
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY sort_order, name
    `;
    const floors = await tx`
      SELECT * FROM floors
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY level_number, sort_order
    `;
    const units = await tx`
      SELECT id, project_id, block_id, tower_id, floor_id, category_id,
             code, name, unit_type, status, carpet_area_sqft, built_up_area_sqft,
             facing, bedrooms, bathrooms, base_price,
             booking_id, customer_id, payment_plan_id, created_at
      FROM units
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY code
    `;

    const statusCounts: Record<string, number> = {};
    for (const u of units as Array<{ status: string }>) {
      statusCounts[u.status] = (statusCounts[u.status] || 0) + 1;
    }

    const floorsByTower = new Map<string, unknown[]>();
    for (const f of floors as Array<{ tower_id: string }>) {
      const list = floorsByTower.get(f.tower_id) || [];
      list.push(f);
      floorsByTower.set(f.tower_id, list);
    }

    const unitsByFloor = new Map<string, unknown[]>();
    for (const u of units as Array<{ floor_id: string | null }>) {
      if (!u.floor_id) continue;
      const list = unitsByFloor.get(u.floor_id) || [];
      list.push(u);
      unitsByFloor.set(u.floor_id, list);
    }

    const towersByBlock = new Map<string, unknown[]>();
    for (const t of towers as Array<{ id: string; block_id: string }>) {
      const towerFloors = (floorsByTower.get(t.id) || []).map((f) => {
        const floor = f as { id: string };
        return { ...floor, units: unitsByFloor.get(floor.id) || [] };
      });
      const list = towersByBlock.get(t.block_id) || [];
      list.push({ ...t, floors: towerFloors });
      towersByBlock.set(t.block_id, list);
    }

    return {
      ...project,
      availability: statusCounts,
      unitCount: units.length,
      blocks: (blocks as Array<{ id: string }>).map((b) => ({
        ...b,
        towers: towersByBlock.get(b.id) || [],
      })),
    };
  });
}

/**
 * Bulk-generate Block → Tower → Floor → Unit tree (PRD §8.3 P0).
 */
export async function bulkGenerateHierarchy(schemaName: string, input: BulkGenerateInput) {
  if (!input.towers?.length) {
    throw new Error('At least one tower spec is required');
  }

  const sql = getSql();
  const summary = {
    blockId: '',
    towers: 0,
    floors: 0,
    units: 0,
  };

  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);

    const [project] = await tx`
      SELECT id FROM projects WHERE id = ${input.projectId} AND deleted_at IS NULL LIMIT 1
    `;
    if (!project) throw new Error('Project not found');

    const blockName = input.block?.name || 'Block A';
    const blockCode = input.block?.code || slugCode(blockName) || 'BLK_A';

    let blockId: string;
    const [existingBlock] = await tx`
      SELECT id FROM blocks
      WHERE project_id = ${input.projectId} AND code = ${blockCode} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (existingBlock) {
      blockId = existingBlock.id;
    } else {
      const [block] = await tx`
        INSERT INTO blocks (tenant_id, project_id, code, name, created_by)
        VALUES (${input.tenantId}, ${input.projectId}, ${blockCode}, ${blockName}, ${input.userId || null})
        RETURNING id
      `;
      blockId = block.id;
    }
    summary.blockId = blockId;

    for (const [tIdx, towerSpec] of input.towers.entries()) {
      if (!towerSpec.name || towerSpec.floorCount < 1 || towerSpec.unitsPerFloor < 1) {
        throw new Error(`Invalid tower spec at index ${tIdx}`);
      }
      const unitType = (towerSpec.unitType || 'flat').toString().toLowerCase();
      if (!isUnitType(unitType)) {
        throw new Error(`Invalid unitType for tower ${towerSpec.name}`);
      }

      const towerCode = towerSpec.code || slugCode(towerSpec.name) || `T${tIdx + 1}`;
      const [existingTower] = await tx`
        SELECT id FROM towers
        WHERE block_id = ${blockId} AND code = ${towerCode} AND deleted_at IS NULL
        LIMIT 1
      `;
      if (existingTower) {
        throw new Error(`Tower code ${towerCode} already exists in this block`);
      }

      const [tower] = await tx`
        INSERT INTO towers (tenant_id, project_id, block_id, code, name, sort_order, created_by)
        VALUES (
          ${input.tenantId}, ${input.projectId}, ${blockId},
          ${towerCode}, ${towerSpec.name}, ${tIdx}, ${input.userId || null}
        )
        RETURNING id
      `;
      summary.towers += 1;

      const startFloor = towerSpec.startingFloor ?? 1;
      const prefix = towerSpec.unitPrefix || towerCode;

      for (let f = 0; f < towerSpec.floorCount; f++) {
        const level = startFloor + f;
        const floorCode = `L${level}`;
        const floorName = `Level ${level}`;
        const [floor] = await tx`
          INSERT INTO floors (
            tenant_id, project_id, tower_id, code, name, level_number, sort_order, created_by
          )
          VALUES (
            ${input.tenantId}, ${input.projectId}, ${tower.id},
            ${floorCode}, ${floorName}, ${level}, ${f}, ${input.userId || null}
          )
          RETURNING id
        `;
        summary.floors += 1;

        for (let u = 1; u <= towerSpec.unitsPerFloor; u++) {
          const unitCode = `${prefix}-${level}${String(u).padStart(2, '0')}`;
          const unitName = `Unit ${unitCode}`;
          const [unit] = await tx`
            INSERT INTO units (
              tenant_id, project_id, block_id, tower_id, floor_id, category_id,
              code, name, unit_type, status, carpet_area_sqft, base_price, created_by
            )
            VALUES (
              ${input.tenantId}, ${input.projectId}, ${blockId}, ${tower.id}, ${floor.id},
              ${towerSpec.categoryId || null},
              ${unitCode}, ${unitName}, ${unitType}, 'available',
              ${towerSpec.carpetAreaSqft ?? null},
              ${towerSpec.basePrice ?? null},
              ${input.userId || null}
            )
            RETURNING id
          `;

          await tx`
            INSERT INTO unit_status_history (
              tenant_id, project_id, unit_id, from_status, to_status, reason, changed_by, created_by
            )
            VALUES (
              ${input.tenantId}, ${input.projectId}, ${unit.id},
              NULL, 'available', 'Bulk generation', ${input.userId || null}, ${input.userId || null}
            )
          `;
          summary.units += 1;
        }
      }
    }
  });

  return summary;
}

export async function changeUnitStatus(
  schemaName: string,
  opts: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    unitId: string;
    toStatus: string;
    reason?: string | null;
  }
) {
  if (!isUnitStatus(opts.toStatus)) {
    throw new Error(`Invalid status. Allowed: available, reserved, booked, cancelled, completed, delivered`);
  }

  const sql = getSql();
  let result: { unit: Record<string, unknown>; historyId: string } | null = null;

  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);

    const [unit] = await tx`
      SELECT * FROM units
      WHERE id = ${opts.unitId} AND project_id = ${opts.projectId} AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `;
    if (!unit) throw new Error('Unit not found');

    const fromStatus = unit.status as string;
    if (fromStatus === opts.toStatus) {
      result = { unit, historyId: '' };
      return;
    }

    const [updated] = await tx`
      UPDATE units
      SET status = ${opts.toStatus as UnitStatus},
          updated_by = ${opts.userId || null},
          updated_at = NOW()
      WHERE id = ${opts.unitId}
      RETURNING *
    `;

    const [hist] = await tx`
      INSERT INTO unit_status_history (
        tenant_id, project_id, unit_id, from_status, to_status, reason, changed_by, created_by
      )
      VALUES (
        ${opts.tenantId}, ${opts.projectId}, ${opts.unitId},
        ${fromStatus}, ${opts.toStatus}, ${opts.reason || null},
        ${opts.userId || null}, ${opts.userId || null}
      )
      RETURNING id
    `;

    result = { unit: updated, historyId: hist.id };
  });

  return result!;
}

export async function listUnits(
  schemaName: string,
  projectId: string,
  filters: { status?: string | null; page?: number; pageSize?: number }
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = Math.min(filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 50, 200);
  const offset = (page - 1) * pageSize;
  const sql = getSql();

  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);

    const status = filters.status || null;
    const countRows = status
      ? await tx`
          SELECT COUNT(*)::text AS count FROM units
          WHERE project_id = ${projectId} AND deleted_at IS NULL AND status = ${status}
        `
      : await tx`
          SELECT COUNT(*)::text AS count FROM units
          WHERE project_id = ${projectId} AND deleted_at IS NULL
        `;
    const total = parseInt(countRows[0]?.count ?? '0', 10);

    const data = status
      ? await tx`
          SELECT * FROM units
          WHERE project_id = ${projectId} AND deleted_at IS NULL AND status = ${status}
          ORDER BY code
          LIMIT ${pageSize} OFFSET ${offset}
        `
      : await tx`
          SELECT * FROM units
          WHERE project_id = ${projectId} AND deleted_at IS NULL
          ORDER BY code
          LIMIT ${pageSize} OFFSET ${offset}
        `;

    return { data, meta: { total, page, pageSize } };
  });
}
