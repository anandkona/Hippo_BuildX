import { NextResponse } from 'next/server';
import { createTenantSql, getSql } from '@/lib/db/client';
import { requireTenantApi, withAudit } from '@/lib/api/tenant-admin';

/**
 * GET returns a flat branding/settings object (UI-compatible).
 * PUT accepts flat body OR { settings: {...} }.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireTenantApi(req, { permission: 'settings.read' });
    if (!auth.ok) return auth.response;

    const sql = createTenantSql(auth.context.schemaName);
    const rows = await sql`
      SELECT key, value FROM tenant_settings ORDER BY key ASC
    `;

    const flat: Record<string, unknown> = {};
    for (const row of rows as Array<{ key: string; value: unknown }>) {
      flat[row.key] = row.value;
    }

    if (flat.profile && typeof flat.profile === 'object') {
      Object.assign(flat, flat.profile as object);
    }

    return NextResponse.json(flat);
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PUT = withAudit(
  { permission: 'settings.update', resource: 'settings', action: 'Updated Settings' },
  async ({ req, context, audit }) => {
    const body = await req.json();
    const settings =
      body.settings && typeof body.settings === 'object'
        ? (body.settings as Record<string, unknown>)
        : (body as Record<string, unknown>);

    const entries = Object.entries(settings).filter(([k]) => k !== 'settings');
    if (entries.length === 0) {
      return NextResponse.json({ error: 'No settings provided' }, { status: 400 });
    }

    const sql = getSql();
    await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      for (const [key, value] of entries) {
        await tx`
          INSERT INTO tenant_settings (tenant_id, key, value)
          VALUES (${context.tenantId}, ${key}, ${JSON.stringify(value)})
          ON CONFLICT (key) DO UPDATE
          SET value = ${JSON.stringify(value)}, updated_at = NOW()
        `;
      }
    });

    audit({ details: { keys: entries.map(([k]) => k) } });
    return NextResponse.json(Object.fromEntries(entries));
  }
);
