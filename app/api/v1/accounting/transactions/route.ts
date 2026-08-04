import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { date, description, referenceId, entries } = body;
    // entries: Array<{ accountId: string, debit: number, credit: number }>

    if (!date || !entries || entries.length < 2) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Date and at least 2 journal entries are required' } }, { status: 400 });
    }

    // Validate Double-Entry Rule
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      totalDebit += (entry.debit || 0);
      totalCredit += (entry.credit || 0);
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ 
        error: { code: 'ACCOUNTING_RULE_VIOLATION', message: 'Total Debits must equal Total Credits' } 
      }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const transactionId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);

      await tx`
        INSERT INTO transactions (id, tenant_id, date, description, reference_id, created_by)
        VALUES (${transactionId}, ${context.tenantId}, ${date}, ${description || null}, ${referenceId || null}, ${context.userId || null})
      `;

      for (const entry of entries) {
        await tx`
          INSERT INTO journal_entries (id, tenant_id, transaction_id, account_id, debit, credit)
          VALUES (${generateUuid()}, ${context.tenantId}, ${transactionId}, ${entry.accountId}, ${entry.debit || 0}, ${entry.credit || 0})
        `;

        // Update account balances (simplified approach)
        // Note: For asset/expense, debit increases balance. For liability/equity/revenue, credit increases balance.
        // For this MVP, we will just apply a generic formula, or leave balance recalculation to an async worker.
        // We'll update balance rigidly here for testing purposes (Asset/Expense = Debit - Credit, Others = Credit - Debit)
        
        const [acc] = await tx`SELECT account_type FROM accounts WHERE id = ${entry.accountId}`;
        let balanceDelta = 0;
        
        if (acc.account_type === 'asset' || acc.account_type === 'expense') {
          balanceDelta = (entry.debit || 0) - (entry.credit || 0);
        } else {
          balanceDelta = (entry.credit || 0) - (entry.debit || 0);
        }

        await tx`UPDATE accounts SET balance = balance + ${balanceDelta} WHERE id = ${entry.accountId}`;
      }
    });

    await logAudit(context, 'CREATE', 'Transaction', transactionId, { totalDebit, totalCredit });

    return NextResponse.json({ data: { id: transactionId, message: 'Transaction posted successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 500 });
  }
}
