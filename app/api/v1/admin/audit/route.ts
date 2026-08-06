import { NextResponse } from 'next/server';
import { requireTenantApi } from '@/lib/api/tenant-admin';
import { createTenantSql } from '@/lib/db/client';

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

function toInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 1 ? fallback : n;
}

export async function GET(req: Request) {
  try {
    const auth = await requireTenantApi(req, { permission: 'users.read' });
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const url = new URL(req.url);
    const page = toInt(url.searchParams.get('page'), 1);
    const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);
    const action = url.searchParams.get('action');
    const resource = url.searchParams.get('resource');
    const userId = url.searchParams.get('userId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const offset = (page - 1) * pageSize;

    const sql = createTenantSql(context.schemaName);

    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (action) {
      conditions.push(`action = $${paramIdx++}`);
      params.push(action);
    }
    if (resource) {
      conditions.push(`resource = $${paramIdx++}`);
      params.push(resource);
    }
    if (userId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(userId);
    }
    if (from) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(to);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await sql.unsafe(
      `SELECT COUNT(*)::text AS count FROM audit_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count ?? '0', 10);

    const data = await sql.unsafe(
      `SELECT id, tenant_id, user_id, action, resource, resource_id, details, ip_address, created_at
       FROM audit_logs
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    const meta: PaginationMeta = { total, page, pageSize };

    return NextResponse.json({ data, meta });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
