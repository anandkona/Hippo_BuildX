/**
 * Remove e2e/test junk left by platform-visual CRUD runs, then re-apply realistic seed.
 */
import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getSql, getDb } from '../lib/db/client';
import {
  platformUsers,
  tenants,
  plans,
  subscriptions,
  platformAuditLogs,
} from '../lib/db/schema/control-plane';
import { like, or, inArray } from 'drizzle-orm';

async function main() {
  const sql = getSql();
  const db = getDb();
  console.log('Cleaning e2e / test junk...');

  // Delete e2e platform users
  const e2eUsers = await db
    .select({ id: platformUsers.id, email: platformUsers.email })
    .from(platformUsers)
    .where(or(like(platformUsers.email, 'e2e%@buildx.com'), like(platformUsers.name, 'E2E %')));
  if (e2eUsers.length) {
    await db.delete(platformUsers).where(
      inArray(
        platformUsers.id,
        e2eUsers.map((u) => u.id)
      )
    );
    console.log(`Removed ${e2eUsers.length} e2e platform users`);
  }

  // Delete e2e plans (soft deactivate + hard delete if unused)
  const e2ePlans = await db
    .select({ id: plans.id, name: plans.name })
    .from(plans)
    .where(or(like(plans.name, 'e2e-%'), like(plans.displayName, 'E2E Plan %')));
  if (e2ePlans.length) {
    const ids = e2ePlans.map((p) => p.id);
    await db.delete(subscriptions).where(inArray(subscriptions.planId, ids));
    await db.delete(plans).where(inArray(plans.id, ids));
    console.log(`Removed ${e2ePlans.length} e2e plans`);
  }

  // Delete e2e tenants + their subscriptions
  const e2eTenants = await db
    .select({ id: tenants.id, slug: tenants.slug })
    .from(tenants)
    .where(or(like(tenants.slug, 'e2e-%'), like(tenants.name, 'E2E Tenant %')));
  if (e2eTenants.length) {
    const ids = e2eTenants.map((t) => t.id);
    await db.delete(subscriptions).where(inArray(subscriptions.tenantId, ids));
    await db.delete(tenants).where(inArray(tenants.id, ids));
    console.log(`Removed ${e2eTenants.length} e2e tenants`);
  }

  // Remove audit noise from e2e runs
  await sql`
    DELETE FROM platform_audit_logs
    WHERE details ILIKE '%E2E %'
       OR details ILIKE '%e2e-%'
       OR details ILIKE '%e2e%@buildx.com%'
  `;
  console.log('Cleaned e2e audit log rows');

  await sql.end();
  console.log('Cleanup done. Run npm run db:seed next.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
