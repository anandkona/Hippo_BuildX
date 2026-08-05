import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { platformUsers } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/crypto';
import { signAccessToken } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const db = getDb();
    
    // 1. Find the platform user
    const [user] = await db.select().from(platformUsers).where(eq(platformUsers.email, email));
    
    if (!user) {
      // Fake delay to prevent timing attacks
      await verifyPassword('dummy', 'dummyhash');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    // 2. Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Issue Access Token (JWT)
    const roles = [user.role || 'platform_admin', 'super_admin'];
    const accessToken = await signAccessToken({
      userId: user.id,
      tenantId: 'PLATFORM',
      schemaName: 'public',
      roles,
      isPlatformAdmin: true,
    });

    // 4. Update last login
    await db.update(platformUsers).set({ lastLoginAt: new Date() }).where(eq(platformUsers.id, user.id));

    // 5. Set HttpOnly Cookie
    const response = NextResponse.json({
      message: 'Login successful',
      scope: 'platform',
      roles,
      redirectTo: '/platform',
    });
    
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Platform login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
