import { getDb } from '@/lib/db/client';
import { platformSessions } from '@/lib/db/schema/control-plane';
import { and, eq, isNull } from 'drizzle-orm';
import { generateRefreshToken, hashToken } from '@/lib/auth/session';

/**
 * Create a platform refresh session (public.platform_sessions).
 */
export async function createPlatformSession(
  platformUserId: string,
  ipAddress?: string,
  userAgent?: string
) {
  const token = generateRefreshToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const db = getDb();

  await db.insert(platformSessions).values({
    platformUserId,
    tokenHash,
    expiresAt,
    ipAddress: ipAddress || null,
    userAgent: userAgent ? userAgent.slice(0, 255) : null,
  });

  return token;
}

export async function revokePlatformSession(token: string) {
  const db = getDb();
  const tokenHash = hashToken(token);
  await db
    .update(platformSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(platformSessions.tokenHash, tokenHash), isNull(platformSessions.revokedAt)));
}

export async function findValidPlatformSession(token: string) {
  const db = getDb();
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(platformSessions)
    .where(and(eq(platformSessions.tokenHash, tokenHash), isNull(platformSessions.revokedAt)))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}
