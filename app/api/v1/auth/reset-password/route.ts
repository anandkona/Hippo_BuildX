import { NextResponse } from 'next/server';
import { getPasswordResetPreview, resetPasswordWithToken } from '@/lib/auth/password-reset';

/** Public: preview reset token */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token')?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Reset token required' }, { status: 400 });
    }

    const preview = await getPasswordResetPreview(token);
    if (!preview.ok) {
      return NextResponse.json({ error: preview.error }, { status: 400 });
    }

    return NextResponse.json({
      email: preview.email,
      name: preview.name,
      scope: preview.scope,
      expiresAt: preview.expiresAt,
    });
  } catch (error) {
    console.error('Reset preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Public: set new password from reset token */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token || '').trim();
    const password = String(body.password || '');

    if (!token) {
      return NextResponse.json({ error: 'Reset token required' }, { status: 400 });
    }

    const result = await resetPasswordWithToken({ token, password });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      message: 'Password updated successfully. You can sign in now.',
      email: result.email,
      scope: result.scope,
      redirectTo: result.redirectTo,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
