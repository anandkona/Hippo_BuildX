import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { periodStart, periodEnd } = body;

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'periodStart and periodEnd are required' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const payrollId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);

      // 1. Create Draft Payroll Run
      await tx`
        INSERT INTO payroll_runs (id, tenant_id, period_start, period_end, status)
        VALUES (${payrollId}, ${context.tenantId}, ${periodStart}, ${periodEnd}, 'draft')
      `;

      // 2. Find all active employees
      const activeEmployees = await tx`
        SELECT id, base_salary, salary_basis 
        FROM employees 
        WHERE status = 'active' AND base_salary IS NOT NULL
      `;

      // 3. For each, compute payslip
      // Simplistic calculation:
      // - Monthly: full base salary if present all days (mocked for simplicity: just use baseSalary)
      // - Daily: baseSalary * days present
      
      for (const emp of activeEmployees) {
        let grossPay = 0;
        
        if (emp.salary_basis === 'monthly') {
          grossPay = parseFloat(emp.base_salary);
        } else if (emp.salary_basis === 'daily') {
          // Count present days in period
          const [attendanceCount] = await tx`
            SELECT count(*) as days_present 
            FROM attendance 
            WHERE employee_id = ${emp.id} 
              AND date >= ${periodStart} 
              AND date <= ${periodEnd}
              AND status = 'present'
          `;
          grossPay = parseFloat(emp.base_salary) * parseInt(attendanceCount.days_present);
        }

        const deductions = 0; // Simplified
        const netPay = grossPay - deductions;

        await tx`
          INSERT INTO payslips (id, tenant_id, payroll_id, employee_id, gross_pay, deductions, net_pay)
          VALUES (${generateUuid()}, ${context.tenantId}, ${payrollId}, ${emp.id}, ${grossPay}, ${deductions}, ${netPay})
        `;
      }
    });

    await logAudit(context, 'CREATE', 'PayrollRun', payrollId, { periodStart, periodEnd });

    return NextResponse.json({ data: { id: payrollId, message: 'Draft payroll run generated successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 500 });
  }
}
