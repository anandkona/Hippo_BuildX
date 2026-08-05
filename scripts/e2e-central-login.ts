/**
 * Headed E2E: central login (platform + tenant) and create-tenant → tenant login.
 *
 * Usage: npx tsx scripts/e2e-central-login.ts
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = join(process.cwd(), 'screenshots', 'e2e-central');
const PLATFORM_EMAIL = 'super@buildx.com';
const PLATFORM_PASSWORD = 'password123';
const DEMO_WORKSPACE = 'demo';
const DEMO_EMAIL = 'user@demo.com';
const DEMO_PASSWORD = 'password123';

mkdirSync(OUT, { recursive: true });

async function ss(page: Page, name: string) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
  console.log(`  📷 ${name}`);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
}

async function main() {
  console.log(`\n▶ Central login E2E (headed) → ${BASE}\n`);
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // --- 1. Unified login UI has no Super Admin banner ---
    await clearSession(page);
    const body = await page.textContent('body');
    assert(!body?.includes('Platform Administration'), 'No Platform Administration title');
    assert(!body?.includes('Super Admin Access'), 'No Super Admin Access subtitle');
    assert(!body?.includes('Super Admin Only'), 'No Super Admin Only badge');
    assert(body?.includes('Sign in'), 'Shows Sign in title');
    await ss(page, '01-central-login');

    // --- 2. Platform login (no workspace) → /platform ---
    await page.fill('#email', PLATFORM_EMAIL);
    await page.fill('#password', PLATFORM_PASSWORD);
    await page.fill('#workspace', '');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/platform') && !u.pathname.includes('login'), {
      timeout: 30000,
    });
    assert(page.url().includes('/platform'), 'Platform redirect');
    await ss(page, '02-platform-home');

    // --- 3. Create tenant with minimal fields ---
    const slug = `e2e${Date.now().toString(36).slice(-6)}`;
    const adminEmail = `admin@${slug}.test`;
    const adminPassword = 'password123';

    await page.goto(`${BASE}/platform/tenants`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: /Provision Tenant/i }).click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="e.g. Skyline Construction"]').fill(`E2E ${slug}`);
    // slug auto-fills; override
    const slugInput = page.locator('input[placeholder="skyline"]');
    await slugInput.fill(slug);
    await page.locator('input[placeholder="admin@skyline.example.com"]').fill(adminEmail);
    await page.locator('input[placeholder="password123"]').fill(adminPassword);
    await ss(page, '03-create-tenant-minimal');
    await page.getByRole('button', { name: /Provision Schema/i }).click();

    await page.waitForSelector('[data-testid="tenant-credentials"]', { timeout: 60000 });
    const credText = await page.locator('[data-testid="tenant-credentials"]').textContent();
    assert(credText?.includes(slug), 'Credentials show workspace');
    assert(credText?.includes(adminEmail), 'Credentials show admin email');
    await ss(page, '04-credentials-modal');
    await page.getByRole('button', { name: /^Done$/i }).click();

    // --- 4. Logout platform by clearing cookies, login as new tenant ---
    await clearSession(page);
    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    await page.fill('#workspace', slug);
    await ss(page, '05-tenant-login-filled');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.includes('/dashboard') || u.pathname.includes('/admin'), {
      timeout: 30000,
    });
    assert(!page.url().includes('/platform'), 'Tenant did not land on platform');
    await ss(page, '06-tenant-dashboard');

    // --- 5. Demo tenant still works ---
    await clearSession(page);
    await page.fill('#email', DEMO_EMAIL);
    await page.fill('#password', DEMO_PASSWORD);
    await page.fill('#workspace', DEMO_WORKSPACE);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    assert(page.url().includes('/dashboard') || page.url().includes('/admin'), 'Demo tenant login');
    await ss(page, '07-demo-tenant');

    // --- 6. /platform/login redirects to central login ---
    await clearSession(page);
    await page.goto(`${BASE}/platform/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForURL((u) => u.pathname === '/login', { timeout: 15000 });
    assert(page.url().includes('/login'), 'platform/login redirects to /login');
    await ss(page, '08-platform-login-redirect');

    console.log('\n✅ Central login E2E passed\n');
  } catch (err) {
    console.error('\n❌ E2E failed:', err);
    await ss(page, 'error-state').catch(() => undefined);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
