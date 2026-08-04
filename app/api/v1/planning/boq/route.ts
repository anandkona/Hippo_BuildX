import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const tenantSql = createTenantSql(context.schemaName);
    const projectId = req.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'projectId is required' } }, { status: 400 });
    }

    const items = await tenantSql`
      SELECT id, name, quantity, uom, rate, amount
      FROM boq_items
      WHERE project_id = ${projectId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({ data: items });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    
    // In a real app we'd check permissions: 'planning.boq.create'
    const body = await req.json();
    const { projectId, name, quantity, uom, rate } = body;

    if (!projectId || !name || quantity === undefined || rate === undefined || !uom) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing required fields' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const id = generateUuid();
    const amount = quantity * rate;

    await tenantSql`
      INSERT INTO boq_items (id, tenant_id, project_id, name, quantity, uom, rate, amount)
      VALUES (${id}, ${context.tenantId}, ${projectId}, ${name}, ${quantity}, ${uom}, ${rate}, ${amount})
    `;

    await logAudit(context, 'CREATE', 'BoqItem', id, { projectId, name });

    return NextResponse.json({ data: { id, amount } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 500 });
  }
}
