import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { withProjectAudit, requireProjectApi } from '@/lib/projects/access';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const sql = createTenantSql(auth.context.schemaName!);
    const data = await sql`
      SELECT * FROM blocks
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY sort_order, name
    `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List blocks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'block', action: 'Created Block' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    const { code, name, sortOrder } = body as { code?: string; name?: string; sortOrder?: number };
    if (!code || !name) {
      return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
    }
    const sql = createTenantSql(context.schemaName!);
    try {
      const [row] = await sql`
        INSERT INTO blocks (tenant_id, project_id, code, name, sort_order, created_by)
        VALUES (
          ${context.tenantId}, ${projectId}, ${code}, ${name},
          ${sortOrder ?? 0}, ${context.userId || null}
        )
        RETURNING *
      `;
      audit({ resourceId: row.id as string, details: { code, name } });
      return NextResponse.json({ data: row }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.toLowerCase().includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json({ error: 'Block code already exists on this project' }, { status: 409 });
      }
      throw error;
    }
  }
);
