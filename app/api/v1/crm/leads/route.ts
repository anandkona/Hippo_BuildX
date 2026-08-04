import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    
    // Check permissions
    if (!context.permissions.includes('crm.leads.view')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    
    const leadsList = await tenantSql`
      SELECT id, first_name, last_name, phone, email, status, probability, expected_revenue, created_at
      FROM leads
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ data: leadsList });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    
    if (!context.permissions.includes('crm.leads.create')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, phone, email, sourceId, expectedRevenue } = body;

    if (!firstName || (!phone && !email)) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'First name and either phone or email are required' } }, { status: 400 });
    }

    const leadId = generateUuid();
    const tenantSql = createTenantSql(context.schemaName);

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      await tx`
        INSERT INTO leads (id, tenant_id, first_name, last_name, phone, email, source_id, expected_revenue)
        VALUES (${leadId}, ${context.tenantId}, ${firstName}, ${lastName || null}, ${phone || null}, ${email || null}, ${sourceId || null}, ${expectedRevenue || null})
      `;
      
      const activityId = generateUuid();
      await tx`
        INSERT INTO lead_activities (id, tenant_id, lead_id, type, notes, performed_by)
        VALUES (${activityId}, ${context.tenantId}, ${leadId}, 'note', 'Lead created manually', ${context.userId})
      `;
    });

    await logAudit(context, 'CREATE', 'Lead', leadId, { source: 'manual' });

    return NextResponse.json({ data: { id: leadId } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: error.status || 500 }
    );
  }
}
