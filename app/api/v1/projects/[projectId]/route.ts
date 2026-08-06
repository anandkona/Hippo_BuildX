import { NextResponse } from 'next/server';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';
import { softDeleteProject, updateProject } from '@/lib/projects/hierarchy';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    return NextResponse.json({ data: auth.project });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withProjectAudit(
  { permission: 'projects.update', resource: 'project', action: 'Updated Project' },
  async ({ req, context, projectId, audit }) => {
    const body = (await req.json()) as Record<string, unknown>;
    const updated = await updateProject(
      context.schemaName!,
      projectId,
      {
        name: body.name as string | undefined,
        description: body.description as string | undefined,
        status: body.status as string | undefined,
        locationName: body.locationName as string | undefined,
        address: body.address as string | undefined,
        city: body.city as string | undefined,
        state: body.state as string | undefined,
        pincode: body.pincode as string | undefined,
        startDate: body.startDate as string | undefined,
        endDate: body.endDate as string | undefined,
      },
      context.userId
    );
    if (!updated) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    audit({ resourceId: projectId, details: { fields: Object.keys(body) } });
    return NextResponse.json({ data: updated });
  }
);

export const DELETE = withProjectAudit(
  { permission: 'projects.delete', resource: 'project', action: 'Deleted Project' },
  async ({ context, projectId, audit }) => {
    await softDeleteProject(context.schemaName!, projectId, context.userId);
    audit({ resourceId: projectId });
    return NextResponse.json({ data: { message: 'Project deleted', id: projectId } });
  }
);
