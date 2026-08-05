import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { platformUsers } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/crypto';
import { signAccessToken } from '@/lib/auth/jwt';
import { createPlatformSession } from '@/lib/auth/platform-session';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const db = getDb();

    const [user] = await db.select().from(platformUsers).where(eq(platformUsers.email, email));

    if (!user) {
      await verifyPassword('dummy', 'dummyhash');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const roles = [user.role || 'platform_admin', 'super_admin'];
    const accessToken = await signAccessToken({
      userId: user.id,
      tenantId: 'PLATFORM',
      schemaName: 'public',
      roles,
      isPlatformAdmin: true,
    });

    await db.update(platformUsers).set({ lastLoginAt: new Date() }).where(eq(platformUsers.id, user.id));

    const refreshToken = await createPlatformSession(
      user.id,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    const response = NextResponse.json({
      message: 'Login successful',
      scope: 'platform',
      roles,
      redirectTo: '/platform',
    });

    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Platform login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
