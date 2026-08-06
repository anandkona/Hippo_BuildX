/**
 * Headed screenshot pass for Platform Admin — clean realistic seed, no CRUD mutations.
 * Captures viewport + full-page PNGs for login and all 9 screens.
 */
import fs from 'fs';
import path from 'path';
import { chromium, type Page } from 'playwright';

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.join(ROOT, 'screenshots/platform-demo');
const EMAIL = 'super@buildx.com';
const PASSWORD = 'password123';
const NAV_TIMEOUT = 90000;

const SCREENS: { name: string; path: string; testid?: string; auth?: boolean }[] = [
  { name: '01-login', path: '/platform/login', auth: false },
  { name: '02-dashboard', path: '/platform', testid: 'platform-dashboard' },
  { name: '03-tenants', path: '/platform/tenants', testid: 'platform-tenants' },
  { name: '04-tenant-details', path: '', testid: 'platform-tenant-details' }, // filled at runtime
  { name: '05-plans', path: '/platform/plans', testid: 'platform-plans' },
  { name: '06-users', path: '/platform/users', testid: 'platform-users' },
  { name: '07-subscriptions', path: '/platform/subscriptions', testid: 'platform-subscriptions' },
  { name: '08-feature-flags', path: '/platform/feature-flags', testid: 'platform-feature-flags' },
  { name: '09-settings', path: '/platform/settings', testid: 'platform-settings' },
  { name: '10-audit', path: '/platform/audit', testid: 'platform-audit' },
];

async function shot(page: Page, name: string) {
  const viewportPath = path.join(OUT, `${name}.png`);
  const fullPath = path.join(OUT, `${name}-full.png`);
  await page.screenshot({ path: viewportPath, fullPage: false });
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`  saved ${name}.png + ${name}-full.png`);
}

async function login(page: Page) {
  await page.goto(`${BASE}/platform/login`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.getByLabel('Email').waitFor({ timeout: NAV_TIMEOUT });
  await shot(page, '01-login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await shot(page, '01-login-filled');
  await page.getByRole('button', { name: /sign in to platform/i }).click();
  await page.waitForURL(/\/platform(?!\/login)/, { timeout: NAV_TIMEOUT });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`Launching headed Chromium → screenshots in ${OUT}`);
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT);

  try {
    await login(page);

    // Resolve ABC Constructions details via click (table uses onClick, not href)
    await page.goto(`${BASE}/platform/tenants`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await page.waitForSelector('[data-testid="platform-tenants"]');
    await page.getByPlaceholder(/search tenants/i).fill('ABC Constructions');
    await page.waitForTimeout(500);
    await page.locator('table button').filter({ hasText: 'ABC Constructions' }).first().click();
    await page.waitForURL(/\/platform\/tenants\/[^/]+/, { timeout: NAV_TIMEOUT });
    await page.waitForSelector('[data-testid="platform-tenant-details"]', { timeout: NAV_TIMEOUT });
    const detailsPath = new URL(page.url()).pathname;

    const routes = [
      { name: '02-dashboard', path: '/platform', testid: 'platform-dashboard' },
      { name: '03-tenants', path: '/platform/tenants', testid: 'platform-tenants', clearSearch: true },
      { name: '04-tenant-details', path: detailsPath, testid: 'platform-tenant-details' },
      { name: '05-plans', path: '/platform/plans', testid: 'platform-plans' },
      { name: '06-users', path: '/platform/users', testid: 'platform-users' },
      { name: '07-subscriptions', path: '/platform/subscriptions', testid: 'platform-subscriptions' },
      { name: '08-feature-flags', path: '/platform/feature-flags', testid: 'platform-feature-flags' },
      { name: '09-settings', path: '/platform/settings', testid: 'platform-settings' },
      { name: '10-audit', path: '/platform/audit', testid: 'platform-audit' },
    ];

    for (const screen of routes) {
      console.log(`Capturing ${screen.name}...`);
      await page.goto(`${BASE}${screen.path}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      if (screen.testid) {
        await page.waitForSelector(`[data-testid="${screen.testid}"]`, { timeout: NAV_TIMEOUT });
      }
      if ((screen as any).clearSearch) {
        const search = page.getByPlaceholder(/search tenants/i);
        if (await search.count()) {
          await search.fill('');
          await page.waitForTimeout(400);
        }
      }
      await page.waitForTimeout(1200);
      await shot(page, screen.name);
    }

    console.log('\nAll screenshots captured.');
    console.log(`Output: ${OUT}`);
  } catch (err) {
    console.error('Screenshot pass failed:', err);
    await page.screenshot({ path: path.join(OUT, 'error-state.png'), fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
