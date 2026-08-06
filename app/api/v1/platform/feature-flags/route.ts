import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { featureFlags } from '@/lib/db/schema/control-plane';
import { desc } from 'drizzle-orm';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';

export async function GET() {
  try {
    const db = getDb();
    const flags = await db.select().from(featureFlags).orderBy(desc(featureFlags.updatedAt));
    return NextResponse.json({ featureFlags: flags });
  } catch (error: any) {
    console.error('Failed to fetch feature flags:', error);
    return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { key, name, description, enabled, scope } = body;
    if (!key || !name) {
      return NextResponse.json({ error: 'Key and name are required' }, { status: 400 });
    }

    const db = getDb();
    const [created] = await db
      .insert(featureFlags)
      .values({
        key,
        name,
        description: description || null,
        enabled: enabled !== false,
        scope: scope || 'global',
      })
      .returning();

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Created Feature Flag',
      resource: 'feature_flag',
      resourceId: created.id,
      details: `Created flag ${key}`,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ featureFlag: created }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('unique')) {
      return NextResponse.json({ error: 'A flag with this key already exists' }, { status: 409 });
    }
    console.error('Failed to create feature flag:', error);
    return NextResponse.json({ error: 'Failed to create feature flag' }, { status: 500 });
  }
}
