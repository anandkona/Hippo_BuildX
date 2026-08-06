import { NextResponse } from 'next/server';
import { pingDatabase } from '@/lib/db/client';
// TODO: Add Redis ping once BullMQ is fully wired up in Next.js side

export async function GET() {
  const isDbReady = await pingDatabase();
  
  if (isDbReady) {
    return NextResponse.json({ status: 'ready', database: 'ok', timestamp: new Date().toISOString() });
  }

  return NextResponse.json({ status: 'error', database: isDbReady ? 'ok' : 'failed' }, { status: 503 });
}
