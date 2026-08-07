import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireTenantApi, withAudit } from '@/lib/api/tenant-admin';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireTenantApi(req, { permission: 'crm.leads.read', module: 'crm' });
    if (!auth.ok) return auth.response;

    const { id } = params;
    const sql = createTenantSql(auth.context.schemaName!);

    const activities = await sql.unsafe(`
      SELECT 
        a.id, a.activity_type, a.description, a.created_at,
        u.name as performed_by_name
      FROM lead_activities a
      LEFT JOIN "public".users u ON u.id = a.performed_by
      WHERE a.lead_id = $1
      ORDER BY a.created_at DESC
    `, [id]);
    
    // Fallback to fetch tenant users if public.users is not used
    // Assuming users are in the same schema
    const tenantActivities = await sql.unsafe(`
      SELECT 
        a.id, a.activity_type, a.description, a.created_at,
        u.name as performed_by_name
      FROM lead_activities a
      LEFT JOIN users u ON u.id = a.performed_by
      WHERE a.lead_id = $1
      ORDER BY a.created_at DESC
    `, [id]);

    return NextResponse.json({ data: tenantActivities });
  } catch (err: any) {
    console.error('CRM Activities GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireTenantApi(req, { permission: 'crm.leads.update', module: 'crm' });
    if (!auth.ok) return auth.response;

    const { id } = params;
    const { type, description } = await req.json();

    if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 });

    const sql = createTenantSql(auth.context.schemaName!);

    const [activity] = await sql.unsafe(`
      INSERT INTO lead_activities (tenant_id, lead_id, activity_type, description, performed_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [auth.context.tenantId, id, type || 'note', description, auth.context.userId]);

    await withAudit(auth.context, 'CREATE', 'LeadActivity', activity.id, { leadId: id });

    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (err: any) {
    console.error('CRM Activities POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
