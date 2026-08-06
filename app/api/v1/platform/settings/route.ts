import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { platformSettings } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(platformSettings);
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    // Accept either { section, value } or full { settings: { general: {...}, ... } }
    const db = getDb();
    const updatedKeys: string[] = [];

    if (body.section && body.value !== undefined) {
      const [existing] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, body.section));
      if (existing) {
        await db
          .update(platformSettings)
          .set({ value: body.value, updatedAt: new Date() })
          .where(eq(platformSettings.key, body.section));
      } else {
        await db.insert(platformSettings).values({ key: body.section, value: body.value });
      }
      updatedKeys.push(body.section);
    } else if (body.settings && typeof body.settings === 'object') {
      for (const [key, value] of Object.entries(body.settings)) {
        const [existing] = await db
          .select()
          .from(platformSettings)
          .where(eq(platformSettings.key, key));
        if (existing) {
          await db
            .update(platformSettings)
            .set({ value: value as Record<string, unknown>, updatedAt: new Date() })
            .where(eq(platformSettings.key, key));
        } else {
          await db.insert(platformSettings).values({ key, value: value as Record<string, unknown> });
        }
        updatedKeys.push(key);
      }
    } else {
      return NextResponse.json({ error: 'Provide section+value or settings object' }, { status: 400 });
    }

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Updated Settings',
      resource: 'settings',
      details: `Updated settings: ${updatedKeys.join(', ')}`,
      ipAddress: getClientIp(req),
    });

    const rows = await db.select().from(platformSettings);
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
