import { createTenantSql } from '@/lib/db/client';

export interface AuditLogParams {
  schemaName: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Insert an audit-log row into the tenant's `audit_logs` table.
 * Call this after every state-changing operation.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  const {
    schemaName,
    tenantId,
    userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
  } = params;

  try {
    const sql = createTenantSql(schemaName);

    await sql.unsafe(
      `INSERT INTO audit_logs
         (tenant_id, user_id, action, resource, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tenantId,
        userId,
        action,
        resource,
        resourceId ?? null,
        details ? JSON.stringify(details) : null,
        ipAddress ?? null,
      ]
    );
  } catch (error) {
    // Audit-log failures must not break the calling operation.
    console.error('[audit] Failed to write audit log:', error);
  }
}
