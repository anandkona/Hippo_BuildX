import { NextResponse } from 'next/server';
import { auditTenantMutation, requireTenantApi } from '@/lib/api/tenant-admin';
import { createTenantSql, getSql } from '@/lib/db/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const auth = await requireTenantApi(_req, { permission: 'users.read' });
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const { id } = await params;
    const sql = createTenantSql(context.schemaName);

    const [user] = await sql`
      SELECT id, email, name, status, last_login_at, created_at, updated_at
      FROM users
      WHERE id = ${id} AND deleted_at IS NULL
    `;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const roles = await sql`
      SELECT r.id, r.name, r.description
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ${id} AND r.deleted_at IS NULL
    `;

    return NextResponse.json({ data: { ...user, roles } });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const auth = await requireTenantApi(req, { permission: 'users.update' });
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const { id } = await params;
    const body = await req.json();
    const { name, email, status, roleIds } = body as {
      name?: string;
      email?: string;
      status?: string;
      roleIds?: string[];
    };

    const sql = createTenantSql(context.schemaName);

    const [existing] = await sql`
      SELECT id FROM users WHERE id = ${id} AND deleted_at IS NULL
    `;
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dbSql = getSql();

    await dbSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);

      if (name || email || status) {
        const setClauses: string[] = [];
        const queryValues: string[] = [];
        let paramIdx = 1;

        if (name) {
          setClauses.push(`name = $${paramIdx++}`);
          queryValues.push(name);
        }
        if (email) {
          setClauses.push(`email = $${paramIdx++}`);
          queryValues.push(email);
        }
        if (status) {
          setClauses.push(`status = $${paramIdx++}`);
          queryValues.push(status);
        }

        if (setClauses.length > 0) {
          setClauses.push('updated_at = NOW()');
          queryValues.push(id);
          await tx.unsafe(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIdx} AND deleted_at IS NULL`,
            queryValues
          );
        }
      }

      if (roleIds !== undefined) {
        await tx`DELETE FROM user_roles WHERE user_id = ${id}`;
        for (const roleId of roleIds) {
          await tx`
            INSERT INTO user_roles (tenant_id, user_id, role_id)
            VALUES (${context.tenantId}, ${id}, ${roleId})
          `;
        }
      }
    });

    await auditTenantMutation(req, context, 'Updated User', 'user', id);
    return NextResponse.json({ data: { message: 'User updated' } });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const auth = await requireTenantApi(_req, { permission: 'users.delete' });
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const { id } = await params;
    const sql = createTenantSql(context.schemaName);

    const [existing] = await sql`
      SELECT id FROM users WHERE id = ${id} AND deleted_at IS NULL
    `;
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await sql`
      UPDATE users
      SET deleted_at = NOW(), updated_at = NOW(), updated_by = ${context.userId || null}
      WHERE id = ${id}
    `;

    await auditTenantMutation(_req, context, 'Deleted User', 'user', id);
    return NextResponse.json({ data: { message: 'User deleted' } });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
