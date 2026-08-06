import { NextResponse } from 'next/server';
import { requireTenantApi, withAudit } from '@/lib/api/tenant-admin';
import { createTenantSql } from '@/lib/db/client';

interface ChannelConfig {
  apiKey?: string;
  senderNumber?: string;
  webhookUrl?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = ['apiKey', 'senderNumber', 'smtpPass', 'smtpUser', 'webhookUrl'] as const;

function maskConfig(config: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (SENSITIVE_KEYS.includes(k as typeof SENSITIVE_KEYS[number]) && typeof v === 'string') {
      masked[k] = '****';
    } else {
      masked[k] = v;
    }
  }
  return masked;
}

export async function GET(req: Request) {
  try {
    const auth = await requireTenantApi(req, { permission: 'channels.read' });
    if (!auth.ok) return auth.response;
    const context = auth.context;

    const sql = createTenantSql(context.schemaName);
    const rows = await sql`
      SELECT id, tenant_id, channel, config, is_active, created_at, updated_at
      FROM tenant_channels
      ORDER BY channel ASC
    `;

    const safeRows = rows.map((r) => ({
      ...r,
      config: maskConfig(r.config as Record<string, unknown>),
    }));

    return NextResponse.json({ data: safeRows });
  } catch (error) {
    console.error('Get channels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAudit(
  { permission: 'channels.update', resource: 'channel', action: 'Upserted Channel' },
  async ({ req, context, audit }) => {
    const body = await req.json();
    const { channel, config, is_active } = body as {
      channel?: string;
      config?: ChannelConfig;
      is_active?: boolean;
    };

    if (!channel) {
      return NextResponse.json({ error: 'channel is required' }, { status: 400 });
    }

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'config must be an object' }, { status: 400 });
    }

    const sql = createTenantSql(context.schemaName);

    const [existing] = await sql`
      SELECT id FROM tenant_channels
      WHERE channel = ${channel} AND tenant_id = ${context.tenantId}
    `;

    if (existing) {
      await sql`
        UPDATE tenant_channels
        SET config = ${JSON.stringify(config)}, is_active = ${is_active ?? true}, updated_at = NOW()
        WHERE id = ${existing.id}
      `;
      audit({
        action: 'Updated Channel',
        resourceId: existing.id,
        details: { channel },
      });
      return NextResponse.json({ data: { message: 'Channel updated' } });
    }

    const [created] = await sql`
      INSERT INTO tenant_channels (tenant_id, channel, config, is_active)
      VALUES (${context.tenantId}, ${channel}, ${JSON.stringify(config)}, ${is_active ?? true})
      RETURNING id
    `;

    audit({
      action: 'Created Channel',
      resourceId: created?.id,
      details: { channel },
    });
    return NextResponse.json({ data: { message: 'Channel created' } }, { status: 201 });
  }
);
