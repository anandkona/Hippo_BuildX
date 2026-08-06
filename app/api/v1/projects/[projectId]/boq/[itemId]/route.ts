import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { withProjectAudit } from '@/lib/projects/access';

export const DELETE = withProjectAudit(
  { permission: 'projects.delete', resource: 'boq_item', action: 'Deleted BOQ Item' },
  async ({ context, projectId, routeCtx, audit }) => {
    const params = routeCtx?.params ? await routeCtx.params : {};
    const itemId = params.itemId;
    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }
    const sql = createTenantSql(context.schemaName!);
    await sql`
      UPDATE boq_items
      SET deleted_at = NOW(), updated_by = ${context.userId || null}, updated_at = NOW()
      WHERE id = ${itemId} AND project_id = ${projectId} AND deleted_at IS NULL
    `;
    audit({ resourceId: itemId });
    return NextResponse.json({ data: { message: 'BOQ item deleted', id: itemId } });
  }
);
