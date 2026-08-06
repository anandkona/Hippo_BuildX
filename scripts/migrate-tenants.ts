import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { migrateAllTenants } from '../lib/tenants/migrations';

async function main() {
  console.log('Applying tenant migrations to all tenants...');
  const result = await migrateAllTenants();
  console.log(`Done. Processed ${result.count} tenant(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
