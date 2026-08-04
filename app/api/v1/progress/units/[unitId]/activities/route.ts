import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function GET(req: NextRequest, { params }: { params: { unitId: string } }) {
  try {
    const context = getTenantContext(req);
    const tenantSql = createTenantSql(context.schemaName);
    
    const activities = await tenantSql`
      SELECT id, template_id, name, weight_percentage, completion_percentage, status
      FROM unit_activities
      WHERE unit_id = ${params.unitId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({ data: activities });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { unitId: string } }) {
  try {
    const context = getTenantContext(req);
    if (!context.permissions.includes('progress.activities.manage')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const { unitId } = params;
    const body = await req.json();
    const { templateId, name, weightPercentage } = body; // Optional: specify checklists

    if (!templateId || !name || weightPercentage == null) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing required fields' } }, { status: 400 });
    }

    const activityId = generateUuid();
    const tenantSql = createTenantSql(context.schemaName);

    await tenantSql`
      INSERT INTO unit_activities (id, tenant_id, unit_id, template_id, name, weight_percentage)
      VALUES (${activityId}, ${context.tenantId}, ${unitId}, ${templateId}, ${name}, ${weightPercentage})
    `;

    await logAudit(context, 'CREATE', 'UnitActivity', activityId, { unitId });

    return NextResponse.json({ data: { id: activityId } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
