/**
 * Resend set-password invite for an existing tenant admin.
 * Usage: npx tsx scripts/resend-tenant-invite.ts [email]
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });

import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { sendTenantAdminInvite } from '../lib/tenants/invite';

async function main() {
  const email = (process.argv[2] || 'saikumarbali555@gmail.com').trim().toLowerCase();
  const db = getDb();
  const rows = await db.select().from(tenants).where(eq(tenants.adminEmail, email));
  const tenant = rows.find((t) => t.status === 'active') || rows[0];

  if (!tenant) {
    console.error(JSON.stringify({ ok: false, error: `No tenant with adminEmail=${email}` }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        tenantId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        adminEmail: tenant.adminEmail,
      },
      null,
      2
    )
  );

  if (tenant.status !== 'active') {
    console.error(JSON.stringify({ ok: false, error: 'Tenant is not active' }, null, 2));
    process.exit(1);
  }

  const invite = await sendTenantAdminInvite({
    tenantId: tenant.id,
    companyName: tenant.name,
    workspace: tenant.slug,
    adminName: tenant.adminName || `${tenant.name} Admin`,
    adminEmail: tenant.adminEmail!,
  });

  console.log(JSON.stringify({ invite }, null, 2));
  if (invite.inviteUrl) {
    console.log('\nOPEN THIS LINK TO SET PASSWORD:\n' + invite.inviteUrl);
  }
  process.exit(invite.sent ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
