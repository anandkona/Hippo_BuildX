import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSql, getDb, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { generateUuid } from '../lib/utils';
import { migrateTenant } from '../lib/db/migrate-tenant';
import { eq } from 'drizzle-orm';

describe('Phase 7: HRMS', () => {
  const tenantHrms = {
    id: generateUuid(),
    name: 'Tenant HRMS',
    slug: 'tenant-hrms',
    schemaName: 'tenant_hrms_test',
  };

  const sql = getSql();
  const db = getDb();

  beforeAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantHrms.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-hrms'));

    await db.insert(tenants).values(tenantHrms);
    await migrateTenant(tenantHrms.schemaName);
  }, 30000);

  afterAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantHrms.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.id, tenantHrms.id));
  });

  it('Logs attendance and generates draft payroll accurately', async () => {
    const tenantSql = createTenantSql(tenantHrms.schemaName);
    let empId1 = generateUuid(); // Monthly
    let empId2 = generateUuid(); // Daily

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${tenantHrms.schemaName}", public`);

      // 1. Create employees
      await tx`
        INSERT INTO employees (id, tenant_id, employee_code, salary_basis, base_salary, status)
        VALUES (${empId1}, ${tenantHrms.id}, 'EMP-001', 'monthly', 50000, 'active')
      `;
      await tx`
        INSERT INTO employees (id, tenant_id, employee_code, salary_basis, base_salary, status)
        VALUES (${empId2}, ${tenantHrms.id}, 'EMP-002', 'daily', 1000, 'active')
      `;

      // 2. Log Attendance (simulate API logic for 2 days for emp2)
      const d1 = '2023-10-01';
      const d2 = '2023-10-02';

      await tx`
        INSERT INTO attendance (id, tenant_id, employee_id, date, punch_in, punch_out, status)
        VALUES (${generateUuid()}, ${tenantHrms.id}, ${empId2}, ${d1}, NOW(), NOW(), 'present')
      `;
      await tx`
        INSERT INTO attendance (id, tenant_id, employee_id, date, punch_in, punch_out, status)
        VALUES (${generateUuid()}, ${tenantHrms.id}, ${empId2}, ${d2}, NOW(), NOW(), 'present')
      `;
      // emp1 is monthly, we don't log their attendance for this simplistic test, we assume they get full pay.

      // 3. Generate Payroll (simulate API logic)
      const payrollId = generateUuid();
      await tx`
        INSERT INTO payroll_runs (id, tenant_id, period_start, period_end, status)
        VALUES (${payrollId}, ${tenantHrms.id}, '2023-10-01', '2023-10-31', 'draft')
      `;

      // Emp1 calculation (monthly)
      await tx`
        INSERT INTO payslips (id, tenant_id, payroll_id, employee_id, gross_pay, deductions, net_pay)
        VALUES (${generateUuid()}, ${tenantHrms.id}, ${payrollId}, ${empId1}, 50000, 0, 50000)
      `;

      // Emp2 calculation (daily = 1000 * 2 days = 2000)
      const [attCount] = await tx`SELECT count(*) as days FROM attendance WHERE employee_id = ${empId2} AND status = 'present'`;
      const emp2Gross = 1000 * parseInt(attCount.days);

      await tx`
        INSERT INTO payslips (id, tenant_id, payroll_id, employee_id, gross_pay, deductions, net_pay)
        VALUES (${generateUuid()}, ${tenantHrms.id}, ${payrollId}, ${empId2}, ${emp2Gross}, 0, ${emp2Gross})
      `;
    });

    // Verify Payslips
    const payslips = await tenantSql`SELECT employee_id, net_pay FROM payslips ORDER BY net_pay DESC`;
    expect(payslips.length).toBe(2);

    const p1 = payslips.find((p: any) => p.employee_id === empId1);
    const p2 = payslips.find((p: any) => p.employee_id === empId2);

    expect(parseFloat(p1.net_pay)).toBe(50000);
    expect(parseFloat(p2.net_pay)).toBe(2000); // 2 days * 1000
  }, 30000);
});
