import { createTenantSql } from '@/lib/db/client';
import { DEFAULT_UNIT_CATEGORIES } from '@/lib/projects/constants';

/** Idempotent seed of PRD unit categories for a tenant schema. */
export async function ensureDefaultUnitCategories(
  schemaName: string,
  tenantId: string,
  userId?: string | null
) {
  const sql = createTenantSql(schemaName);
  for (const cat of DEFAULT_UNIT_CATEGORIES) {
    await sql`
      INSERT INTO unit_categories (tenant_id, code, name, unit_type, description, created_by)
      VALUES (
        ${tenantId},
        ${cat.code},
        ${cat.name},
        ${cat.unitType},
        ${cat.description},
        ${userId || null}
      )
      ON CONFLICT (code) DO NOTHING
    `;
  }
}
