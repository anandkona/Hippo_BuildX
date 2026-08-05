import { NextResponse } from 'next/server';
import { createTenantSql, getSql } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/crypto';
import { auditTenantMutation, requireTenantApi } from '@/lib/api/tenant-admin';

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

    const url = new URL(req.url);
    const page = toInt(url.searchParams.get('page'), 1);
    const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);
    const search = url.searchParams.get('search');
    const offset = (page - 1) * pageSize;

    const sql = createTenantSql(auth.context.schemaName);

    const conditions = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await sql.unsafe(
      `SELECT COUNT(*)::text AS count FROM users WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count ?? '0', 10);

    const data = await sql.unsafe(
      `SELECT id, email, name, status, last_login_at, created_at, updated_at
       FROM users
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    const meta: PaginationMeta = { total, page, pageSize };
    return NextResponse.json({ data, meta });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireTenantApi(req, { permission: 'users.create' });
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { email, name, password, roleIds } = body as {
      email?: string;
      name?: string;
      password?: string;
      roleIds?: string[];
    };

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'email, name, and password are required' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const checkSql = createTenantSql(auth.context.schemaName);

    const [existingUser] = await checkSql`
      SELECT id FROM users WHERE email = ${email} AND deleted_at IS NULL
    `;
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const dbSql = getSql();
    let createdId = '';

    await dbSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${auth.context.schemaName}", public`);

      const [user] = await tx`
        INSERT INTO users (tenant_id, email, name, password_hash, created_by)
        VALUES (${auth.context.tenantId}, ${email}, ${name}, ${hashedPassword}, ${auth.context.userId || null})
        RETURNING id
      `;
      createdId = user.id;

      if (roleIds && roleIds.length > 0) {
        for (const roleId of roleIds) {
          await tx`
            INSERT INTO user_roles (tenant_id, user_id, role_id)
            VALUES (${auth.context.tenantId}, ${user.id}, ${roleId})
          `;
        }
      }
    });

    await auditTenantMutation(req, auth.context, 'Created User', 'user', createdId, { email });

    return NextResponse.json({ data: { message: 'User created', id: createdId } }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
