import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';
import { addTaskDependency } from '@/lib/projects/planning';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const sql = createTenantSql(auth.context.schemaName!);
    const data = await sql`
      SELECT * FROM task_dependencies
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY created_at
    `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List dependencies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'task_dependency', action: 'Added Task Dependency' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    const predecessorTaskId = body.predecessorTaskId || body.predecessorId;
    const successorTaskId = body.successorTaskId || body.successorId;
    if (!predecessorTaskId || !successorTaskId) {
      return NextResponse.json(
        { error: 'predecessorTaskId and successorTaskId are required' },
        { status: 400 }
      );
    }
    try {
      const row = await addTaskDependency(context.schemaName!, {
        tenantId: context.tenantId,
        userId: context.userId,
        projectId,
        predecessorTaskId,
        successorTaskId,
        lagDays: typeof body.lagDays === 'number' ? body.lagDays : 0,
      });
      audit({
        resourceId: row.id as string,
        details: { predecessorTaskId, successorTaskId, type: 'FS' },
      });
      return NextResponse.json({ data: row }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to add dependency';
      if (
        msg.includes('cycle') ||
        msg.includes('itself') ||
        msg.includes('must belong') ||
        msg.toLowerCase().includes('unique') ||
        msg.includes('duplicate')
      ) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      throw error;
    }
  }
);
