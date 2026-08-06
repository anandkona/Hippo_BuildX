/**
 * Complete E2E against current master:
 * platform login → create tenant (invite set-password) → accept invite →
 * tenant login → admin screens → demo login → isolation/phase01 already separate.
 *
 * Usage: npx tsx scripts/e2e-complete.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });

import { chromium, type Page, type APIRequestContext } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = join(process.cwd(), 'screenshots', 'e2e-complete');
const PLATFORM_EMAIL = 'super@buildx.com';
const PLATFORM_PASSWORD = 'password123';
const DEMO_EMAIL = 'user@demo.com';
const DEMO_PASSWORD = 'password123';

mkdirSync(OUT, { recursive: true });

let passed = 0;
let failed = 0;

function ok(cond: unknown, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.log(`  ❌ ${msg}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function ss(page: Page, name: string) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
  console.log(`  📷 ${name}`);
}

async function loginCentral(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

async function apiLoginPlatform(request: APIRequestContext) {
  const res = await request.post(`${BASE}/api/v1/auth/session`, {
    data: { email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD },
  });
  const body = await res.json();
  assert(res.ok(), `platform session login failed: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  console.log(`\n▶ Complete E2E → ${BASE}\n`);
  console.log(`  (repo default branch is master; already pulled)\n`);

  // Health
  const healthRes = await fetch(`${BASE}/api/v1/health`);
  assert(healthRes.ok, 'health endpoint ok');
  ok(true, 'GET /api/v1/health');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const request = context.request;

  try {
    // ── 1. Platform login (UI) ──
    console.log('\n── 1. Platform central login ──');
    await loginCentral(page, PLATFORM_EMAIL, PLATFORM_PASSWORD);
    await page.waitForURL((u) => u.pathname.startsWith('/platform') && !u.pathname.includes('login'), {
      timeout: 45000,
    });
    ok(!page.url().includes('/login'), `platform home: ${page.url()}`);
    await ss(page, '01-platform-home');

    // ── 2. Create tenant via API (invite set-password) ──
    console.log('\n── 2. Provision tenant + invite token ──');
    await apiLoginPlatform(request);

    const stamp = Date.now().toString(36).slice(-7);
    const slug = `e2e${stamp}`;
    const adminEmail = `buyer.${stamp}@example.com`;
    const company = `E2E Co ${stamp}`;

    const createRes = await request.post(`${BASE}/api/v1/platform/tenants`, {
      data: {
        name: company,
        slug,
        adminName: 'E2E Buyer',
        adminEmail,
        sendInvite: true,
        industry: 'Construction',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
      },
      timeout: 120000,
    });
    const created = await createRes.json();
    assert(createRes.status() === 201 || createRes.status() === 202, `create tenant: ${JSON.stringify(created)}`);
    ok(created.tenant?.status === 'active' || created.tenant?.id, `tenant created status=${created.tenant?.status}`);
    ok(created.credentials?.mustSetPassword === true, 'credentials.mustSetPassword=true');
    ok(created.credentials?.adminPassword === null, 'no password returned when invite on');

    const inviteUrl: string | undefined = created.invite?.inviteUrl;
    ok(Boolean(inviteUrl), `inviteUrl present (sent=${created.invite?.sent} error=${created.invite?.error || '-'})`);
    assert(inviteUrl, `missing inviteUrl: ${JSON.stringify(created.invite)}`);
    await ss(page, '02-after-create-api');

    // ── 3. Accept invite / set password (UI) ──
    console.log('\n── 3. Buyer sets password via /invite ──');
    const buyerPassword = `E2e!${stamp}Pass`;
    await context.clearCookies();
    await page.goto(inviteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector(`text=${slug}`, { timeout: 30000 });
    await page.waitForSelector(`text=${adminEmail}`, { timeout: 15000 });
    const preview = await page.textContent('body');
    ok(preview?.includes(adminEmail) && preview?.includes(slug), 'invite preview shows workspace/email');
    await ss(page, '03-invite-preview');

    await page.locator('input[type="password"]').nth(0).fill(buyerPassword);
    await page.locator('input[type="password"]').nth(1).fill(buyerPassword);
    await page.getByRole('button', { name: /Set password/i }).click();
    await page.waitForURL((u) => u.pathname.includes('/dashboard') || u.pathname.includes('/admin'), {
      timeout: 45000,
    });
    ok(!page.url().includes('/invite'), `after accept → ${page.url()}`);
    await ss(page, '04-after-accept');

    // ── 4. Logout and login with new password ──
    console.log('\n── 4. Tenant login with buyer password ──');
    await context.clearCookies();
    await loginCentral(page, adminEmail, buyerPassword);
    await page.waitForURL((u) => u.pathname.includes('/dashboard') || u.pathname.includes('/admin'), {
      timeout: 45000,
    });
    ok(!page.url().includes('/platform'), 'buyer lands on tenant app, not platform');
    await ss(page, '05-tenant-dashboard');

    for (const path of ['/admin/users', '/admin/roles', '/admin/settings']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const t = await page.textContent('body');
      ok(Boolean(t && t.length > 40), `${path} renders`);
      await ss(page, `06-${path.replace(/\//g, '-')}`);
    }

    // ── 5. Demo tenant login ──
    console.log('\n── 5. Demo tenant login ──');
    await context.clearCookies();
    await loginCentral(page, DEMO_EMAIL, DEMO_PASSWORD);
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 45000 });
    ok(page.url().includes('/dashboard') || page.url().includes('/admin'), `demo login → ${page.url()}`);
    await ss(page, '07-demo-home');

    // ── 6. Platform pages smoke ──
    console.log('\n── 6. Platform pages smoke ──');
    await context.clearCookies();
    await loginCentral(page, PLATFORM_EMAIL, PLATFORM_PASSWORD);
    await page.waitForURL((u) => u.pathname.startsWith('/platform'), { timeout: 45000 });
    for (const path of ['/platform', '/platform/tenants', '/platform/plans', '/platform/subscriptions', '/platform/health']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const t = await page.textContent('body');
      ok(Boolean(t && t.length > 40 && !t.includes('Internal Server Error')), `${path} ok`);
      await ss(page, `08-${path.replace(/\//g, '-') || 'root'}`);
    }

    // ── 7. Invite token cannot be reused ──
    console.log('\n── 7. Invite reuse rejected ──');
    await context.clearCookies();
    await page.goto(inviteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    const reuseBody = await page.textContent('body');
    ok(
      Boolean(reuseBody && (reuseBody.includes('already used') || reuseBody.includes('not available') || reuseBody.includes('expired') || reuseBody.includes('Invalid'))),
      'used invite rejected on UI'
    );
    await ss(page, '09-invite-reuse');

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    if (failed > 0) process.exitCode = 1;
    else console.log('✅ Complete E2E passed\n');
  } catch (err) {
    console.error('\n❌ E2E failed:', err);
    await ss(page, 'error-state').catch(() => undefined);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
