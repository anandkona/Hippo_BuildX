import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { warehouseId, materialId, type, quantity, referenceId } = body;

    if (!warehouseId || !materialId || !type || quantity === undefined) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'warehouseId, materialId, type, and quantity are required' } }, { status: 400 });
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty)) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'quantity must be a number' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const movementId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);

      // Calculate stock delta
      // Types: GRN (+), RETURN (+), ISSUE (-), TRANSFER_OUT (-), TRANSFER_IN (+)
      let delta = 0;
      if (['GRN', 'RETURN', 'TRANSFER_IN'].includes(type.toUpperCase())) {
        delta = Math.abs(qty);
      } else if (['ISSUE', 'TRANSFER_OUT'].includes(type.toUpperCase())) {
        delta = -Math.abs(qty);
      } else {
        throw new Error('Invalid movement type');
      }

      // Upsert stock level
      const [existingStock] = await tx`
        SELECT id, quantity FROM stock_levels 
        WHERE warehouse_id = ${warehouseId} AND material_id = ${materialId}
        FOR UPDATE
      `;

      if (existingStock) {
        const newQty = parseFloat(existingStock.quantity) + delta;
        if (newQty < 0) {
          throw new Error('Insufficient stock for this movement');
        }
        await tx`
          UPDATE stock_levels 
          SET quantity = ${newQty}, last_updated = NOW() 
          WHERE id = ${existingStock.id}
        `;
      } else {
        if (delta < 0) {
          throw new Error('Insufficient stock for this movement (No stock found)');
        }
        await tx`
          INSERT INTO stock_levels (id, tenant_id, warehouse_id, material_id, quantity)
          VALUES (${generateUuid()}, ${context.tenantId}, ${warehouseId}, ${materialId}, ${delta})
        `;
      }

      // Record movement
      await tx`
        INSERT INTO stock_movements (id, tenant_id, warehouse_id, material_id, type, quantity, reference_id, recorded_by)
        VALUES (${movementId}, ${context.tenantId}, ${warehouseId}, ${materialId}, ${type.toUpperCase()}, ${delta}, ${referenceId || null}, ${context.userId || null})
      `;
    });

    await logAudit(context, 'CREATE', 'StockMovement', movementId, { type, quantity });

    return NextResponse.json({ data: { id: movementId, message: 'Stock movement recorded successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 400 });
  }
}
