import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const tenantSql = createTenantSql(context.schemaName);

    const vendorsList = await tenantSql`
      SELECT id, name, contact_name, email, phone, tax_id, score, status
      FROM vendors
      ORDER BY name ASC
    `;

    return NextResponse.json({ data: vendorsList });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { name, contactName, email, phone, taxId } = body;

    if (!name) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Vendor name is required' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const id = generateUuid();

    await tenantSql`
      INSERT INTO vendors (id, tenant_id, name, contact_name, email, phone, tax_id)
      VALUES (${id}, ${context.tenantId}, ${name}, ${contactName || null}, ${email || null}, ${phone || null}, ${taxId || null})
    `;

    await logAudit(context, 'CREATE', 'Vendor', id, { name });

    return NextResponse.json({ data: { id, message: 'Vendor registered successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 500 });
  }
}
