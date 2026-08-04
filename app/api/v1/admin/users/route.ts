import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { hashPassword } from '@/lib/auth/crypto';

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.schemaName || !context.roles.includes('tenant_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, name, password, roleIds } = await req.json();
    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const sql = createTenantSql(context.schemaName);

    // Use a transaction for creating user and assigning roles
    await sql.begin(async (tx) => {
      const [user] = await tx`
        INSERT INTO users (tenant_id, email, name, password_hash, created_by)
        VALUES (${context.tenantId}, ${email}, ${name}, ${hashedPassword}, ${context.userId || null})
        RETURNING id
      `;

      if (roleIds && roleIds.length > 0) {
        for (const roleId of roleIds) {
          await tx`
            INSERT INTO user_roles (tenant_id, user_id, role_id)
            VALUES (${context.tenantId}, ${user.id}, ${roleId})
          `;
        }
      }
    });

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
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
    const users = await sql`SELECT id, email, name, status, created_at FROM users`;

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
