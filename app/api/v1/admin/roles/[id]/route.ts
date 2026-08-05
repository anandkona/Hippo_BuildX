import { NextResponse } from 'next/server';
import { auditTenantMutation, requireTenantApi } from '@/lib/api/tenant-admin';
import { createTenantSql } from '@/lib/db/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const auth = await requireTenantApi(_req, { permission: 'roles.read' });
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const { id } = await params;
    const sql = createTenantSql(context.schemaName);

    const [role] = await sql`
      SELECT id, name, description, permissions, is_system, created_at, updated_at
      FROM roles
      WHERE id = ${id} AND deleted_at IS NULL
    `;

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const permissionRows = await sql`
      SELECT DISTINCT
        jsonb_array_elements_text(r.permissions) AS permission
      FROM roles r
      WHERE r.id = ${id} AND r.deleted_at IS NULL
    `;

    return NextResponse.json({
      data: {
        ...role,
        permissions: permissionRows.map((p: Record<string, unknown>) => String(p.permission)),
      },
    });
  } catch (error) {
    console.error('Get role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const auth = await requireTenantApi(req, { permission: 'roles.update' });
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const { id } = await params;
    const body = await req.json();
    const { name, description, permissions } = body as {
      name?: string;
      description?: string;
      permissions?: string[];
    };

    const sql = createTenantSql(context.schemaName);

    const [existing] = await sql`
      SELECT id, is_system FROM roles WHERE id = ${id} AND deleted_at IS NULL
    `;
    if (!existing) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const setClauses: string[] = [];
    const queryValues: unknown[] = [];

    if (name !== undefined) {
      setClauses.push('name');
      queryValues.push(name);
    }
    if (description !== undefined) {
      setClauses.push('description');
      queryValues.push(description);
    }
    if (permissions !== undefined) {
      setClauses.push('permissions');
      queryValues.push(JSON.stringify(permissions));
    }

    if (setClauses.length > 0) {
      const assignment = setClauses.map((f, i) => `${f} = $${i + 1}`).join(', ');
      queryValues.push(id);
      await sql.unsafe(
        `UPDATE roles SET ${assignment}, updated_at = NOW() WHERE id = $${setClauses.length + 1} AND deleted_at IS NULL`,
        queryValues
      );
    }

    return NextResponse.json({ data: { message: 'Role updated' } });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const auth = await requireTenantApi(_req, { permission: 'roles.delete' });
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const { id } = await params;
    const sql = createTenantSql(context.schemaName);

    const [existing] = await sql`
      SELECT id, is_system FROM roles WHERE id = ${id} AND deleted_at IS NULL
    `;
    if (!existing) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system role' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE roles
      SET deleted_at = NOW(), updated_at = NOW(), updated_by = ${context.userId || null}
      WHERE id = ${id}
    `;

    return NextResponse.json({ data: { message: 'Role deleted' } });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
