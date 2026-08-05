import 'dotenv/config';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/build_ex';

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  console.log('Applying platform schema migrations...');

  await sql`
    ALTER TABLE platform_users
    ADD COLUMN IF NOT EXISTS role varchar(50) NOT NULL DEFAULT 'platform_admin'
  `;

  await sql`
    ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS usage jsonb DEFAULT '{}'::jsonb
  `;

  // Professional company / contact profile for tenant provisioning
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS legal_name varchar(255)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry varchar(100) DEFAULT 'Construction'`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_size varchar(50)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gstin varchar(20)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pan varchar(20)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cin varchar(30)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website varchar(255)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line1 varchar(255)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line2 varchar(255)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city varchar(100)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS state varchar(100)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pincode varchar(20)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country varchar(100) DEFAULT 'India'`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_name varchar(255)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email varchar(255)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone varchar(30)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_designation varchar(100)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email varchar(255)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_name varchar(255)`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_email varchar(255)`;

  await sql`
    ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS max_storage_gb integer NOT NULL DEFAULT 5
  `;
  await sql`
    ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS max_api_calls integer NOT NULL DEFAULT 10000
  `;
  await sql`
    ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS support_level varchar(50) NOT NULL DEFAULT 'Email'
  `;
  await sql`
    ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0
  `;

  // Ensure unique on plans.name if missing
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plans_name_unique'
      ) THEN
        ALTER TABLE plans ADD CONSTRAINT plans_name_unique UNIQUE (name);
      END IF;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key varchar(100) NOT NULL UNIQUE,
      name varchar(255) NOT NULL,
      description text,
      enabled boolean NOT NULL DEFAULT true,
      scope varchar(20) NOT NULL DEFAULT 'global',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key varchar(100) NOT NULL UNIQUE,
      value jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS platform_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id uuid REFERENCES platform_users(id),
      actor_email varchar(255),
      action varchar(100) NOT NULL,
      resource varchar(100),
      resource_id varchar(100),
      details text,
      ip_address varchar(45),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  console.log('Schema migration complete.');
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
