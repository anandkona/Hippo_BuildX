/**
 * Cross-tenant isolation suite (Phase 0 DoD).
 * Verifies schema-per-tenant boundaries and JWT-bound schema access.
 *
 * Usage: npx tsx scripts/test-isolation.ts
 */
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getDb, getSql, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { provisionTenant } from '../lib/tenants/provision';
import { applyTenantMigrations, isMigrationApplied, TENANT_MIGRATIONS } from '../lib/tenants/migrations';
import { signAccessToken, verifyAccessToken } from '../lib/auth/jwt';
import { hasPermission } from '../lib/rbac/permissions';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function cleanupTenant(slug: string) {
  const db = getDb();
  const sql = getSql();
  const [t] = await db.select().from(tenants).where(eq(tenants.slug, slug));
  if (!t) return;
  await sql.unsafe(`DROP SCHEMA IF EXISTS "${t.schemaName}" CASCADE`);
  await sql.unsafe(`DELETE FROM tenant_migrations WHERE tenant_id = $1`, [t.id]);
  await db.delete(tenants).where(eq(tenants.id, t.id));
}

async function main() {
  console.log('\\n▶ Isolation suite\\n');
  const stamp = Date.now().toString(36);
  const slugA = `iso_a_${stamp}`;
  const slugB = `iso_b_${stamp}`;
  const db = getDb();

  try {
    // --- Permission helper unit checks ---
    assert(hasPermission(['*'], 'users.create'), 'wildcard *');
    assert(hasPermission(['users.*'], 'users.create'), 'module wildcard');
    assert(!hasPermission(['users.read'], 'users.create'), 'exact deny');
    console.log('  ✓ permission helper');

    await cleanupTenant(slugA);
    await cleanupTenant(slugB);

    const [rowA] = await db
      .insert(tenants)
      .values({
        name: 'Iso A',
        slug: slugA,
        schemaName: `tenant_${slugA}`,
        status: 'provisioning',
        adminEmail: `admin@${slugA}.test`,
        adminName: 'Admin A',
      })
      .returning();
    const [rowB] = await db
      .insert(tenants)
      .values({
        name: 'Iso B',
        slug: slugB,
        schemaName: `tenant_${slugB}`,
        status: 'provisioning',
        adminEmail: `admin@${slugB}.test`,
        adminName: 'Admin B',
      })
      .returning();

    await provisionTenant({
      tenantId: rowA.id,
      schemaName: rowA.schemaName,
      name: rowA.name,
      adminEmail: `admin@${slugA}.test`,
      adminName: 'Admin A',
      adminPassword: 'password123',
    });
    await provisionTenant({
      tenantId: rowB.id,
      schemaName: rowB.schemaName,
      name: rowB.name,
      adminEmail: `admin@${slugB}.test`,
      adminName: 'Admin B',
      adminPassword: 'password123',
    });
    console.log('  ✓ provisioned A and B');

    for (const m of TENANT_MIGRATIONS) {
      assert(await isMigrationApplied(rowA.id, m.name), `A has ${m.name}`);
      assert(await isMigrationApplied(rowB.id, m.name), `B has ${m.name}`);
    }
    // Idempotent re-run
    await applyTenantMigrations(rowA.id, rowA.schemaName);
    console.log('  ✓ migrations recorded + idempotent');

    const sqlA = createTenantSql(rowA.schemaName);
    const sqlB = createTenantSql(rowB.schemaName);
    const usersA = await sqlA`SELECT email FROM users`;
    const usersB = await sqlB`SELECT email FROM users`;
    assert(usersA.some((u: { email: string }) => u.email.includes(slugA)), 'A admin in A');
    assert(usersB.some((u: { email: string }) => u.email.includes(slugB)), 'B admin in B');
    assert(!usersA.some((u: { email: string }) => u.email.includes(slugB)), 'B not visible in A schema');
    assert(!usersB.some((u: { email: string }) => u.email.includes(slugA)), 'A not visible in B schema');
    console.log('  ✓ schema-scoped user isolation');

    const [userA] = await sqlA`SELECT id FROM users LIMIT 1`;
    const tokenA = await signAccessToken({
      userId: userA.id,
      tenantId: rowA.id,
      schemaName: rowA.schemaName,
      roles: ['tenant_admin'],
      permissions: ['*'],
    });
    const payload = await verifyAccessToken(tokenA);
    assert(payload?.schemaName === rowA.schemaName, 'token binds schema A');
    assert(payload?.tenantId === rowA.id, 'token binds tenant A');
    // Forged header values must not be trusted by application when using JWT claims
    assert(payload?.schemaName !== rowB.schemaName, 'token is not for B');
    console.log('  ✓ JWT tenant binding');

    // Count users via each schema — total counts must stay isolated
    const countA = Number((await sqlA`SELECT COUNT(*)::int AS c FROM users`)[0].c);
    const countB = Number((await sqlB`SELECT COUNT(*)::int AS c FROM users`)[0].c);
    assert(countA >= 1 && countB >= 1, 'both have users');
    await sqlA`INSERT INTO users (tenant_id, email, name, password_hash, status)
      VALUES (${rowA.id}, ${`extra@${slugA}.test`}, 'Extra A', 'x', 'active')`;
    const countA2 = Number((await sqlA`SELECT COUNT(*)::int AS c FROM users`)[0].c);
    const countB2 = Number((await sqlB`SELECT COUNT(*)::int AS c FROM users`)[0].c);
    assert(countA2 === countA + 1, 'insert only affected A');
    assert(countB2 === countB, 'B unchanged after A insert');
    console.log('  ✓ write isolation');

    console.log('\\n✅ Isolation suite passed\\n');
  } catch (err) {
    console.error('\\n❌ Isolation suite failed:', err);
    process.exitCode = 1;
  } finally {
    await cleanupTenant(slugA).catch(() => undefined);
    await cleanupTenant(slugB).catch(() => undefined);
    await getSql().end({ timeout: 5 });
  }
}

main();
