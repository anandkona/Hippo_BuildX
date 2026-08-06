import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi } from '@/lib/projects/access';

type Ctx = { params: Promise<{ projectId: string; drawingId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId, drawingId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const sql = createTenantSql(auth.context.schemaName!);
    const [drawing] = await sql`
      SELECT * FROM drawings
      WHERE id = ${drawingId} AND project_id = ${projectId} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!drawing) {
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
    }
    const versions = await sql`
      SELECT id, drawing_no, version, title, status, is_current, file_url, created_at, supersedes_id
      FROM drawings
      WHERE project_id = ${projectId}
        AND deleted_at IS NULL
        AND (
          drawing_no = ${drawing.drawing_no}
          OR id = ${drawingId}
          OR supersedes_id = ${drawingId}
        )
      ORDER BY version ASC
    `;
    return NextResponse.json({ data: { ...drawing, versions } });
  } catch (error) {
    console.error('Get drawing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
