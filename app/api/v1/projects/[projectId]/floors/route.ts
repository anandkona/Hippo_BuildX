import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { withProjectAudit, requireProjectApi } from '@/lib/projects/access';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const url = new URL(req.url);
    const towerId = url.searchParams.get('towerId');
    const sql = createTenantSql(auth.context.schemaName!);
    const data = towerId
      ? await sql`
          SELECT * FROM floors
          WHERE project_id = ${projectId} AND tower_id = ${towerId} AND deleted_at IS NULL
          ORDER BY level_number, sort_order
        `
      : await sql`
          SELECT * FROM floors
          WHERE project_id = ${projectId} AND deleted_at IS NULL
          ORDER BY level_number, sort_order
        `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List floors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'floor', action: 'Created Floor' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    const { towerId, code, name, levelNumber, sortOrder } = body as {
      towerId?: string;
      code?: string;
      name?: string;
      levelNumber?: number;
      sortOrder?: number;
    };
    if (!towerId || !code || !name) {
      return NextResponse.json({ error: 'towerId, code, and name are required' }, { status: 400 });
    }
    const sql = createTenantSql(context.schemaName!);
    const [tower] = await sql`
      SELECT id FROM towers
      WHERE id = ${towerId} AND project_id = ${projectId} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!tower) {
      return NextResponse.json({ error: 'Tower not found on this project' }, { status: 404 });
    }
    try {
      const [row] = await sql`
        INSERT INTO floors (
          tenant_id, project_id, tower_id, code, name, level_number, sort_order, created_by
        )
        VALUES (
          ${context.tenantId}, ${projectId}, ${towerId}, ${code}, ${name},
          ${levelNumber ?? 0}, ${sortOrder ?? 0}, ${context.userId || null}
        )
        RETURNING *
      `;
      audit({ resourceId: row.id as string, details: { code, name, towerId } });
      return NextResponse.json({ data: row }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.toLowerCase().includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json({ error: 'Floor code already exists in this tower' }, { status: 409 });
      }
      throw error;
    }
  }
);
