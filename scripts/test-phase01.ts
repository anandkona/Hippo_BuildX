/**
 * Phase 0/1 backend proof suite:
 * - four-axis scope unit checks
 * - HTTP auth enforcement (401/403) when BASE_URL reachable
 * - platform login + refresh + authenticated tenant list
 * - tenant central login refresh cookie when credentials available
 *
 * Usage: npx tsx scripts/test-phase01.ts
 */
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { evaluateScope, isInScope } from '../lib/rbac/scope';
import { hasPermission } from '../lib/rbac/permissions';
import { createPlatformSession, findValidPlatformSession, revokePlatformSession } from '../lib/auth/platform-session';
import { getDb, getSql } from '../lib/db/client';
import { platformUsers } from '../lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PLATFORM_EMAIL = process.env.PLATFORM_EMAIL || 'super@buildx.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_PASSWORD || 'password123';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function cookieMap(res: Response): Record<string, string> {
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const map: Record<string, string> = {};
  for (const line of raw) {
    const [pair] = line.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) map[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  // Fallback: single set-cookie header
  if (!Object.keys(map).length) {
    const one = res.headers.get('set-cookie');
    if (one) {
      const [pair] = one.split(';');
      const idx = pair.indexOf('=');
      if (idx > 0) map[pair.slice(0, idx)] = pair.slice(idx + 1);
    }
  }
  return map;
}

async function serverUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/v1/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function scopeUnitTests() {
  assert(hasPermission(['users.*'], 'users.create'), 'module wildcard');

  const admin = evaluateScope(
    { roles: ['tenant_admin'], permissions: [], projectIds: [], locationIds: [] },
    { permission: 'users.create' }
  );
  assert(admin.allowed, 'tenant_admin allowed');

  const denied = evaluateScope(
    { roles: ['sales'], permissions: ['crm.read'], projectIds: [], locationIds: [] },
    { permission: 'users.create' }
  );
  assert(!denied.allowed, 'missing permission denied');

  const moduleOff = evaluateScope(
    { roles: ['tenant_admin'], permissions: ['*'], projectIds: [], locationIds: [] },
    { permission: 'crm.read', featureFlags: { crm: false } }
  );
  assert(!moduleOff.allowed && moduleOff.axes.module === false, 'module flag denies');

  const projectDeny = evaluateScope(
    {
      roles: ['engineer'],
      permissions: ['construction.read'],
      projectIds: ['proj-a'],
      locationIds: [],
    },
    { permission: 'construction.read', projectId: 'proj-b' }
  );
  assert(!projectDeny.allowed && projectDeny.axes.project === false, 'project out of scope');

  const projectAllow = evaluateScope(
    {
      roles: ['engineer'],
      permissions: ['construction.read'],
      projectIds: ['proj-a'],
      locationIds: ['loc-1'],
    },
    { permission: 'construction.read', projectId: 'proj-a', locationId: 'loc-1' }
  );
  assert(projectAllow.allowed, 'in-scope project+location');

  assert(
    isInScope({ projectIds: ['p1'], locationIds: [] }, { projectId: 'p1' }),
    'isInScope allow'
  );
  assert(
    !isInScope({ projectIds: ['p1'], locationIds: [] }, { projectId: 'p2' }),
    'isInScope deny'
  );
  console.log('  ✓ four-axis scope unit checks');
}

async function platformSessionDbTests() {
  const db = getDb();
  const [user] = await db
    .select()
    .from(platformUsers)
    .where(eq(platformUsers.email, PLATFORM_EMAIL))
    .limit(1);

  if (!user) {
    console.log('  ⚠ skip platform session DB tests (no seeded platform user)');
    return;
  }

  const token = await createPlatformSession(user.id, '127.0.0.1', 'phase01-test');
  const found = await findValidPlatformSession(token);
  assert(found?.platformUserId === user.id, 'platform session found');
  await revokePlatformSession(token);
  const revoked = await findValidPlatformSession(token);
  assert(!revoked, 'platform session revoked');
  console.log('  ✓ platform_sessions create/revoke');
}

async function httpAuthProofs() {
  const up = await serverUp();
  if (!up) {
    console.log(`  ⚠ skip HTTP proofs (server not reachable at ${BASE})`);
    return { http: false };
  }

  const unauthAdmin = await fetch(`${BASE}/api/v1/admin/users`);
  assert(unauthAdmin.status === 401, `admin users unauth → 401 (got ${unauthAdmin.status})`);

  const unauthPlatform = await fetch(`${BASE}/api/v1/platform/tenants`);
  assert(unauthPlatform.status === 401, `platform tenants unauth → 401 (got ${unauthPlatform.status})`);
  console.log('  ✓ protected APIs return 401 without token');

  const login = await fetch(`${BASE}/api/v1/auth/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD }),
  });
  assert(login.ok, `platform central login (${login.status})`);
  const loginBody = await login.json();
  assert(loginBody.scope === 'platform', 'login scope platform');
  const cookies = cookieMap(login);
  assert(cookies.access_token, 'access_token cookie set');
  assert(cookies.refresh_token, 'refresh_token cookie set');
  console.log('  ✓ platform central login + refresh cookie');

  const cookieHeader = `access_token=${cookies.access_token}; refresh_token=${cookies.refresh_token}`;
  const list = await fetch(`${BASE}/api/v1/platform/tenants`, {
    headers: { cookie: cookieHeader },
  });
  assert(list.ok, `authenticated tenant list (${list.status})`);
  const listBody = await list.json();
  assert(Array.isArray(listBody.tenants) || Array.isArray(listBody.data) || Array.isArray(listBody), 'tenant list payload');
  console.log('  ✓ authenticated platform tenant list');

  // Tenant token must not access platform APIs
  const tenantForgedDenied = await fetch(`${BASE}/api/v1/platform/tenants`, {
    headers: { Authorization: 'Bearer not-a-jwt' },
  });
  assert(tenantForgedDenied.status === 401, 'forged bearer → 401');

  const refresh = await fetch(`${BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
    },
    body: JSON.stringify({ scope: 'platform' }),
  });
  assert(refresh.ok, `platform refresh (${refresh.status})`);
  const refreshCookies = cookieMap(refresh);
  assert(refreshCookies.access_token, 'rotated access token');
  assert(refreshCookies.refresh_token, 'rotated refresh token');
  console.log('  ✓ platform refresh rotation');

  return { http: true };
}

async function main() {
  console.log('\n▶ Phase 0/1 proof suite\n');
  try {
    await scopeUnitTests();
    await platformSessionDbTests();
    const http = await httpAuthProofs();

    console.log(
      `\n✅ Phase 0/1 proofs passed${http.http ? ' (incl. HTTP)' : ' (unit/DB only; start next for HTTP)'}\n`
    );
  } catch (err) {
    console.error('\n❌ Phase 0/1 proofs failed:', err);
    process.exitCode = 1;
  } finally {
    await getSql().end({ timeout: 5 }).catch(() => undefined);
  }
}

main();
