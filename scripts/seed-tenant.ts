import 'dotenv/config';
import { getSql, getDb } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../lib/auth/crypto';

const SCHEMA = 'tenant_demo';
const TENANT_EMAIL = 'user@demo.com';
const TENANT_PASSWORD = 'password123';

interface RoleDefinition {
  name: string;
  description: string;
  permissions: string[];
  permissionEntries: Array<{ module: string; action: string }>;
}

const ROLES: RoleDefinition[] = [
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
      { module: 'projects', action: 'approve' },
      { module: 'projects', action: 'export' },
      { module: 'inventory', action: 'read' },
      { module: 'procurement', action: 'read' },
      { module: 'construction', action: 'create' },
      { module: 'construction', action: 'read' },
      { module: 'construction', action: 'update' },
      { module: 'construction', action: 'delete' },
      { module: 'construction', action: 'approve' },
      { module: 'construction', action: 'export' },
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
      { module: 'crm', action: 'delete' },
      { module: 'crm', action: 'approve' },
      { module: 'crm', action: 'export' },
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
      { module: 'construction', action: 'delete' },
      { module: 'construction', action: 'approve' },
      { module: 'construction', action: 'export' },
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
      { module: 'accounting', action: 'delete' },
      { module: 'accounting', action: 'approve' },
      { module: 'accounting', action: 'export' },
      { module: 'procurement', action: 'read' },
      { module: 'customers', action: 'read' },
    ],
  },
];

async function seedTenant() {
  console.log('🌱 Seeding tenant demo...');

  const sql = getSql();
  const db = getDb();

  try {
    let [tenant] = await db.select().from(tenants).where(eq(tenants.slug, 'demo'));

    if (!tenant) {
      console.log('🏢 Creating demo tenant...');
      const [newTenant] = await db.insert(tenants).values({
        name: 'Demo Builders Inc.',
        slug: 'demo',
        schemaName: SCHEMA,
        status: 'provisioning',
      }).returning();
      tenant = newTenant;
    }

    console.log(`📁 Creating schema "${SCHEMA}"...`);
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);

    console.log('📋 Creating tenant tables...');
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${SCHEMA}".users (
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
    )`);

    await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${SCHEMA}".roles (
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
    )`);

    await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${SCHEMA}".user_roles (
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
    )`);

    await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${SCHEMA}".permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      role_id UUID NOT NULL,
      module VARCHAR(100) NOT NULL,
      action VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      created_by UUID,
      updated_by UUID,
      UNIQUE(role_id, module, action)
    )`);

    await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${SCHEMA}".refresh_tokens (
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
    )`);

    await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${SCHEMA}".audit_logs (
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
    )`);

    const [existingUser] = await sql.unsafe(`SELECT id FROM "${SCHEMA}".users WHERE email = '${TENANT_EMAIL}'`);

    let userId: string;
    if (!existingUser) {
      console.log(`👤 Creating tenant user (${TENANT_EMAIL})...`);
      const hashedPassword = await hashPassword(TENANT_PASSWORD);
      const [newUser] = await sql.unsafe(`INSERT INTO "${SCHEMA}".users (tenant_id, email, name, password_hash, status) VALUES ('${tenant.id}', '${TENANT_EMAIL}', 'Demo Admin', '${hashedPassword}', 'active') RETURNING id`);
      userId = newUser.id;
      console.log(`✅ Tenant user created: ${TENANT_EMAIL} / ${TENANT_PASSWORD}`);
    } else {
      userId = existingUser.id;
      console.log('✅ Tenant user already exists.');
    }

    // Always create roles and permissions (idempotent)
    const [existingAdminRole] = await sql.unsafe(`SELECT id FROM "${SCHEMA}".roles WHERE name = 'tenant_admin'`);
    if (!existingAdminRole) {
      let tenantAdminRoleId: string | null = null;

      for (const roleDef of ROLES) {
        const perms = JSON.stringify(roleDef.permissions);
        const [role] = await sql.unsafe(`INSERT INTO "${SCHEMA}".roles (tenant_id, name, description, permissions, is_system) VALUES ('${tenant.id}', '${roleDef.name}', '${roleDef.description}', '${perms}', true) RETURNING id`);
        console.log(`🔑 Created role: ${roleDef.name}`);

        if (roleDef.name === 'tenant_admin') {
          tenantAdminRoleId = role.id;
        }

        for (const entry of roleDef.permissionEntries) {
          await sql.unsafe(`INSERT INTO "${SCHEMA}".permissions (tenant_id, role_id, module, action) VALUES ('${tenant.id}', '${role.id}', '${entry.module}', '${entry.action}')`);
        }
        console.log(`  ✅ Inserted ${roleDef.permissionEntries.length} permission entries for ${roleDef.name}`);
      }

      if (tenantAdminRoleId) {
        console.log('🔗 Assigning tenant_admin role...');
        await sql.unsafe(`INSERT INTO "${SCHEMA}".user_roles (tenant_id, user_id, role_id) VALUES ('${tenant.id}', '${userId}', '${tenantAdminRoleId}')`);
      }
    } else {
      console.log('✅ Roles already exist.');
    }

    if (tenant.status !== 'active') {
      await db.update(tenants).set({ status: 'active' }).where(eq(tenants.id, tenant.id));
      console.log('✅ Tenant status set to active.');
    }

    console.log('🎉 Tenant seed complete!');
    console.log(`\n  Login credentials:`);
    console.log(`  POST /api/v1/auth/login`);
    console.log(`  { "tenantSlug": "demo", "email": "${TENANT_EMAIL}", "password": "${TENANT_PASSWORD}" }\n`);
  } catch (err) {
    console.error('❌ Tenant seed failed:', err);
  } finally {
    await sql.end();
  }
}

seedTenant();
