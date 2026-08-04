import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';
import { LeadStateMachine, LeadStatus } from '@/lib/domain/crm/state-machine';

export async function POST(req: NextRequest, { params }: { params: { leadId: string } }) {
  try {
    const context = getTenantContext(req);
    const { leadId } = params;
    
    if (!context.permissions.includes('crm.leads.update')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const body = await req.json();
    const { status, notes } = body;
    const nextStatus = status as LeadStatus;

    if (!nextStatus) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Target status is required' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);

    let finalStatus: LeadStatus = 'Lead';
    
    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      
      const [lead] = await tx`SELECT id, status FROM leads WHERE id = ${leadId}`;
      if (!lead) {
        throw new Error('Lead not found');
      }

      const currentStatus = lead.status as LeadStatus;
      
      // Enforce State Machine!
      if (!LeadStateMachine.isValidTransition(currentStatus, nextStatus)) {
        throw new Error(`Invalid state transition from ${currentStatus} to ${nextStatus}`);
      }
      
      finalStatus = LeadStateMachine.transition(currentStatus, nextStatus);

      if (currentStatus !== finalStatus) {
        await tx`UPDATE leads SET status = ${finalStatus}, updated_at = NOW() WHERE id = ${leadId}`;
        
        const activityId = generateUuid();
        await tx`
          INSERT INTO lead_activities (id, tenant_id, lead_id, type, notes, performed_by)
          VALUES (${activityId}, ${context.tenantId}, ${leadId}, 'transition', ${notes || `Transitioned to ${finalStatus}`}, ${context.userId})
        `;
      }
    });

    await logAudit(context, 'UPDATE', 'Lead', leadId, { transitionTo: finalStatus });

    return NextResponse.json({ data: { message: `Lead transitioned to ${finalStatus}` } });
  } catch (error: any) {
    console.error('Error transitioning lead:', error);
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: error.message } },
      { status: error.message.includes('Invalid state transition') ? 400 : 500 }
    );
  }
}
