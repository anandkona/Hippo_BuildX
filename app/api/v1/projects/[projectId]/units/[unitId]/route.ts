import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireProjectApi } from '@/lib/projects/access';

type Ctx = { params: Promise<{ projectId: string; unitId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { projectId, unitId } = await ctx.params;
    const auth = await requireProjectApi(req, projectId, { permission: 'projects.read' });
    if (!auth.ok) return auth.response;

    const sql = createTenantSql(auth.context.schemaName!);
    const [unit] = await sql`
      SELECT * FROM units
      WHERE id = ${unitId} AND project_id = ${projectId} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const history = await sql`
      SELECT * FROM unit_status_history
      WHERE unit_id = ${unitId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      data: {
        ...unit,
        statusHistory: history,
        links: {
          bookingId: unit.booking_id,
          customerId: unit.customer_id,
          paymentPlanId: unit.payment_plan_id,
        },
      },
    });
  } catch (error) {
    console.error('Get unit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
