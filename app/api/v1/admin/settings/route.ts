import { NextResponse } from 'next/server';
import { createTenantSql, getSql } from '@/lib/db/client';
import { extractContextFromHeaders } from '@/lib/tenant-context';

function requireAdmin(headers: Headers) {
  const context = extractContextFromHeaders(headers);
  if (!context.schemaName || !context.roles?.includes('tenant_admin')) {
    return null;
  }
  return context;
}

export async function GET(req: Request) {
  try {
    const context = requireAdmin(req.headers);
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sql = createTenantSql(context.schemaName);
    const rows = await sql`
      SELECT id, tenant_id, key, value, created_at, updated_at
      FROM tenant_settings
      ORDER BY key ASC
    `;

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const context = requireAdmin(req.headers);
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const settings = body.settings as Record<string, unknown> | undefined;

    if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
      return NextResponse.json(
        { error: 'settings must be a non-empty object of key-value pairs' },
        { status: 400 }
      );
    }

    const sql = getSql();

    await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      for (const [key, value] of Object.entries(settings)) {
        await tx`
          INSERT INTO tenant_settings (tenant_id, key, value)
          VALUES (${context.tenantId}, ${key}, ${JSON.stringify(value)})
          ON CONFLICT (key) DO UPDATE
          SET value = ${JSON.stringify(value)}, updated_at = NOW()
        `;
      }
    });

    return NextResponse.json({ data: { message: 'Settings updated' } });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
