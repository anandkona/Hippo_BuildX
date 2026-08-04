import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const tenantSql = createTenantSql(context.schemaName);
    
    // Optional: filter by unitId
    const unitId = req.nextUrl.searchParams.get('unitId');

    let query = tenantSql`
      SELECT d.id, d.unit_id, d.amount, d.due_date, d.status, d.pdf_url, d.demanded_at, m.name as milestone_name
      FROM demand_letters d
      JOIN payment_milestones m ON d.milestone_id = m.id
    `;

    if (unitId) {
      query = tenantSql`${query} WHERE d.unit_id = ${unitId}`;
    }

    const demands = await tenantSql`${query} ORDER BY d.created_at DESC`;

    return NextResponse.json({ data: demands });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
