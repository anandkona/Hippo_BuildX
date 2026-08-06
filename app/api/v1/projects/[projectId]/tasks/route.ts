import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';
import { createTask } from '@/lib/projects/planning';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const sql = createTenantSql(auth.context.schemaName!);
    const data = await sql`
      SELECT * FROM tasks
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY sort_order, planned_start NULLS LAST, name
    `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'task', action: 'Created Task' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const row = await createTask(context.schemaName!, {
      tenantId: context.tenantId,
      userId: context.userId,
      projectId,
      milestoneId: body.milestoneId || null,
      name: body.name,
      description: body.description || null,
      priority: body.priority || 'medium',
      assigneeId: body.assigneeId || null,
      plannedStart: body.plannedStart || null,
      plannedEnd: body.plannedEnd || null,
      progressPct: typeof body.progressPct === 'number' ? body.progressPct : 0,
    });
    audit({ resourceId: row.id as string, details: { name: body.name } });
    return NextResponse.json({ data: row }, { status: 201 });
  }
);
