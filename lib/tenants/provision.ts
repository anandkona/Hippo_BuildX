import { getSql, getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/crypto';

export interface ProvisionTenantInput {
  tenantId: string;
  schemaName: string;
  name: string;
  adminName?: string | null;
  adminEmail?: string | null;
  adminPassword?: string | null;
}

const TENANT_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS %SCHEMA%.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  project_id UUID,
  location_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  role_id UUID NOT NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  project_id UUID,
  location_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.tenant_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  channel VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const ROLE_SEEDS = [
  {
    name: 'tenant_admin',
    description: 'Tenant Administrator',
    permissions: ['*'],
    permissionEntries: [{ module: '*', action: '*' }],
  },
  {
    name: 'project_manager',
    description: 'Project Manager',
    permissions: ['projects.*', 'inventory.read', 'procurement.read', 'construction.*'],
    permissionEntries: [
      { module: 'projects', action: 'create' },
      { module: 'projects', action: 'read' },
      { module: 'projects', action: 'update' },
      { module: 'projects', action: 'delete' },
      { module: 'inventory', action: 'read' },
      { module: 'procurement', action: 'read' },
      { module: 'construction', action: 'create' },
      { module: 'construction', action: 'read' },
      { module: 'construction', action: 'update' },
    ],
  },
  {
    name: 'sales_executive',
    description: 'Sales Executive',
    permissions: ['crm.*', 'customers.read'],
    permissionEntries: [
      { module: 'crm', action: 'create' },
      { module: 'crm', action: 'read' },
      { module: 'crm', action: 'update' },
      { module: 'customers', action: 'read' },
    ],
  },
  {
    name: 'site_engineer',
    description: 'Site Engineer',
    permissions: ['construction.*', 'inventory.read'],
    permissionEntries: [
      { module: 'construction', action: 'create' },
      { module: 'construction', action: 'read' },
      { module: 'construction', action: 'update' },
      { module: 'inventory', action: 'read' },
    ],
  },
  {
    name: 'finance_manager',
    description: 'Finance Manager',
    permissions: ['accounting.*', 'procurement.read', 'customers.read'],
    permissionEntries: [
      { module: 'accounting', action: 'create' },
      { module: 'accounting', action: 'read' },
      { module: 'accounting', action: 'update' },
      { module: 'procurement', action: 'read' },
      { module: 'customers', action: 'read' },
    ],
  },
];

export const DEFAULT_TENANT_ADMIN_PASSWORD = 'password123';

function escapeLiteral(value: string) {
  return value.replace(/'/g, "''");
}

export async function provisionTenant(input: ProvisionTenantInput) {
  const { tenantId, schemaName } = input;
  const sql = getSql();
  const db = getDb();

  try {
    console.log(`[Provisioning] Creating schema ${schemaName}...`);
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    console.log(`[Provisioning] Creating tables in ${schemaName}...`);
    const statements = TENANT_TABLES_SQL.split(';').filter((s) => s.trim());
    for (const stmt of statements) {
      await sql.unsafe(stmt.replace(/%SCHEMA%/g, schemaName));
    }

    const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    const adminEmail =
      (input.adminEmail || tenantRow?.adminEmail || `admin@${tenantRow?.slug || 'tenant'}.local`).toLowerCase();
    const adminName = input.adminName || tenantRow?.adminName || tenantRow?.contactName || 'Tenant Admin';
    const adminPassword = input.adminPassword || DEFAULT_TENANT_ADMIN_PASSWORD;

    // Seed roles (idempotent)
    const [existingAdminRole] = await sql.unsafe(
      `SELECT id FROM "${schemaName}".roles WHERE name = 'tenant_admin' LIMIT 1`
    );

    let tenantAdminRoleId: string | null = existingAdminRole?.id || null;

    if (!tenantAdminRoleId) {
      for (const roleDef of ROLE_SEEDS) {
        const perms = escapeLiteral(JSON.stringify(roleDef.permissions));
        const [role] = await sql.unsafe(
          `INSERT INTO "${schemaName}".roles (tenant_id, name, description, permissions, is_system)
           VALUES ('${tenantId}', '${escapeLiteral(roleDef.name)}', '${escapeLiteral(roleDef.description)}', '${perms}'::jsonb, true)
           RETURNING id`
        );
        if (roleDef.name === 'tenant_admin') tenantAdminRoleId = role.id;

        for (const entry of roleDef.permissionEntries) {
          await sql.unsafe(
            `INSERT INTO "${schemaName}".permissions (tenant_id, role_id, module, action)
             VALUES ('${tenantId}', '${role.id}', '${escapeLiteral(entry.module)}', '${escapeLiteral(entry.action)}')`
          );
        }
      }
    }

    // Seed / update admin user
    const [existingUser] = await sql.unsafe(
      `SELECT id FROM "${schemaName}".users WHERE lower(email) = lower('${escapeLiteral(adminEmail)}') LIMIT 1`
    );

    let userId: string;
    const passwordHash = await hashPassword(adminPassword);

    if (!existingUser) {
      const [created] = await sql.unsafe(
        `INSERT INTO "${schemaName}".users (tenant_id, email, name, password_hash, status)
         VALUES ('${tenantId}', '${escapeLiteral(adminEmail)}', '${escapeLiteral(adminName)}', '${passwordHash}', 'active')
         RETURNING id`
      );
      userId = created.id;
    } else {
      userId = existingUser.id;
      await sql.unsafe(
        `UPDATE "${schemaName}".users
         SET name = '${escapeLiteral(adminName)}', password_hash = '${passwordHash}', status = 'active', updated_at = NOW()
         WHERE id = '${userId}'`
      );
    }

    if (tenantAdminRoleId) {
      const [existingLink] = await sql.unsafe(
        `SELECT id FROM "${schemaName}".user_roles
         WHERE user_id = '${userId}' AND role_id = '${tenantAdminRoleId}' LIMIT 1`
      );
      if (!existingLink) {
        await sql.unsafe(
          `INSERT INTO "${schemaName}".user_roles (tenant_id, user_id, role_id)
           VALUES ('${tenantId}', '${userId}', '${tenantAdminRoleId}')`
        );
      }
    }

    await db
      .update(tenants)
      .set({
        status: 'active',
        adminEmail,
        adminName,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    console.log(`[Provisioning] Tenant ${tenantId} active. Admin ${adminEmail}`);

    return {
      adminEmail,
      adminName,
      adminPassword,
      schemaName,
    };
  } catch (error) {
    console.error(`[Provisioning] Failed for tenant ${tenantId}`, error);
    await db.update(tenants).set({ status: 'failed', updatedAt: new Date() }).where(eq(tenants.id, tenantId));
    throw error;
  }
}
