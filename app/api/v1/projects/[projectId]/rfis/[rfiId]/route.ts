import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';

type Ctx = { params: Promise<{ projectId: string; rfiId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId, rfiId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const sql = createTenantSql(auth.context.schemaName!);
    const [rfi] = await sql`
      SELECT * FROM rfis
      WHERE id = ${rfiId} AND project_id = ${projectId} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 });
    }
    const versions = await sql`
      SELECT id, rfi_no, version, subject, status, is_current, created_at, supersedes_id
      FROM rfis
      WHERE project_id = ${projectId}
        AND deleted_at IS NULL
        AND (rfi_no = ${rfi.rfi_no} OR id = ${rfiId} OR supersedes_id = ${rfiId})
      ORDER BY version ASC
    `;
    return NextResponse.json({ data: { ...rfi, versions } });
  } catch (error) {
    console.error('Get RFI error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withProjectAudit(
  { permission: 'projects.update', resource: 'rfi', action: 'Updated RFI' },
  async ({ req, context, projectId, routeCtx, audit }) => {
    const params = routeCtx?.params ? await routeCtx.params : {};
    const rfiId = params.rfiId;
    if (!rfiId) {
      return NextResponse.json({ error: 'rfiId is required' }, { status: 400 });
    }
    const body = await req.json();
    const sql = createTenantSql(context.schemaName!);
    const answeredAt = body.status === 'answered' || body.answer ? new Date().toISOString() : null;
    const [row] = await sql`
      UPDATE rfis SET
        subject = COALESCE(${body.subject ?? null}, subject),
        question = COALESCE(${body.question ?? null}, question),
        answer = COALESCE(${body.answer ?? null}, answer),
        status = COALESCE(${body.status ?? null}, status),
        assigned_to = COALESCE(${body.assignedTo ?? null}, assigned_to),
        due_date = COALESCE(${body.dueDate ?? null}, due_date),
        answered_at = COALESCE(${answeredAt}, answered_at),
        updated_by = ${context.userId || null},
        updated_at = NOW()
      WHERE id = ${rfiId} AND project_id = ${projectId} AND deleted_at IS NULL
      RETURNING *
    `;
    if (!row) return NextResponse.json({ error: 'RFI not found' }, { status: 404 });
    audit({ resourceId: rfiId, details: { fields: Object.keys(body) } });
    return NextResponse.json({ data: row });
  }
);
