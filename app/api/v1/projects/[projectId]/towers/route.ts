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
    const blockId = url.searchParams.get('blockId');
    const sql = createTenantSql(auth.context.schemaName!);
    const data = blockId
      ? await sql`
          SELECT * FROM towers
          WHERE project_id = ${projectId} AND block_id = ${blockId} AND deleted_at IS NULL
          ORDER BY sort_order, name
        `
      : await sql`
          SELECT * FROM towers
          WHERE project_id = ${projectId} AND deleted_at IS NULL
          ORDER BY sort_order, name
        `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List towers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'tower', action: 'Created Tower' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    const { blockId, code, name, sortOrder } = body as {
      blockId?: string;
      code?: string;
      name?: string;
      sortOrder?: number;
    };
    if (!blockId || !code || !name) {
      return NextResponse.json({ error: 'blockId, code, and name are required' }, { status: 400 });
    }
    const sql = createTenantSql(context.schemaName!);
    const [block] = await sql`
      SELECT id FROM blocks
      WHERE id = ${blockId} AND project_id = ${projectId} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!block) {
      return NextResponse.json({ error: 'Block not found on this project' }, { status: 404 });
    }
    try {
      const [row] = await sql`
        INSERT INTO towers (tenant_id, project_id, block_id, code, name, sort_order, created_by)
        VALUES (
          ${context.tenantId}, ${projectId}, ${blockId}, ${code}, ${name},
          ${sortOrder ?? 0}, ${context.userId || null}
        )
        RETURNING *
      `;
      audit({ resourceId: row.id as string, details: { code, name, blockId } });
      return NextResponse.json({ data: row }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.toLowerCase().includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json({ error: 'Tower code already exists in this block' }, { status: 409 });
      }
      throw error;
    }
  }
);
