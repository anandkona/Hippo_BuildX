import { NextResponse } from 'next/server';
import { withProjectAudit } from '@/lib/projects/access';
import { updateMilestone } from '@/lib/projects/planning';
import { createTenantSql } from '@/lib/db/client';

export const PATCH = withProjectAudit(
  { permission: 'projects.update', resource: 'milestone', action: 'Updated Milestone' },
  async ({ req, context, projectId, routeCtx, audit }) => {
    const params = routeCtx?.params ? await routeCtx.params : {};
    const milestoneId = params.milestoneId;
    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId is required' }, { status: 400 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    const row = await updateMilestone(context.schemaName!, projectId, milestoneId, body, context.userId);
    if (!row) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    audit({ resourceId: milestoneId, details: { fields: Object.keys(body) } });
    return NextResponse.json({ data: row });
  }
);

export const DELETE = withProjectAudit(
  { permission: 'projects.delete', resource: 'milestone', action: 'Deleted Milestone' },
  async ({ context, projectId, routeCtx, audit }) => {
    const params = routeCtx?.params ? await routeCtx.params : {};
    const milestoneId = params.milestoneId;
    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId is required' }, { status: 400 });
    }
    const sql = createTenantSql(context.schemaName!);
    await sql`
      UPDATE milestones
      SET deleted_at = NOW(), updated_by = ${context.userId || null}, updated_at = NOW()
      WHERE id = ${milestoneId} AND project_id = ${projectId} AND deleted_at IS NULL
    `;
    audit({ resourceId: milestoneId });
    return NextResponse.json({ data: { message: 'Milestone deleted', id: milestoneId } });
  }
);
