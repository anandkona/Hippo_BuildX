import { createTenantSql } from '@/lib/db/client';

export interface TenantAuthClaims {
  roles: string[];
  permissions: string[];
  projectIds: string[];
  locationIds: string[];
}

/**
 * Load role names, flattened permissions, and scoped assignment IDs for a tenant user.
 */
export async function loadTenantAuthClaims(
  schemaName: string,
  userId: string
): Promise<TenantAuthClaims> {
  const tenantSql = createTenantSql(schemaName);

  const roleRows = await tenantSql`
    SELECT r.id, r.name, r.permissions
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ${userId}
      AND ur.deleted_at IS NULL
      AND r.deleted_at IS NULL
  `;

  const roles = roleRows.map((r: { name: string }) => r.name);
  const permissions = new Set<string>();

  for (const row of roleRows as Array<{ id: string; permissions: unknown }>) {
    const jsonPerms = Array.isArray(row.permissions) ? row.permissions : [];
    for (const p of jsonPerms) {
      if (typeof p === 'string') permissions.add(p);
    }

    const entries = await tenantSql`
      SELECT module, action FROM permissions WHERE role_id = ${row.id}
    `;
    for (const e of entries as Array<{ module: string; action: string }>) {
      if (e.module === '*' && e.action === '*') permissions.add('*');
      else if (e.action === '*') permissions.add(`${e.module}.*`);
      else permissions.add(`${e.module}.${e.action}`);
    }
  }

  const assignments = await tenantSql`
    SELECT project_id, location_id
    FROM user_roles
    WHERE user_id = ${userId} AND deleted_at IS NULL
  `;

  const projectIds = [
    ...new Set(
      (assignments as Array<{ project_id: string | null }>)
        .map((a) => a.project_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const locationIds = [
    ...new Set(
      (assignments as Array<{ location_id: string | null }>)
        .map((a) => a.location_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  return {
    roles,
    permissions: [...permissions],
    projectIds,
    locationIds,
  };
}
