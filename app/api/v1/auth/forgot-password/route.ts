import { NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/auth/password-reset';

/** Public: request password reset email (platform or tenant) */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await requestPasswordReset({ email, req });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      message: result.message,
      ...(result.debugResetUrl ? { debugResetUrl: result.debugResetUrl } : {}),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
