import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const tenantSql = createTenantSql(context.schemaName);

    const records = await tenantSql`
      SELECT id, account_name, account_type, balance, status
      FROM accounts
      ORDER BY account_type ASC, account_name ASC
    `;

    return NextResponse.json({ data: records });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { accountName, accountType } = body;

    if (!accountName || !accountType) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'accountName and accountType are required' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const id = generateUuid();

    await tenantSql`
      INSERT INTO accounts (id, tenant_id, account_name, account_type)
      VALUES (${id}, ${context.tenantId}, ${accountName}, ${accountType})
    `;

    await logAudit(context, 'CREATE', 'Account', id, { accountName, accountType });

    return NextResponse.json({ data: { id, message: 'Account created successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 400 });
  }
}
