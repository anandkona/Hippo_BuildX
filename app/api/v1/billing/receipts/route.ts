import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    
    if (!context.permissions.includes('billing.receipts.create')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const body = await req.json();
    const { demandLetterId, amountReceived, paymentMode, referenceNumber } = body;

    if (!demandLetterId || !amountReceived || !paymentMode) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing required fields' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const receiptId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      
      const [demand] = await tx`SELECT id, amount, status FROM demand_letters WHERE id = ${demandLetterId}`;
      if (!demand) throw new Error('Demand letter not found');
      
      // Allow partial payments? For MVP, we assume full payment or partial doesn't strictly close it.
      // We will mark demand as 'paid' if amount >= demand.amount
      
      await tx`
        INSERT INTO receipts (id, tenant_id, demand_letter_id, amount_received, payment_mode, reference_number)
        VALUES (${receiptId}, ${context.tenantId}, ${demandLetterId}, ${amountReceived}, ${paymentMode}, ${referenceNumber || null})
      `;
      
      // Calculate total received so far
      const receipts = await tx`SELECT SUM(amount_received) as total FROM receipts WHERE demand_letter_id = ${demandLetterId}`;
      const totalReceived = parseFloat(receipts[0].total) || 0;
      
      if (totalReceived >= parseFloat(demand.amount)) {
        await tx`UPDATE demand_letters SET status = 'paid', updated_at = NOW() WHERE id = ${demandLetterId}`;
      }
    });

    await logAudit(context, 'CREATE', 'Receipt', receiptId, { demandLetterId, amountReceived });

    return NextResponse.json({ data: { id: receiptId, message: 'Receipt recorded successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: error.message } },
      { status: 500 }
    );
  }
}
