import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';
import { LeadStateMachine } from '@/lib/domain/crm/state-machine';

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    
    if (!context.permissions.includes('crm.bookings.create')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const body = await req.json();
    const { leadId, unitId, bookingAmount } = body;

    if (!leadId || !unitId || !bookingAmount) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing leadId, unitId, or bookingAmount' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const bookingId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      
      // 1. Check Lead Status
      const [lead] = await tx`SELECT id, status FROM leads WHERE id = ${leadId}`;
      if (!lead) throw new Error('Lead not found');
      
      // Transition lead to Booking (this enforces it was in Negotiation)
      const nextStatus = LeadStateMachine.transition(lead.status as any, 'Booking');
      await tx`UPDATE leads SET status = ${nextStatus}, updated_at = NOW() WHERE id = ${leadId}`;

      // 2. Check Unit Availability
      const [unit] = await tx`SELECT id, status FROM units WHERE id = ${unitId}`;
      if (!unit) throw new Error('Unit not found');
      if (unit.status !== 'available' && unit.status !== 'reserved') {
        throw new Error('Unit is not available for booking');
      }

      // Mark unit as booked
      await tx`UPDATE units SET status = 'booked', updated_at = NOW() WHERE id = ${unitId}`;
      
      // Record unit status history
      const historyId = generateUuid();
      await tx`
        INSERT INTO unit_status_history (id, tenant_id, unit_id, previous_status, new_status, changed_by)
        VALUES (${historyId}, ${context.tenantId}, ${unitId}, ${unit.status}, 'booked', ${context.userId})
      `;

      // 3. Create Booking
      await tx`
        INSERT INTO bookings (id, tenant_id, lead_id, unit_id, booking_amount, status)
        VALUES (${bookingId}, ${context.tenantId}, ${leadId}, ${unitId}, ${bookingAmount}, 'active')
      `;
      
      // Record activity on lead
      const activityId = generateUuid();
      await tx`
        INSERT INTO lead_activities (id, tenant_id, lead_id, type, notes, performed_by)
        VALUES (${activityId}, ${context.tenantId}, ${leadId}, 'transition', 'Converted to Booking for Unit ' || ${unitId}, ${context.userId})
      `;
    });

    await logAudit(context, 'CREATE', 'Booking', bookingId, { leadId, unitId });

    return NextResponse.json({ data: { id: bookingId, message: 'Booking created successfully' } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: error.message } },
      { status: error.message.includes('not available') || error.message.includes('transition') ? 400 : 500 }
    );
  }
}
