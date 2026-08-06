import { NextResponse } from 'next/server';
import { withProjectAudit } from '@/lib/projects/access';
import { bulkGenerateHierarchy, type BulkTowerSpec } from '@/lib/projects/hierarchy';

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'project', action: 'Bulk Generated Units' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    const towers = body.towers as BulkTowerSpec[] | undefined;
    if (!Array.isArray(towers) || towers.length === 0) {
      return NextResponse.json(
        { error: 'towers array is required (floorCount, unitsPerFloor, name)' },
        { status: 400 }
      );
    }

    try {
      const summary = await bulkGenerateHierarchy(context.schemaName!, {
        tenantId: context.tenantId,
        userId: context.userId,
        projectId,
        block: body.block,
        towers,
      });
      audit({
        resourceId: projectId,
        details: summary,
      });
      return NextResponse.json({ data: summary }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Bulk generation failed';
      if (msg.includes('already exists') || msg.includes('Invalid')) {
        return NextResponse.json({ error: msg }, { status: 409 });
      }
      throw error;
    }
  }
);
