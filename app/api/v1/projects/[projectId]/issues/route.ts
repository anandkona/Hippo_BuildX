import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';
import { createIssue } from '@/lib/projects/planning';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const sql = createTenantSql(auth.context.schemaName!);
    const data = await sql`
      SELECT * FROM issues
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List issues error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'issue', action: 'Created Issue' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const row = await createIssue(context.schemaName!, {
      tenantId: context.tenantId,
      userId: context.userId,
      projectId,
      title: body.title,
      description: body.description || null,
      severity: body.severity || 'medium',
      assigneeId: body.assigneeId || null,
      dueDate: body.dueDate || null,
    });
    audit({ resourceId: row.id as string, details: { title: body.title } });
    return NextResponse.json({ data: row }, { status: 201 });
  }
);
