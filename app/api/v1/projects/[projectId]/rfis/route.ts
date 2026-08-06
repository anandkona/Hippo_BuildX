import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';
import { createRfiVersion } from '@/lib/projects/planning';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const url = new URL(req.url);
    const currentOnly = url.searchParams.get('current') !== 'false';
    const sql = createTenantSql(auth.context.schemaName!);
    const data = currentOnly
      ? await sql`
          SELECT * FROM rfis
          WHERE project_id = ${projectId} AND deleted_at IS NULL AND is_current = true
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT * FROM rfis
          WHERE project_id = ${projectId} AND deleted_at IS NULL
          ORDER BY rfi_no, version DESC
        `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List RFIs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'rfi', action: 'Created RFI Version' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    if (!body.rfiNo || !body.subject || !body.question) {
      return NextResponse.json(
        { error: 'rfiNo, subject, and question are required' },
        { status: 400 }
      );
    }
    try {
      const row = await createRfiVersion(context.schemaName!, {
        tenantId: context.tenantId,
        userId: context.userId,
        projectId,
        rfiNo: body.rfiNo,
        subject: body.subject,
        question: body.question,
        assignedTo: body.assignedTo || null,
        dueDate: body.dueDate || null,
        supersedesId: body.supersedesId || null,
      });
      audit({
        resourceId: row.id as string,
        details: { rfiNo: body.rfiNo, version: row.version },
      });
      return NextResponse.json({ data: row }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create RFI';
      if (msg.includes('not found')) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      throw error;
    }
  }
);
