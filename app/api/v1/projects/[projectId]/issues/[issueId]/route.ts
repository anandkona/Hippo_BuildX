import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { withProjectAudit } from '@/lib/projects/access';

export const PATCH = withProjectAudit(
  { permission: 'projects.update', resource: 'issue', action: 'Updated Issue' },
  async ({ req, context, projectId, routeCtx, audit }) => {
    const params = routeCtx?.params ? await routeCtx.params : {};
    const issueId = params.issueId;
    if (!issueId) {
      return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
    }
    const body = await req.json();
    const resolvedAt =
      body.status === 'resolved' || body.status === 'closed'
        ? new Date().toISOString()
        : null;
    const sql = createTenantSql(context.schemaName!);
    const [row] = await sql`
      UPDATE issues SET
        title = COALESCE(${body.title ?? null}, title),
        description = COALESCE(${body.description ?? null}, description),
        severity = COALESCE(${body.severity ?? null}, severity),
        status = COALESCE(${body.status ?? null}, status),
        assignee_id = COALESCE(${body.assigneeId ?? null}, assignee_id),
        due_date = COALESCE(${body.dueDate ?? null}, due_date),
        resolved_at = COALESCE(${resolvedAt}, resolved_at),
        updated_by = ${context.userId || null},
        updated_at = NOW()
      WHERE id = ${issueId} AND project_id = ${projectId} AND deleted_at IS NULL
      RETURNING *
    `;
    if (!row) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    audit({ resourceId: issueId, details: { fields: Object.keys(body) } });
    return NextResponse.json({ data: row });
  }
);
