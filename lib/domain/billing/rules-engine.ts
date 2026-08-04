import { createTenantSql } from '../../db/client';
import { generateUuid } from '../../utils';
import { getSql } from '../../db/client';

/**
 * Evaluates progress against payment milestones.
 * This should ideally run in a background worker, but we invoke it directly from the event listener.
 */
export async function evaluateProgressForBilling(tenantId: string, unitId: string, newProgress: number, triggeredBy?: string) {
  try {
    // 1. Resolve tenant schema
    const globalSql = getSql();
    const [tenantRow] = await globalSql`SELECT schema_name FROM tenants WHERE id = ${tenantId}`;
    if (!tenantRow) {
      console.error(`[BillingEngine] Tenant not found: ${tenantId}`);
      return;
    }
    const schemaName = tenantRow.schema_name;
    const tenantSql = createTenantSql(schemaName);

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);

      // 2. Find the active payment plan for this unit
      const [unitPlan] = await tx`
        SELECT plan_id, total_value 
        FROM unit_payment_plans 
        WHERE unit_id = ${unitId} 
        LIMIT 1
      `;
      if (!unitPlan) {
        console.log(`[BillingEngine] No active payment plan found for unit ${unitId}`);
        return;
      }

      // 3. Find milestones that have been crossed but not demanded yet
      const milestones = await tx`
        SELECT id, name, threshold_percentage, installment_percentage 
        FROM payment_milestones 
        WHERE plan_id = ${unitPlan.plan_id}
          AND is_time_based = false
          AND threshold_percentage <= ${newProgress}
      `;

      for (const ms of milestones) {
        // Idempotency check: Does a demand letter already exist for this unit + milestone?
        const [existingDemand] = await tx`
          SELECT id FROM demand_letters 
          WHERE unit_id = ${unitId} AND milestone_id = ${ms.id} 
          LIMIT 1
        `;

        if (!existingDemand) {
          // Generate new demand letter
          const demandId = generateUuid();
          const amount = (parseFloat(unitPlan.total_value) * parseFloat(ms.installment_percentage)) / 100;
          
          // Set due date to 15 days from now
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 15);
          const dueDateStr = dueDate.toISOString().split('T')[0];

          await tx`
            INSERT INTO demand_letters (id, tenant_id, unit_id, milestone_id, amount, due_date, status, pdf_url, demanded_at)
            VALUES (${demandId}, ${tenantId}, ${unitId}, ${ms.id}, ${amount}, ${dueDateStr}, 'demanded', 'https://mock-s3-bucket/invoices/' || ${demandId} || '.pdf', NOW())
          `;

          // Log notification (simulated dispatch)
          await tx`
            INSERT INTO notification_logs (id, tenant_id, type, recipient, status)
            VALUES (${generateUuid()}, ${tenantId}, 'email', 'customer@example.com', 'sent')
          `;

          console.log(`[BillingEngine] Generated Demand Letter ${demandId} for Unit ${unitId} - Milestone: ${ms.name}`);
        }
      }
    });

  } catch (error) {
    console.error(`[BillingEngine] Error evaluating billing for unit ${unitId}:`, error);
  }
}
