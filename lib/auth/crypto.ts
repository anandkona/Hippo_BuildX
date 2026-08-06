import * as argon2 from 'argon2';

/**
 * Hashes a plain-text password using Argon2id.
 * Argon2id is highly resistant to both GPU and side-channel attacks.
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verifies a plain-text password against a stored Argon2 hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch { 
    return false; // Verification failed or hash was malformed
  }
}
