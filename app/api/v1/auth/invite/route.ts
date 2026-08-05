import { NextResponse } from 'next/server';
import { getInvitePreview } from '@/lib/tenants/invite';

/** Public: preview invite details for the set-password page */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token')?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Invite token required' }, { status: 400 });
    }

    const preview = await getInvitePreview(token);
    if (!preview.ok) {
      return NextResponse.json({ error: preview.error }, { status: 400 });
    }

    return NextResponse.json({
      email: preview.email,
      name: preview.name,
      companyName: preview.companyName,
      workspace: preview.workspace,
      expiresAt: preview.expiresAt,
    });
  } catch (error) {
    console.error('Invite preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
