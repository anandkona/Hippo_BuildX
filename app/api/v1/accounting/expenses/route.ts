import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { projectId, amount, category, description } = body;

    if (!projectId || amount === undefined || !category) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'projectId, amount, and category are required' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const id = generateUuid();

    await tenantSql`
      INSERT INTO expenses (id, tenant_id, project_id, amount, category, description, submitted_by)
      VALUES (${id}, ${context.tenantId}, ${projectId}, ${amount}, ${category}, ${description || null}, ${context.userId || null})
    `;

    await logAudit(context, 'CREATE', 'Expense', id, { projectId, amount, category });

    return NextResponse.json({ data: { id, message: 'Expense submitted successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 500 });
  }
}
