import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { extractContextFromHeaders } from '@/lib/tenant-context';

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.schemaName || !context.roles.includes('tenant_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description, permissions } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const sql = createTenantSql(context.schemaName);

    const [role] = await sql`
      INSERT INTO roles (tenant_id, name, description, permissions, created_by)
      VALUES (${context.tenantId}, ${name}, ${description || null}, ${JSON.stringify(permissions || [])}, ${context.userId || null})
      RETURNING id, name, description, permissions
    `;

    return NextResponse.json({ message: 'Role created', role }, { status: 201 });
  } catch (error: any) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.schemaName || !context.roles.includes('tenant_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sql = createTenantSql(context.schemaName);
    const roles = await sql`SELECT id, name, description, permissions, is_system, created_at FROM roles`;

    return NextResponse.json({ roles });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
