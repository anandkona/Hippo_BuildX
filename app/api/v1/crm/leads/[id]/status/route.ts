import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireTenantApi, withAudit } from '@/lib/api/tenant-admin';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'new': ['qualified', 'lost'],
  'qualified': ['site_visit', 'lost'],
  'site_visit': ['negotiation', 'lost'],
  'negotiation': ['won', 'lost'],
  'won': [],
  'lost': ['new'], // allow reopening
};

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireTenantApi(req, { permission: 'crm.leads.update', module: 'crm' });
    if (!auth.ok) return auth.response;

    const { id } = params;
    const { status, notes } = await req.json();

    if (!status) return NextResponse.json({ error: 'Status is required' }, { status: 400 });

    const sql = createTenantSql(auth.context.schemaName!);

    const [lead] = await sql.unsafe(`SELECT status FROM leads WHERE id = $1 AND deleted_at IS NULL`, [id]);
    
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const currentStatus = lead.status;
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    
    if (!allowedNext.includes(status) && currentStatus !== status) {
      return NextResponse.json({ 
        error: \`Invalid transition from \${currentStatus} to \${status}\` 
      }, { status: 400 });
    }

    const [updated] = await sql.unsafe(`
      UPDATE leads 
      SET status = $1, updated_at = NOW(), updated_by = $2
      WHERE id = $3
      RETURNING *
    `, [status, auth.context.userId, id]);

    // Record activity
    await sql.unsafe(`
      INSERT INTO lead_activities (tenant_id, lead_id, activity_type, description, performed_by)
      VALUES ($1, $2, 'status_change', $3, $4)
    `, [
      auth.context.tenantId, 
      id, 
      \`Status changed from \${currentStatus} to \${status}\${notes ? ': ' + notes : ''}\`,
      auth.context.userId
    ]);

    await withAudit(auth.context, 'UPDATE_STATUS', 'Lead', id, { from: currentStatus, to: status, notes });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error('CRM Status Update Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
