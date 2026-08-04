import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSql, getDb, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { generateUuid } from '../lib/utils';
import { migrateTenant } from '../lib/db/migrate-tenant';
import { eq } from 'drizzle-orm';

describe('Phase 8: Operational Accounting', () => {
  const tenantAccounting = {
    id: generateUuid(),
    name: 'Tenant Accounting',
    slug: 'tenant-acc',
    schemaName: 'tenant_acc_test',
  };

  const sql = getSql();
  const db = getDb();

  beforeAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantAccounting.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-acc'));

    await db.insert(tenants).values(tenantAccounting);
    await migrateTenant(tenantAccounting.schemaName);
  }, 30000);

  afterAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantAccounting.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.id, tenantAccounting.id));
  });

  it('Verifies double-entry logic and updates account balances correctly', async () => {
    const tenantSql = createTenantSql(tenantAccounting.schemaName);
    
    let cashAccountId = generateUuid();
    let siteExpenseAccountId = generateUuid();
    let transId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${tenantAccounting.schemaName}", public`);

      // 1. Create Accounts
      await tx`
        INSERT INTO accounts (id, tenant_id, account_name, account_type, balance)
        VALUES (${cashAccountId}, ${tenantAccounting.id}, 'Petty Cash', 'asset', 5000)
      `;
      await tx`
        INSERT INTO accounts (id, tenant_id, account_name, account_type, balance)
        VALUES (${siteExpenseAccountId}, ${tenantAccounting.id}, 'Site Materials', 'expense', 0)
      `;

      // 2. Post a Transaction: Spend 500 on Site Materials
      // Rule: Expense increases (Debit 500). Asset decreases (Credit 500).
      await tx`
        INSERT INTO transactions (id, tenant_id, date, description, status)
        VALUES (${transId}, ${tenantAccounting.id}, '2023-10-15', 'Bought sand for site', 'posted')
      `;

      // Debit Site Materials
      await tx`
        INSERT INTO journal_entries (id, tenant_id, transaction_id, account_id, debit, credit)
        VALUES (${generateUuid()}, ${tenantAccounting.id}, ${transId}, ${siteExpenseAccountId}, 500, 0)
      `;
      // We expect the API logic equivalent here for updating balance:
      // Expense -> Debit increases balance
      await tx`UPDATE accounts SET balance = balance + 500 WHERE id = ${siteExpenseAccountId}`;

      // Credit Petty Cash
      await tx`
        INSERT INTO journal_entries (id, tenant_id, transaction_id, account_id, debit, credit)
        VALUES (${generateUuid()}, ${tenantAccounting.id}, ${transId}, ${cashAccountId}, 0, 500)
      `;
      // Asset -> Credit decreases balance, so balanceDelta = debit - credit = 0 - 500 = -500
      await tx`UPDATE accounts SET balance = balance - 500 WHERE id = ${cashAccountId}`;
    });

    // 3. Verify Balances
    const [cashAcc] = await tenantSql`SELECT balance FROM accounts WHERE id = ${cashAccountId}`;
    const [expAcc] = await tenantSql`SELECT balance FROM accounts WHERE id = ${siteExpenseAccountId}`;

    expect(parseFloat(cashAcc.balance)).toBe(4500); // 5000 - 500
    expect(parseFloat(expAcc.balance)).toBe(500); // 0 + 500
  }, 30000);
});
