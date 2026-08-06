import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi, withProjectAudit } from '@/lib/projects/access';
import { upsertBudgetLine } from '@/lib/projects/planning';

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;
    const sql = createTenantSql(auth.context.schemaName!);
    const data = await sql`
      SELECT * FROM project_budgets
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY category
    `;
    const planned = data.reduce(
      (sum: number, row: { planned_amount?: string | number }) =>
        sum + Number(row.planned_amount || 0),
      0
    );
    return NextResponse.json({ data, meta: { plannedTotal: planned } });
  } catch (error) {
    console.error('List budget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withProjectAudit(
  { permission: 'projects.create', resource: 'project_budget', action: 'Upserted Project Budget' },
  async ({ req, context, projectId, audit }) => {
    const body = await req.json();
    if (!body.category || body.plannedAmount === undefined) {
      return NextResponse.json({ error: 'category and plannedAmount are required' }, { status: 400 });
    }
    const plannedAmount = Number(body.plannedAmount);
    if (Number.isNaN(plannedAmount)) {
      return NextResponse.json({ error: 'plannedAmount must be a number' }, { status: 400 });
    }
    const row = await upsertBudgetLine(context.schemaName!, {
      tenantId: context.tenantId,
      userId: context.userId,
      projectId,
      category: body.category,
      plannedAmount,
      revisedAmount:
        body.revisedAmount === undefined || body.revisedAmount === null
          ? null
          : Number(body.revisedAmount),
      notes: body.notes || null,
    });
    audit({ resourceId: row.id as string, details: { category: body.category, plannedAmount } });
    return NextResponse.json({ data: row }, { status: 201 });
  }
);
