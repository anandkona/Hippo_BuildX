import 'dotenv/config';
import { getSql, getDb } from '../lib/db/client';
import { platformUsers, tenants } from '../lib/db/schema/control-plane';
import { hashPassword } from '../lib/auth/crypto';

async function seed() {
  console.log('🌱 Starting database seed...');
  
  const sql = getSql();
  const db = getDb();

  try {
    // 1. Create a Platform Super Admin
    const adminEmail = 'super@buildx.com';
    const hashedPassword = await hashPassword('password123');
    
    // Using Postgres raw UPSERT equivalent to avoid unique constraint errors if running multiple times
    const [existingAdmin] = await sql`SELECT id FROM platform_users WHERE email = ${adminEmail}`;
    
    if (!existingAdmin) {
      console.log('👤 Creating Platform Super Admin (super@buildx.com)...');
      await db.insert(platformUsers).values({
        name: 'Platform Super Admin',
        email: adminEmail,
        passwordHash: hashedPassword,
        isActive: true,
      });
    } else {
      console.log('✅ Platform Super Admin already exists.');
    }

    // 2. Create a demo tenant to seed the database
    const tenantSlug = 'demo';
    const [existingTenant] = await sql`SELECT id FROM tenants WHERE slug = ${tenantSlug}`;

    if (!existingTenant) {
      console.log('🏢 Creating Demo Tenant (demo)...');
      await db.insert(tenants).values({
        name: 'Demo Builders Inc.',
        slug: tenantSlug,
        schemaName: 'tenant_demo',
        status: 'provisioning', // Assuming BullMQ will pick this up if running
      });
      console.log('🚀 Enqueueing provision job for Demo tenant. Make sure the worker is running!');
    } else {
      console.log('✅ Demo tenant already exists.');
    }

    console.log('🎉 Seed complete!');
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    // End the connection pool
    await sql.end();
  }
}

seed();
