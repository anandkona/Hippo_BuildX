import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const tenantSql = createTenantSql(context.schemaName);
    
    const templates = await tenantSql`
      SELECT id, name, default_weight_percentage, status
      FROM activity_templates
      WHERE status = 'active'
      ORDER BY created_at ASC
    `;

    return NextResponse.json({ data: templates });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    if (!context.permissions.includes('progress.templates.manage')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const body = await req.json();
    const { name, defaultWeightPercentage } = body;

    if (!name || defaultWeightPercentage == null) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Name and weight are required' } }, { status: 400 });
    }

    const templateId = generateUuid();
    const tenantSql = createTenantSql(context.schemaName);

    await tenantSql`
      INSERT INTO activity_templates (id, tenant_id, name, default_weight_percentage)
      VALUES (${templateId}, ${context.tenantId}, ${name}, ${defaultWeightPercentage})
    `;

    await logAudit(context, 'CREATE', 'ActivityTemplate', templateId, body);

    return NextResponse.json({ data: { id: templateId } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
