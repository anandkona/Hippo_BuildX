import { getSql, getDb } from '@/lib/db/client';
import { tenantMigrations, tenants } from '@/lib/db/schema/control-plane';
import { and, eq } from 'drizzle-orm';

export interface TenantMigration {
  name: string;
  /** SQL with %SCHEMA% placeholder (replaced with "schema_name") */
  sql: string;
}

/** Versioned tenant DDL. Re-running is a no-op via tenant_migrations. */
export const TENANT_MIGRATIONS: TenantMigration[] = [
  {
    name: '001_identity_core',
    sql: `
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
`,
  },
];

/**
 * Apply all pending versioned migrations to a tenant schema and record them.
 */
export async function applyTenantMigrations(tenantId: string, schemaName: string) {
  const sql = getSql();
  const db = getDb();

  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

  const applied = await db
    .select({ name: tenantMigrations.migrationName })
    .from(tenantMigrations)
    .where(eq(tenantMigrations.tenantId, tenantId));

  const appliedSet = new Set(applied.map((r) => r.name));

  for (const migration of TENANT_MIGRATIONS) {
    if (appliedSet.has(migration.name)) continue;

    const statements = migration.sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await sql.unsafe(stmt.split('%SCHEMA%').join(`"${schemaName}"`));
    }

    await db.insert(tenantMigrations).values({
      tenantId,
      migrationName: migration.name,
    });
    appliedSet.add(migration.name);
    console.log(`[migrate] ${schemaName} ← ${migration.name}`);
  }
}

/** Apply pending migrations to every known tenant (idempotent). */
export async function migrateAllTenants() {
  const db = getDb();
  const rows = await db.select({ id: tenants.id, schemaName: tenants.schemaName }).from(tenants);
  for (const row of rows) {
    await applyTenantMigrations(row.id, row.schemaName);
  }
  return { count: rows.length };
}

export async function isMigrationApplied(tenantId: string, name: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(tenantMigrations)
    .where(and(eq(tenantMigrations.tenantId, tenantId), eq(tenantMigrations.migrationName, name)))
    .limit(1);
  return Boolean(row);
}
