import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const tenantSql = createTenantSql(context.schemaName);

    const pos = await tenantSql`
      SELECT po.id, po.po_number, po.total_amount, po.status, v.name as vendor_name, p.name as project_name
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN projects p ON po.project_id = p.id
      ORDER BY po.created_at DESC
    `;

    return NextResponse.json({ data: pos });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { vendorId, projectId, poNumber, lines } = body;
    // lines: Array<{ itemId: string, quantity: number, rate: number }>

    if (!vendorId || !projectId || !poNumber || !lines || !lines.length) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing required fields' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const poId = generateUuid();
    
    let totalAmount = 0;
    
    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);

      // We defer inserting the PO until we calculate the total amount
      const insertedLines = [];
      for (const line of lines) {
        const lineId = generateUuid();
        const amount = line.quantity * line.rate;
        totalAmount += amount;
        
        insertedLines.push({
          id: lineId,
          po_id: poId,
          item_id: line.itemId,
          quantity: line.quantity,
          rate: line.rate,
          amount: amount
        });
      }

      await tx`
        INSERT INTO purchase_orders (id, tenant_id, vendor_id, project_id, po_number, total_amount, status)
        VALUES (${poId}, ${context.tenantId}, ${vendorId}, ${projectId}, ${poNumber}, ${totalAmount}, 'draft')
      `;

      for (const line of insertedLines) {
        await tx`
          INSERT INTO po_lines (id, tenant_id, po_id, item_id, quantity, rate, amount)
          VALUES (${line.id}, ${context.tenantId}, ${line.po_id}, ${line.item_id}, ${line.quantity}, ${line.rate}, ${line.amount})
        `;
      }
    });

    await logAudit(context, 'CREATE', 'PurchaseOrder', poId, { poNumber, totalAmount });

    return NextResponse.json({ data: { id: poId, totalAmount, message: 'PO created successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 500 });
  }
}
