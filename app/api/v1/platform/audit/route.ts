import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { platformAuditLogs, platformUsers } from '@/lib/db/schema/control-plane';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    const db = getDb();
    let rows = await db
      .select({
        id: platformAuditLogs.id,
        actorUserId: platformAuditLogs.actorUserId,
        actorEmail: platformAuditLogs.actorEmail,
        actorName: platformUsers.name,
        action: platformAuditLogs.action,
        resource: platformAuditLogs.resource,
        resourceId: platformAuditLogs.resourceId,
        details: platformAuditLogs.details,
        ipAddress: platformAuditLogs.ipAddress,
        createdAt: platformAuditLogs.createdAt,
      })
      .from(platformAuditLogs)
      .leftJoin(platformUsers, eq(platformAuditLogs.actorUserId, platformUsers.id))
      .orderBy(desc(platformAuditLogs.createdAt))
      .limit(limit);

    if (q) {
      const lower = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.action?.toLowerCase().includes(lower) ||
          r.details?.toLowerCase().includes(lower) ||
          r.actorEmail?.toLowerCase().includes(lower) ||
          r.actorName?.toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({ auditLogs: rows });
  } catch (error: any) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
