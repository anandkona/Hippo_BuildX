import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { contractorId, projectId, date, headcount, notes } = body;

    if (!contractorId || !projectId || !date || headcount === undefined) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing required fields' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const id = generateUuid();

    await tenantSql`
      INSERT INTO labour_attendance (id, tenant_id, contractor_id, project_id, date, headcount, notes)
      VALUES (${id}, ${context.tenantId}, ${contractorId}, ${projectId}, ${date}, ${headcount}, ${notes || null})
    `;

    await logAudit(context, 'CREATE', 'LabourAttendance', id, { contractorId, projectId, date, headcount });

    return NextResponse.json({ data: { id, message: 'Labour attendance logged successfully' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 500 });
  }
}
