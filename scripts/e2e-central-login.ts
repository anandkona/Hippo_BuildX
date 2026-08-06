/**
 * Headed E2E: central login UI (visible fields) + platform/tenant login without workspace.
 *
 * Usage: npm run test:e2e:login
 */
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = join(process.cwd(), 'screenshots', 'e2e-central');
const PLATFORM_EMAIL = 'super@buildx.com';
const PLATFORM_PASSWORD = 'password123';
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

async function assertLoginFieldsVisible(page: Page) {
  const emailBox = await page.locator('#email').boundingBox();
  const passwordBox = await page.locator('#password').boundingBox();
  assert(emailBox && emailBox.width > 100 && emailBox.height > 20, 'Email field visible with size');
  assert(passwordBox && passwordBox.width > 100 && passwordBox.height > 20, 'Password field visible with size');

  const workspaceCount = await page.locator('#workspace').count();
  assert(workspaceCount === 0, 'Workspace field removed');

  const body = await page.textContent('body');
  assert(!body?.includes('Workspace'), 'No Workspace label in UI');
  assert(!body?.includes('Platform Administration'), 'No Platform Administration title');
  assert(!body?.includes('Super Admin Access'), 'No Super Admin Access subtitle');
  assert(body?.includes('Email'), 'Email label present');
  assert(body?.includes('Password'), 'Password label present');

  // Contrast: computed colors must not collapse to transparent / same as card
  const styles = await page.evaluate(() => {
    const email = document.querySelector('#email') as HTMLInputElement | null;
    const password = document.querySelector('#password') as HTMLInputElement | null;
    const card = document.querySelector('[data-testid="central-login"]') as HTMLElement | null;
    const es = email ? getComputedStyle(email) : null;
    const ps = password ? getComputedStyle(password) : null;
    const cs = card ? getComputedStyle(card) : null;
    return {
      emailColor: es?.color,
      emailBg: es?.backgroundColor,
      passwordColor: ps?.color,
      passwordBg: ps?.backgroundColor,
      cardBg: cs?.backgroundColor,
      emailOpacity: es?.opacity,
      passwordOpacity: ps?.opacity,
    };
  });

  assert(styles.emailOpacity === '1', 'Email opacity visible');
  assert(styles.passwordOpacity === '1', 'Password opacity visible');
  assert(styles.cardBg?.includes('255') || styles.cardBg === 'rgb(255, 255, 255)', 'White card background');
  assert(styles.emailBg !== 'rgba(0, 0, 0, 0)', 'Email input has background');
  assert(styles.passwordBg !== 'rgba(0, 0, 0, 0)', 'Password input has background');
  console.log('  ✓ Login fields visible + contrast OK', styles);
}

async function main() {
  console.log(`\n▶ Central login E2E (headed) → ${BASE}\n`);
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await clearSession(page);
    await assertLoginFieldsVisible(page);
    await ss(page, '01-login-fields-visible');

    // Platform login (email + password only)
    await page.fill('#email', PLATFORM_EMAIL);
    await page.fill('#password', PLATFORM_PASSWORD);
    await ss(page, '02-platform-filled');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/platform') && !u.pathname.includes('login'), {
      timeout: 30000,
    });
    await ss(page, '03-platform-home');

    // Create tenant → credentials → login as that tenant (no workspace field)
    const slug = `e2e${Date.now().toString(36).slice(-6)}`;
    const adminEmail = `admin@${slug}.test`;
    const adminPassword = 'password123';

    await page.goto(`${BASE}/platform/tenants`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: /Provision Tenant/i }).click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="e.g. Skyline Construction"]').fill(`E2E ${slug}`);
    await page.locator('input[placeholder="skyline"]').fill(slug);
    await page.locator('input[placeholder="admin@skyline.example.com"]').fill(adminEmail);
    await page.locator('input[placeholder="password123"]').fill(adminPassword);
    await ss(page, '04-create-tenant');
    await page.getByRole('button', { name: /Provision Schema/i }).click();
    await page.waitForSelector('[data-testid="tenant-credentials"]', { timeout: 60000 });
    await ss(page, '05-credentials');
    await page.getByRole('button', { name: /^Done$/i }).click();

    await clearSession(page);
    await assertLoginFieldsVisible(page);
    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    await ss(page, '06-new-tenant-login');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.includes('/dashboard') || u.pathname.includes('/admin'), {
      timeout: 45000,
    });
    assert(!page.url().includes('/platform'), 'New tenant not on platform');
    await ss(page, '07-new-tenant-dashboard');

    // Demo tenant login (email only — no workspace)
    await clearSession(page);
    await page.fill('#email', DEMO_EMAIL);
    await page.fill('#password', DEMO_PASSWORD);
    await ss(page, '08-demo-filled');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 45000 });
    assert(page.url().includes('/dashboard') || page.url().includes('/admin'), 'Demo tenant login');
    await ss(page, '09-demo-tenant-home');

    // Visit a couple tenant admin screens to confirm visible UI
    for (const path of ['/admin/users', '/admin/roles', '/admin/settings']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const t = await page.textContent('body');
      assert(t && t.length > 40, `${path} rendered content`);
      await ss(page, `10-${path.replace(/\//g, '-')}`);
    }

    console.log('\n✅ Central login + tenant E2E passed\n');
  } catch (err) {
    console.error('\n❌ E2E failed:', err);
    await ss(page, 'error-state').catch(() => undefined);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
