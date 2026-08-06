import { NextResponse } from 'next/server';
import { requireProjectApi } from '@/lib/projects/access';
import { getProjectTree } from '@/lib/projects/hierarchy';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;

    const tree = await getProjectTree(auth.context.schemaName!, projectId);
    if (!tree) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ data: tree });
  } catch (error) {
    console.error('Get project tree error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
