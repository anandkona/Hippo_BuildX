/**
 * Reset control-plane demo data to only the realistic seed catalog.
 * Removes leftover manual/test tenants and plans not in the canonical seed set.
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
import { notInArray, like, or, inArray } from 'drizzle-orm';

const KEEP_TENANT_SLUGS = [
  'abc-constructions',
  'larsen-infra',
  'shapoorji-homes',
  'demo',
  'skyline',
  'horizon',
  'prestige',
  'buildright',
  'greenfield',
  'metro',
  'prime',
  'godrej-west',
];

const KEEP_PLAN_NAMES = ['basic', 'professional', 'business', 'enterprise'];

const KEEP_USER_EMAILS = [
  'super@buildx.com',
  'admin@buildx.com',
  'support@buildx.com',
  'billing@buildx.com',
  'readonly@buildx.com',
];

async function main() {
  const sql = getSql();
  const db = getDb();
  console.log('Resetting to realistic demo catalog...');

  // Extra users
  const junkUsers = await db
    .select({ id: platformUsers.id, email: platformUsers.email })
    .from(platformUsers)
    .where(notInArray(platformUsers.email, KEEP_USER_EMAILS));
  if (junkUsers.length) {
    await db.delete(platformUsers).where(
      inArray(
        platformUsers.id,
        junkUsers.map((u) => u.id)
      )
    );
    console.log(`Removed ${junkUsers.length} non-demo users:`, junkUsers.map((u) => u.email).join(', '));
  }

  // Extra tenants
  const junkTenants = await db
    .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
    .from(tenants)
    .where(notInArray(tenants.slug, KEEP_TENANT_SLUGS));
  if (junkTenants.length) {
    const ids = junkTenants.map((t) => t.id);
    await db.delete(subscriptions).where(inArray(subscriptions.tenantId, ids));
    await db.delete(tenants).where(inArray(tenants.id, ids));
    console.log(
      `Removed ${junkTenants.length} non-demo tenants:`,
      junkTenants.map((t) => t.name).join(', ')
    );
  }

  // Also kill e2e/test patterns among kept list edge cases
  const e2eTenants = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(or(like(tenants.slug, 'e2e-%'), like(tenants.name, 'E2E %'), like(tenants.name, 'Test %'), like(tenants.name, 'Apex %')));
  // Don't remove if somehow in keep list - Apex shouldn't be in keep
  if (e2eTenants.length) {
    // filter those still present
    const still = e2eTenants;
    if (still.length) {
      const ids = still.map((t) => t.id);
      await db.delete(subscriptions).where(inArray(subscriptions.tenantId, ids));
      await db.delete(tenants).where(inArray(tenants.id, ids));
      console.log(`Removed ${ids.length} leftover test-pattern tenants`);
    }
  }

  // Extra plans
  const junkPlans = await db
    .select({ id: plans.id, name: plans.name, displayName: plans.displayName })
    .from(plans)
    .where(notInArray(plans.name, KEEP_PLAN_NAMES));
  if (junkPlans.length) {
    const ids = junkPlans.map((p) => p.id);
    await db.delete(subscriptions).where(inArray(subscriptions.planId, ids));
    await db.delete(plans).where(inArray(plans.id, ids));
    console.log(
      `Removed ${junkPlans.length} non-demo plans:`,
      junkPlans.map((p) => p.displayName).join(', ')
    );
  }

  await db.delete(platformAuditLogs);
  console.log('Cleared audit logs (seed will refresh)');

  await sql.end();
  console.log('Catalog reset done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
