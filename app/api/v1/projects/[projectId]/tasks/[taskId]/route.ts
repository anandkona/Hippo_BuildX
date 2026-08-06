import { NextResponse } from 'next/server';
import { withProjectAudit } from '@/lib/projects/access';
import { updateTask } from '@/lib/projects/planning';
import { createTenantSql } from '@/lib/db/client';

export const PATCH = withProjectAudit(
  { permission: 'projects.update', resource: 'task', action: 'Updated Task' },
  async ({ req, context, projectId, routeCtx, audit }) => {
    const params = routeCtx?.params ? await routeCtx.params : {};
    const taskId = params.taskId;
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    const row = await updateTask(context.schemaName!, projectId, taskId, body, context.userId);
    if (!row) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    audit({ resourceId: taskId, details: { fields: Object.keys(body) } });
    return NextResponse.json({ data: row });
  }
);

export const DELETE = withProjectAudit(
  { permission: 'projects.delete', resource: 'task', action: 'Deleted Task' },
  async ({ context, projectId, routeCtx, audit }) => {
    const params = routeCtx?.params ? await routeCtx.params : {};
    const taskId = params.taskId;
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }
    const sql = createTenantSql(context.schemaName!);
    await sql`
      UPDATE tasks
      SET deleted_at = NOW(), updated_by = ${context.userId || null}, updated_at = NOW()
      WHERE id = ${taskId} AND project_id = ${projectId} AND deleted_at IS NULL
    `;
    audit({ resourceId: taskId });
    return NextResponse.json({ data: { message: 'Task deleted', id: taskId } });
  }
);
