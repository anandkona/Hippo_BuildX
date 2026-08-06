import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';
import { createApproval, decideApproval } from '@/lib/projects/planning';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const sql = createTenantSql(auth.context.schemaName!);
    const data = await sql`
      SELECT * FROM approvals
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List approvals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'approval', action: 'Requested Approval' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    if (!body.entityType || !body.entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    // Decision shorthand: POST with decision + approvalId
    if (body.decision && body.approvalId) {
      if (body.decision !== 'approved' && body.decision !== 'rejected') {
        return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 });
      }
      const decided = await decideApproval(
        context.schemaName!,
        projectId,
        body.approvalId,
        body.decision,
        context.userId,
        body.comments || null
      );
      if (!decided) {
        return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
      }
      audit({
        action: body.decision === 'approved' ? 'Approved Request' : 'Rejected Request',
        resourceId: body.approvalId,
        details: { decision: body.decision },
      });
      return NextResponse.json({ data: decided });
    }

    const row = await createApproval(context.schemaName!, {
      tenantId: context.tenantId,
      userId: context.userId,
      projectId,
      entityType: body.entityType,
      entityId: body.entityId,
      comments: body.comments || null,
    });
    audit({ resourceId: row.id as string, details: { entityType: body.entityType } });
    return NextResponse.json({ data: row }, { status: 201 });
  }
);
