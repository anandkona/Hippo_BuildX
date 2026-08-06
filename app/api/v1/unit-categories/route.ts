import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireTenantApi, withAudit } from '@/lib/api/tenant-admin';
import { ensureDefaultUnitCategories } from '@/lib/projects/defaults';
import { isUnitType } from '@/lib/projects/constants';

export async function GET(req: Request) {
  try {
    const auth = await requireTenantApi(req, { permission: 'projects.read', module: 'projects' });
    if (!auth.ok) return auth.response;

    await ensureDefaultUnitCategories(auth.context.schemaName!, auth.context.tenantId);
    const sql = createTenantSql(auth.context.schemaName!);
    const data = await sql`
      SELECT * FROM unit_categories
      WHERE deleted_at IS NULL
      ORDER BY name
    `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List unit categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAudit(
  { permission: 'projects.create', resource: 'unit_category', action: 'Created Unit Category', module: 'projects' },
  async ({ req, context, audit }) => {
    const body = await req.json();
    const { code, name, unitType, description } = body as {
      code?: string;
      name?: string;
      unitType?: string;
      description?: string;
    };
    if (!code || !name || !unitType) {
      return NextResponse.json({ error: 'code, name, and unitType are required' }, { status: 400 });
    }
    if (!isUnitType(unitType.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid unitType' }, { status: 400 });
    }

    const sql = createTenantSql(context.schemaName!);
    try {
      const [row] = await sql`
        INSERT INTO unit_categories (tenant_id, code, name, unit_type, description, created_by)
        VALUES (
          ${context.tenantId}, ${code}, ${name}, ${unitType.toLowerCase()},
          ${description || null}, ${context.userId || null}
        )
        RETURNING *
      `;
      audit({ resourceId: row.id as string, details: { code, unitType } });
      return NextResponse.json({ data: row }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.toLowerCase().includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json({ error: 'Category code already exists' }, { status: 409 });
      }
      throw error;
    }
  }
);
