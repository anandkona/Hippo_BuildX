import { NextResponse } from 'next/server';
import { withProjectAudit } from '@/lib/projects/access';
import { changeUnitStatus } from '@/lib/projects/hierarchy';

type Ctx = { params: Promise<{ projectId: string; unitId: string }> };

export const POST = withProjectAudit(
  { permission: 'projects.update', resource: 'unit', action: 'Changed Unit Status' },
  async ({ req, context, projectId, routeCtx, audit }) => {
    const params = routeCtx?.params ? await routeCtx.params : {};
    const unitId = params.unitId;
    if (!unitId) {
      return NextResponse.json({ error: 'unitId is required' }, { status: 400 });
    }

    const body = await req.json();
    const toStatus = body.toStatus || body.status;
    if (!toStatus || typeof toStatus !== 'string') {
      return NextResponse.json({ error: 'toStatus is required' }, { status: 400 });
    }

    try {
      const result = await changeUnitStatus(context.schemaName!, {
        tenantId: context.tenantId,
        userId: context.userId,
        projectId,
        unitId,
        toStatus: toStatus.toLowerCase(),
        reason: body.reason || null,
      });

      audit({
        resourceId: unitId,
        details: {
          toStatus: toStatus.toLowerCase(),
          historyId: result.historyId || null,
        },
      });
      return NextResponse.json({ data: result.unit });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Status change failed';
      if (msg.includes('Invalid') || msg.includes('not found')) {
        return NextResponse.json({ error: msg }, { status: msg.includes('not found') ? 404 : 400 });
      }
      throw error;
    }
  }
);

// Ensure dynamic route typing remains compatible
export type { Ctx };
