import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function POST(req: NextRequest, { params }: { params: { activityId: string } }) {
  try {
    const context = getTenantContext(req);
    const { activityId } = params;
    
    if (!context.permissions.includes('progress.activities.update')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const body = await req.json();
    const { reportedPercentage, notes, photos } = body;

    if (reportedPercentage == null) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Reported percentage is required' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const updateId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      
      // Insert update
      await tx`
        INSERT INTO progress_updates (id, tenant_id, activity_id, reported_percentage, notes, reported_by)
        VALUES (${updateId}, ${context.tenantId}, ${activityId}, ${reportedPercentage}, ${notes || null}, ${context.userId})
      `;

      // Update activity status to in_progress
      await tx`UPDATE unit_activities SET status = 'in_progress', updated_at = NOW() WHERE id = ${activityId}`;

      // Insert photos if any
      if (photos && Array.isArray(photos)) {
        for (const url of photos) {
          const photoId = generateUuid();
          await tx`
            INSERT INTO progress_photos (id, tenant_id, update_id, photo_url)
            VALUES (${photoId}, ${context.tenantId}, ${updateId}, ${url})
          `;
        }
      }
    });

    await logAudit(context, 'UPDATE', 'UnitActivity', activityId, { action: 'progress_reported', reportedPercentage });

    return NextResponse.json({ data: { id: updateId } });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
