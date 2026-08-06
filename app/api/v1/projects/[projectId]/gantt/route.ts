import { NextResponse } from 'next/server';
import { requireProjectApi } from '@/lib/projects/access';
import { getGanttData } from '@/lib/projects/planning';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const data = await getGanttData(auth.context.schemaName!, projectId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Get gantt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
