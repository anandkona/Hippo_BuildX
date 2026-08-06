import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { platformUsers } from '@/lib/db/schema/control-plane';
import { eq, desc } from 'drizzle-orm';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { hashPassword } from '@/lib/auth/crypto';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';

function sanitize(user: typeof platformUsers.$inferSelect) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function GET() {
  try {
    const db = getDb();
    const users = await db.select().from(platformUsers).orderBy(desc(platformUsers.createdAt));
    return NextResponse.json({ users: users.map(sanitize) });
  } catch (error: any) {
    console.error('Failed to fetch platform users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role } = body;
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const db = getDb();
    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(platformUsers)
      .values({
        name,
        email,
        passwordHash,
        role: role || 'platform_admin',
        isActive: true,
      })
      .returning();

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Created Platform User',
      resource: 'platform_user',
      resourceId: created.id,
      details: `Created user ${email} with role ${created.role}`,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ user: sanitize(created) }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('unique')) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    console.error('Failed to create platform user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
