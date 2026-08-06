import { randomBytes, createHash } from 'crypto';
import { createTenantSql } from '@/lib/db/client';

export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a refresh token in the tenant's database schema.
 */
export async function createSession(
  schemaName: string,
  tenantId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  const token = generateRefreshToken();
  const tokenHash = hashToken(token);
  // Expires in 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const sql = createTenantSql(schemaName);

  await sql`
    INSERT INTO refresh_tokens (
      tenant_id, user_id, token_hash, expires_at, ip_address, user_agent
    ) VALUES (
      ${tenantId}, ${userId}, ${tokenHash}, ${expiresAt.toISOString()}, ${ipAddress || null}, ${userAgent || null}
    )
  `;

  return token; // Send the unhashed token to the client via HttpOnly cookie
}

/**
 * Revokes a specific session (Logout).
 */
export async function revokeSession(schemaName: string, token: string) {
  const tokenHash = hashToken(token);
  const sql = createTenantSql(schemaName);

  await sql`
    UPDATE refresh_tokens 
    SET revoked_at = NOW() 
    WHERE token_hash = ${tokenHash}
  `;
}
