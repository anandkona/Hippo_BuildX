import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireTenantApi, withAudit } from '@/lib/api/tenant-admin';

export async function GET(req: Request) {
  try {
    const auth = await requireTenantApi(req, { permission: 'crm.leads.read', module: 'crm' });
    if (!auth.ok) return auth.response;

    const sql = createTenantSql(auth.context.schemaName!);
    
    // Fetch leads
    const leads = await sql.unsafe(`
      SELECT 
        id, name, email, phone, status, source, expected_revenue, created_at, updated_at
      FROM leads
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ data: leads });
  } catch (err: any) {
    console.error('CRM GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireTenantApi(req, { permission: 'crm.leads.create', module: 'crm' });
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { name, email, phone, source, expectedRevenue, notes } = body;
    
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const sql = createTenantSql(auth.context.schemaName!);
    
    const [lead] = await sql.unsafe(`
      INSERT INTO leads (tenant_id, name, email, phone, source, expected_revenue, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      auth.context.tenantId, name, email, phone, source, expectedRevenue || 0, notes, auth.context.userId
    ]);

    // Initial activity
    await sql.unsafe(`
      INSERT INTO lead_activities (tenant_id, lead_id, activity_type, description, performed_by)
      VALUES ($1, $2, 'created', 'Lead ingested into system', $3)
    `, [auth.context.tenantId, lead.id, auth.context.userId]);

    await withAudit(auth.context, 'CREATE', 'Lead', lead.id, { source });

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (err: any) {
    console.error('CRM POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
