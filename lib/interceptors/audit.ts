import { getDb, createTenantSql } from '../db/client';
import { auditLogs } from '../db/schema/tenant';
import { TokenPayload } from './jwt';
import { v4 as uuidv4 } from 'uuid';

export interface AuditRecord {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Centralized audit logger.
 * In a real application, this might push to BullMQ to avoid blocking the request,
 * but for Phase 1 we insert directly into the tenant's audit_logs table.
 */
export async function logAudit(
  payload: TokenPayload,
  record: AuditRecord
) {
  if (!payload.tenantId || !payload.schemaName) {
    console.warn('[Audit] Cannot log without tenant context');
    return;
  }

  try {
    const tenantSql = createTenantSql(payload.schemaName);
    
    // We use a raw SQL insert here using the tenant-scoped sql helper
    // to ensure it writes to the correct schema.
    await tenantSql`
      INSERT INTO ${tenantSql.unsafe(payload.schemaName)}.audit_logs 
      (id, tenant_id, user_id, action, resource, resource_id, details, ip_address, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ${payload.tenantId},
        ${payload.userId},
        ${record.action},
        ${record.resource},
        ${record.resourceId || null},
        ${record.details ? JSON.stringify(record.details) : null},
        ${record.ipAddress || null},
        NOW(),
        NOW()
      )
    `;
    
    console.log(`[Audit] Logged action ${record.action} on ${record.resource}`);
  } catch (err) {
    console.error(`[Audit] Failed to write audit log for tenant ${payload.tenantId}:`, err);
  }
}
