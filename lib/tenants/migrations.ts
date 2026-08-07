import { getSql, getDb } from '@/lib/db/client';
import { tenantMigrations, tenants } from '@/lib/db/schema/control-plane';
import { and, eq } from 'drizzle-orm';
import { ensureDefaultUnitCategories } from '@/lib/projects/defaults';

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
  {
    name: '002_property_planning',
    sql: `
CREATE TABLE IF NOT EXISTS %SCHEMA%.unit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  unit_type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  location_name VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  start_date DATE,
  end_date DATE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.towers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  block_id UUID NOT NULL REFERENCES %SCHEMA%.blocks(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (block_id, code)
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  tower_id UUID NOT NULL REFERENCES %SCHEMA%.towers(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  level_number INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (tower_id, code)
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  block_id UUID REFERENCES %SCHEMA%.blocks(id),
  tower_id UUID REFERENCES %SCHEMA%.towers(id),
  floor_id UUID REFERENCES %SCHEMA%.floors(id),
  category_id UUID REFERENCES %SCHEMA%.unit_categories(id),
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit_type VARCHAR(50) NOT NULL DEFAULT 'flat',
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  carpet_area_sqft NUMERIC(12, 2),
  built_up_area_sqft NUMERIC(12, 2),
  facing VARCHAR(50),
  bedrooms INTEGER,
  bathrooms INTEGER,
  base_price NUMERIC(14, 2),
  metadata JSONB NOT NULL DEFAULT '{}',
  booking_id UUID,
  customer_id UUID,
  payment_plan_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.unit_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  unit_id UUID NOT NULL REFERENCES %SCHEMA%.units(id),
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  reason TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'planned',
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  milestone_id UUID REFERENCES %SCHEMA%.milestones(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  priority VARCHAR(30) NOT NULL DEFAULT 'medium',
  assignee_id UUID,
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  predecessor_task_id UUID NOT NULL REFERENCES %SCHEMA%.tasks(id),
  successor_task_id UUID NOT NULL REFERENCES %SCHEMA%.tasks(id),
  dependency_type VARCHAR(20) NOT NULL DEFAULT 'FS',
  lag_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (predecessor_task_id, successor_task_id)
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  code VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  unit_of_measure VARCHAR(40) NOT NULL DEFAULT 'nos',
  quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  unit_rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
  category VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  drawing_no VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  discipline VARCHAR(100),
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  file_url TEXT,
  file_name VARCHAR(255),
  supersedes_id UUID,
  is_current BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  rfi_no VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_id UUID,
  is_current BOOLEAN NOT NULL DEFAULT true,
  raised_by UUID,
  assigned_to UUID,
  due_date DATE,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(30) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  assignee_id UUID,
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  requested_by UUID,
  decided_by UUID,
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  category VARCHAR(100) NOT NULL,
  planned_amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
  revised_amount NUMERIC(16, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (project_id, category)
);

CREATE INDEX IF NOT EXISTS idx_blocks_project ON %SCHEMA%.blocks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_towers_project ON %SCHEMA%.towers(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_floors_tower ON %SCHEMA%.floors(tower_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_units_project_status ON %SCHEMA%.units(project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_unit_status_history_unit ON %SCHEMA%.unit_status_history(unit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON %SCHEMA%.tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_deps_project ON %SCHEMA%.task_dependencies(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drawings_project_current ON %SCHEMA%.drawings(project_id, is_current) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rfis_project_current ON %SCHEMA%.rfis(project_id, is_current) WHERE deleted_at IS NULL;
`,
  },
  {
    name: '003_crm_foundation',
    sql: `
CREATE TABLE IF NOT EXISTS %SCHEMA%.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  source VARCHAR(100),
  assigned_to UUID,
  expected_revenue NUMERIC(16, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES %SCHEMA%.leads(id),
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS %SCHEMA%.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES %SCHEMA%.leads(id),
  project_id UUID NOT NULL REFERENCES %SCHEMA%.projects(id),
  unit_id UUID NOT NULL REFERENCES %SCHEMA%.units(id),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  booking_amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
  booking_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON %SCHEMA%.leads(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON %SCHEMA%.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_project ON %SCHEMA%.bookings(tenant_id, project_id) WHERE deleted_at IS NULL;
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
    await ensureDefaultUnitCategories(row.schemaName, row.id);
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
