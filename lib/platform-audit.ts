import { getDb } from '@/lib/db/client';
import { platformAuditLogs } from '@/lib/db/schema/control-plane';

export interface PlatformAuditParams {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: string | Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Insert a row into platform_audit_logs. Never throws to the caller.
 */
export async function logPlatformAudit(params: PlatformAuditParams): Promise<void> {
  try {
    const db = getDb();
    const details =
      typeof params.details === 'string'
        ? params.details
        : params.details
          ? JSON.stringify(params.details)
          : null;

    await db.insert(platformAuditLogs).values({
      actorUserId: params.actorUserId || null,
      actorEmail: params.actorEmail || null,
      action: params.action,
      resource: params.resource || null,
      resourceId: params.resourceId || null,
      details,
      ipAddress: params.ipAddress || null,
    });
  } catch (error) {
    console.error('[platform-audit] Failed to write audit log:', error);
  }
}

export function getClientIp(req: Request): string | undefined {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined
  );
}
