import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';
import { upsertBoqItem } from '@/lib/projects/planning';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const sql = createTenantSql(auth.context.schemaName!);
    const data = await sql`
      SELECT * FROM boq_items
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY sort_order, code
    `;
    const total = data.reduce(
      (sum: number, row: { amount?: string | number }) => sum + Number(row.amount || 0),
      0
    );
    return NextResponse.json({ data, meta: { totalAmount: total } });
  } catch (error) {
    console.error('List BOQ error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'boq_item', action: 'Upserted BOQ Item' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    if (!body.code || !body.description) {
      return NextResponse.json({ error: 'code and description are required' }, { status: 400 });
    }
    const quantity = Number(body.quantity ?? 0);
    const unitRate = Number(body.unitRate ?? 0);
    if (Number.isNaN(quantity) || Number.isNaN(unitRate)) {
      return NextResponse.json({ error: 'quantity and unitRate must be numbers' }, { status: 400 });
    }
    const row = await upsertBoqItem(context.schemaName!, {
      tenantId: context.tenantId,
      userId: context.userId,
      projectId,
      code: body.code,
      description: body.description,
      unitOfMeasure: body.unitOfMeasure || 'nos',
      quantity,
      unitRate,
      category: body.category || null,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    });
    audit({ resourceId: row.id as string, details: { code: body.code, amount: row.amount } });
    return NextResponse.json({ data: row }, { status: 201 });
  }
);
