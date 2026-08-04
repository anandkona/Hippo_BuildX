import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';
import { emitDomainEvent } from '@/lib/events/emitter';

export async function POST(req: NextRequest, { params }: { params: { activityId: string } }) {
  try {
    const context = getTenantContext(req);
    const { activityId } = params;
    
    if (!context.permissions.includes('progress.activities.approve')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const body = await req.json();
    const { approvedPercentage, notes } = body;

    if (approvedPercentage == null) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Approved percentage is required' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const approvalId = generateUuid();
    
    let updatedUnitId: string;
    let newUnitProgress: number;

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      
      const [activity] = await tx`SELECT unit_id, status FROM unit_activities WHERE id = ${activityId}`;
      if (!activity) throw new Error('Activity not found');
      updatedUnitId = activity.unit_id;

      // 1. Record the engineer approval
      await tx`
        INSERT INTO engineer_approvals (id, tenant_id, activity_id, approved_percentage, notes, approved_by)
        VALUES (${approvalId}, ${context.tenantId}, ${activityId}, ${approvedPercentage}, ${notes || null}, ${context.userId})
      `;

      // 2. Update the activity's completion percentage and status
      const status = approvedPercentage >= 100 ? 'completed' : 'in_progress';
      await tx`
        UPDATE unit_activities 
        SET completion_percentage = ${approvedPercentage}, status = ${status}, updated_at = NOW() 
        WHERE id = ${activityId}
      `;

      // 3. Recalculate overall unit progress
      const activities = await tx`
        SELECT weight_percentage, completion_percentage 
        FROM unit_activities 
        WHERE unit_id = ${updatedUnitId}
      `;
      
      let totalWeightedProgress = 0;
      let totalWeights = 0;
      
      for (const act of activities) {
        const weight = parseFloat(act.weight_percentage);
        const comp = parseFloat(act.completion_percentage);
        totalWeights += weight;
        totalWeightedProgress += (weight * comp) / 100;
      }
      
      // If weights don't add to 100, normalize it based on total weights
      newUnitProgress = totalWeights > 0 ? (totalWeightedProgress / totalWeights) * 100 : 0;
      
      // Update unit
      await tx`UPDATE units SET progress = ${newUnitProgress}, updated_at = NOW() WHERE id = ${updatedUnitId}`;
    });

    await logAudit(context, 'UPDATE', 'Unit', updatedUnitId!, { action: 'progress_approved', newUnitProgress: newUnitProgress! });

    // Emit authoritative domain event
    emitDomainEvent('progress.updated', context.tenantId, {
      unitId: updatedUnitId!,
      activityId,
      newProgress: newUnitProgress!,
      approvedBy: context.userId,
    });

    return NextResponse.json({ 
      data: { 
        id: approvalId, 
        unitProgress: newUnitProgress! 
      } 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
