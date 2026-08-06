import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';
import { createDrawingVersion } from '@/lib/projects/planning';

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
          SELECT * FROM drawings
          WHERE project_id = ${projectId} AND deleted_at IS NULL AND is_current = true
          ORDER BY drawing_no
        `
      : await sql`
          SELECT * FROM drawings
          WHERE project_id = ${projectId} AND deleted_at IS NULL
          ORDER BY drawing_no, version DESC
        `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('List drawings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'drawing', action: 'Created Drawing Version' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    if (!body.drawingNo || !body.title) {
      return NextResponse.json({ error: 'drawingNo and title are required' }, { status: 400 });
    }
    try {
      const row = await createDrawingVersion(context.schemaName!, {
        tenantId: context.tenantId,
        userId: context.userId,
        projectId,
        drawingNo: body.drawingNo,
        title: body.title,
        discipline: body.discipline || null,
        fileUrl: body.fileUrl || null,
        fileName: body.fileName || null,
        notes: body.notes || null,
        supersedesId: body.supersedesId || null,
      });
      audit({
        resourceId: row.id as string,
        details: { drawingNo: body.drawingNo, version: row.version },
      });
      return NextResponse.json({ data: row }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create drawing';
      if (msg.includes('not found')) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      throw error;
    }
  }
);
