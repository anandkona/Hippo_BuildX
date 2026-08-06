import { NextResponse } from 'next/server';
import { requireTenantApi, withAudit } from '@/lib/api/tenant-admin';
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
    const auth = await requireTenantApi(req, { permission: 'roles.read' });
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const url = new URL(req.url);
    const page = toInt(url.searchParams.get('page'), 1);
    const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);
    const offset = (page - 1) * pageSize;

    const sql = createTenantSql(context.schemaName);

    const countResult = await sql.unsafe(
      `SELECT COUNT(*)::text AS count FROM roles WHERE deleted_at IS NULL`,
      []
    );
    const total = parseInt(countResult[0]?.count ?? '0', 10);

    const data = await sql.unsafe(
      `SELECT id, name, description, permissions, is_system, created_at, updated_at
       FROM roles
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      []
    );

    const meta: PaginationMeta = { total, page, pageSize };

    return NextResponse.json({ data, meta });
  } catch (error) {
    console.error('List roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAudit(
  { permission: 'roles.create', resource: 'role', action: 'Created Role' },
  async ({ req, context, audit }) => {
    const body = await req.json();
    const { name, description, permissions } = body as {
      name?: string;
      description?: string;
      permissions?: string[];
    };

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const sql = createTenantSql(context.schemaName);

    const [existingRole] = await sql`
      SELECT id FROM roles WHERE name = ${name} AND deleted_at IS NULL
    `;
    if (existingRole) {
      return NextResponse.json(
        { error: 'A role with this name already exists' },
        { status: 409 }
      );
    }

    const [role] = await sql`
      INSERT INTO roles (tenant_id, name, description, permissions, created_by)
      VALUES (
        ${context.tenantId},
        ${name},
        ${description || null},
        ${JSON.stringify(permissions || [])},
        ${context.userId || null}
      )
      RETURNING id, name, description, permissions, is_system, created_at
    `;

    audit({ resourceId: role.id, details: { name } });
    return NextResponse.json({ data: role }, { status: 201 });
  }
);
