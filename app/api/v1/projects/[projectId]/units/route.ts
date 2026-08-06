import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { withProjectAudit, requireProjectApi } from '@/lib/projects/access';
import { listUnits } from '@/lib/projects/hierarchy';
import { isUnitType } from '@/lib/projects/constants';

type Ctx = { params: Promise<{ projectId: string }> };

function toInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 1 ? fallback : n;
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const url = new URL(req.url);
    const result = await listUnits(auth.context.schemaName!, projectId, {
      status: url.searchParams.get('status'),
      page: toInt(url.searchParams.get('page'), 1),
      pageSize: toInt(url.searchParams.get('pageSize'), 50),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('List units error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'unit', action: 'Created Unit' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    const {
      code,
      name,
      unitType,
      blockId,
      towerId,
      floorId,
      categoryId,
      carpetAreaSqft,
      builtUpAreaSqft,
      facing,
      bedrooms,
      bathrooms,
      basePrice,
    } = body as Record<string, unknown>;

    if (!code || !name || typeof code !== 'string' || typeof name !== 'string') {
      return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
    }
    const type = ((unitType as string) || 'flat').toLowerCase();
    if (!isUnitType(type)) {
      return NextResponse.json({ error: 'Invalid unitType' }, { status: 400 });
    }

    const sql = createTenantSql(context.schemaName!);
    try {
      const [row] = await sql`
        INSERT INTO units (
          tenant_id, project_id, block_id, tower_id, floor_id, category_id,
          code, name, unit_type, status, carpet_area_sqft, built_up_area_sqft,
          facing, bedrooms, bathrooms, base_price, created_by
        )
        VALUES (
          ${context.tenantId}, ${projectId},
          ${(blockId as string) || null}, ${(towerId as string) || null},
          ${(floorId as string) || null}, ${(categoryId as string) || null},
          ${code}, ${name}, ${type}, 'available',
          ${typeof carpetAreaSqft === 'number' ? carpetAreaSqft : null},
          ${typeof builtUpAreaSqft === 'number' ? builtUpAreaSqft : null},
          ${(facing as string) || null},
          ${typeof bedrooms === 'number' ? bedrooms : null},
          ${typeof bathrooms === 'number' ? bathrooms : null},
          ${typeof basePrice === 'number' ? basePrice : null},
          ${context.userId || null}
        )
        RETURNING *
      `;

      await sql`
        INSERT INTO unit_status_history (
          tenant_id, project_id, unit_id, from_status, to_status, reason, changed_by, created_by
        )
        VALUES (
          ${context.tenantId}, ${projectId}, ${row.id},
          NULL, 'available', 'Unit created', ${context.userId || null}, ${context.userId || null}
        )
      `;

      audit({ resourceId: row.id as string, details: { code, name } });
      return NextResponse.json({ data: row }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.toLowerCase().includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json({ error: 'Unit code already exists on this project' }, { status: 409 });
      }
      throw error;
    }
  }
);
