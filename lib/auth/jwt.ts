import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super_secret_fallback_key_for_development_only_12345!'
);

export interface TokenPayload {
  userId: string;
  tenantId: string;
  schemaName: string;
  roles: string[];
  permissions?: string[];
  projectIds?: string[];
  locationIds?: string[];
  isPlatformAdmin?: boolean;
}

/**
 * Signs a new short-lived JWT (e.g. 15 minutes) for the user.
 */
export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT and extracts the payload.
 * Useful in Edge Middleware.
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}
