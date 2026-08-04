import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const tenantSql = createTenantSql(context.schemaName);
    
    // Optional filters
    const employeeId = req.nextUrl.searchParams.get('employeeId');
    const date = req.nextUrl.searchParams.get('date'); // YYYY-MM-DD

    let query = tenantSql`
      SELECT a.id, a.date, a.punch_in, a.punch_out, a.status, e.employee_code, e.userId as user_id, u.name as employee_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;

    if (employeeId) {
      query = tenantSql`${query} AND a.employee_id = ${employeeId}`;
    }
    if (date) {
      query = tenantSql`${query} AND a.date = ${date}`;
    }

    const records = await tenantSql`${query} ORDER BY a.date DESC, a.punch_in DESC`;

    return NextResponse.json({ data: records });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const body = await req.json();
    const { employeeId, type, lat, lng } = body; // type: 'in' or 'out'

    if (!employeeId || !type) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'employeeId and type are required' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    const today = new Date().toISOString().split('T')[0];

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);

      const [existing] = await tx`
        SELECT id, punch_in, punch_out FROM attendance 
        WHERE employee_id = ${employeeId} AND date = ${today} 
        LIMIT 1
      `;

      if (type === 'in') {
        if (existing && existing.punch_in) {
          throw new Error('Already punched in for today');
        }
        
        if (existing) {
          await tx`UPDATE attendance SET punch_in = NOW(), location_lat = ${lat || null}, location_lng = ${lng || null} WHERE id = ${existing.id}`;
        } else {
          await tx`
            INSERT INTO attendance (id, tenant_id, employee_id, date, punch_in, location_lat, location_lng)
            VALUES (${generateUuid()}, ${context.tenantId}, ${employeeId}, ${today}, NOW(), ${lat || null}, ${lng || null})
          `;
        }
      } else if (type === 'out') {
        if (!existing || !existing.punch_in) {
          throw new Error('Cannot punch out without punching in first');
        }
        if (existing.punch_out) {
          throw new Error('Already punched out for today');
        }
        
        await tx`UPDATE attendance SET punch_out = NOW() WHERE id = ${existing.id}`;
      }
    });

    await logAudit(context, 'UPDATE', 'Attendance', employeeId, { type, date: today });

    return NextResponse.json({ data: { message: `Punched ${type} successfully` } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 400 });
  }
}
