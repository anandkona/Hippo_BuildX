import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { name, uom, category, reorderLevel } = body;

    if (!name || !uom) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'name and uom are required' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const id = generateUuid();

    await tenantSql`
      INSERT INTO materials (id, tenant_id, name, uom, category, reorder_level)
      VALUES (${id}, ${context.tenantId}, ${name}, ${uom}, ${category || null}, ${reorderLevel || null})
    `;

    await logAudit(context, 'CREATE', 'Material', id, { name, uom });

    return NextResponse.json({ data: { id, message: 'Material created successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 400 });
  }
}
