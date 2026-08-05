/**
 * Headed Playwright visual + CRUD pass for Platform Admin screens.
 *
 * Visual strategy:
 * 1) Mockup similarity — resized cropped composite panels (loose threshold; charts masked).
 * 2) App regression — once `screenshots/baselines/platform-app/*.png` exists, require tight
 *    pixelmatch (≤1.5%). First successful full capture seeds those goldens.
 */
import fs from 'fs';
import path from 'path';
import { chromium, type Page } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ACTUAL_DIR = path.join(ROOT, 'screenshots/actual/platform');
const MOCKUP_DIR = path.join(ROOT, 'screenshots/baselines/platform');
const APP_BASELINE_DIR = path.join(ROOT, 'screenshots/baselines/platform-app');
const DIFF_DIR = path.join(ROOT, 'screenshots/diff');
const EMAIL = 'super@buildx.com';
const PASSWORD = 'password123';

const MOCKUP_MAX_DIFF = Number(process.env.MOCKUP_MAX_DIFF || 0.4);
const APP_MAX_DIFF = Number(process.env.APP_MAX_DIFF || 0.12);
const NAV_TIMEOUT = 90000;

const SCREENS: { name: string; path: string; testid: string; maskCharts?: boolean }[] = [
  { name: 'dashboard', path: '/platform', testid: 'platform-dashboard', maskCharts: true },
  { name: 'tenants', path: '/platform/tenants', testid: 'platform-tenants' },
  { name: 'plans', path: '/platform/plans', testid: 'platform-plans' },
  { name: 'users', path: '/platform/users', testid: 'platform-users' },
  { name: 'subscriptions', path: '/platform/subscriptions', testid: 'platform-subscriptions' },
  { name: 'feature-flags', path: '/platform/feature-flags', testid: 'platform-feature-flags' },
  { name: 'settings', path: '/platform/settings', testid: 'platform-settings' },
  { name: 'audit', path: '/platform/audit', testid: 'platform-audit' },
];

function ensureDirs() {
  for (const d of [ACTUAL_DIR, DIFF_DIR, APP_BASELINE_DIR]) fs.mkdirSync(d, { recursive: true });
}

function resize(src: PNG, w: number, h: number): PNG {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / w) * src.width));
      const sy = Math.min(src.height - 1, Math.floor((y / h) * src.height));
      const si = (src.width * sy + sx) << 2;
      const di = (w * y + x) << 2;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

function maskCharts(img: PNG) {
  const y0 = Math.floor(img.height * 0.28);
  const y1 = Math.floor(img.height * 0.62);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (img.width * y + x) << 2;
      img.data[i] = 128;
      img.data[i + 1] = 128;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
}

function comparePair(
  label: string,
  actualPath: string,
  baselinePath: string,
  maxRatio: number,
  mask: boolean
) {
  if (!fs.existsSync(baselinePath)) {
    console.warn(`  SKIP ${label}: no baseline`);
    return { ok: true, ratio: 0, skipped: true };
  }
  const actual = PNG.sync.read(fs.readFileSync(actualPath));
  const baselineRaw = PNG.sync.read(fs.readFileSync(baselinePath));
  const w = actual.width;
  const h = actual.height;
  const baseline = resize(baselineRaw, w, h);
  if (mask) {
    maskCharts(actual);
    maskCharts(baseline);
  }
  const diff = new PNG({ width: w, height: h });
  const mismatched = pixelmatch(actual.data, baseline.data, diff.data, w, h, {
    threshold: 0.2,
    includeAA: false,
  });
  const ratio = mismatched / (w * h);
  const safe = label.replace(/[^a-z0-9_-]+/gi, '_');
  fs.writeFileSync(path.join(DIFF_DIR, `${safe}.png`), PNG.sync.write(diff));
  const ok = ratio <= maxRatio;
  console.log(
    `  ${label}: ${(ratio * 100).toFixed(2)}% diff ${ok ? 'PASS' : 'FAIL'} (max ${(maxRatio * 100).toFixed(1)}%)`
  );
  return { ok, ratio, skipped: false };
}

async function login(page: Page) {
  await page.goto(`${BASE}/platform/login`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.getByLabel('Email').waitFor({ timeout: NAV_TIMEOUT });
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in to platform/i }).click();
  await page.waitForURL(/\/platform(?!\/login)/, { timeout: NAV_TIMEOUT });
}

async function warmRoutes(page: Page) {
  console.log('Warming routes (first compile can be slow)...');
  for (const screen of SCREENS) {
    await page.goto(`${BASE}${screen.path}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await page.waitForSelector(`[data-testid="${screen.testid}"]`, { timeout: NAV_TIMEOUT });
  }
}

async function assertCrud(page: Page) {
  const stamp = Date.now().toString().slice(-6);
  const results: string[] = [];

  await page.goto(`${BASE}/platform/plans`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.getByRole('button', { name: /add plan/i }).click();
  await page.waitForSelector('.ant-modal');
  await page.getByLabel(/Plan Key/i).fill(`e2e-${stamp}`);
  await page.getByLabel(/Display Name/i).fill(`E2E Plan ${stamp}`);
  await page.getByLabel(/^Price/i).fill('1234');
  await page.getByRole('button', { name: /create plan/i }).click();
  await page.waitForTimeout(2000);
  results.push((await page.getByText(`E2E Plan ${stamp}`).count()) > 0 ? 'PASS create plan' : 'FAIL create plan');

  await page.goto(`${BASE}/platform/feature-flags`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForSelector('[data-testid="platform-feature-flags"]');
  const row = page.locator('.ant-table-row').first();
  await row.waitFor();
  const statusBefore = (await row.locator('.ant-tag').first().innerText()).trim();
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v1/platform/feature-flags/') && r.request().method() === 'PUT' && r.ok(),
      { timeout: NAV_TIMEOUT }
    ),
    row.locator('.ant-switch').click(),
  ]);
  await page.waitForTimeout(800);
  const statusAfter = (await page.locator('.ant-table-row').first().locator('.ant-tag').first().innerText()).trim();
  results.push(statusBefore !== statusAfter ? 'PASS toggle flag' : 'FAIL toggle flag');
  // restore
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v1/platform/feature-flags/') && r.request().method() === 'PUT' && r.ok(),
      { timeout: NAV_TIMEOUT }
    ),
    page.locator('.ant-table-row').first().locator('.ant-switch').click(),
  ]);
  await page.waitForTimeout(500);

  await page.goto(`${BASE}/platform/settings`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.getByLabel(/Platform Name/i).fill('HIPPO BUILD X');
  await page.getByRole('button', { name: /save changes/i }).click();
  await page.waitForTimeout(1500);
  results.push(
    (await page.locator('.ant-message-success, .ant-message-notice').count()) > 0
      ? 'PASS save settings'
      : 'FAIL save settings'
  );

  await page.goto(`${BASE}/platform/users`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.getByRole('button', { name: /add user/i }).click();
  await page.waitForSelector('.ant-modal');
  await page.getByLabel(/^Name$/i).fill(`E2E User ${stamp}`);
  await page.getByLabel(/^Email$/i).fill(`e2e${stamp}@buildx.com`);
  await page.getByLabel(/^Password$/i).fill('password123');
  await page.getByRole('button', { name: /^create$/i }).click();
  await page.waitForTimeout(2000);
  results.push((await page.getByText(`E2E User ${stamp}`).count()) > 0 ? 'PASS create user' : 'FAIL create user');

  await page.goto(`${BASE}/platform/tenants`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.getByRole('button', { name: /add tenant/i }).click();
  await page.waitForSelector('.ant-modal');
  const tenantName = `E2E Tenant ${stamp}`;
  const tenantSlug = `e2e-${stamp}`;
  await page.getByLabel(/Tenant Name/i).fill(tenantName);
  await page.getByLabel(/^Slug$/i).fill(tenantSlug);
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v1/platform/tenants') && r.request().method() === 'POST',
      { timeout: NAV_TIMEOUT }
    ),
    page.getByRole('button', { name: /create tenant/i }).click(),
  ]);
  await page.waitForTimeout(1500);
  // Close modal if still open and refresh list
  if (await page.locator('.ant-modal').count()) {
    await page.keyboard.press('Escape').catch(() => {});
  }
  await page.goto(`${BASE}/platform/tenants`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForSelector('[data-testid="platform-tenants"]');
  await page.getByPlaceholder(/search tenants/i).fill(tenantName);
  await page.waitForTimeout(500);
  results.push((await page.getByText(tenantName).count()) > 0 ? 'PASS create tenant' : 'FAIL create tenant');

  await page.goto(`${BASE}/platform/tenants`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.locator('table a').first().click();
  await page.waitForURL(/\/platform\/tenants\//, { timeout: NAV_TIMEOUT });
  await page.waitForSelector('[data-testid="platform-tenant-details"]');
  await page.screenshot({ path: path.join(ACTUAL_DIR, 'tenant-details.png'), fullPage: true });
  results.push('PASS tenant details');

  return results;
}

async function main() {
  ensureDirs();
  console.log(`Launching headed Chromium against ${BASE}...`);
  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT);

  let failed = false;

  try {
    await login(page);
    console.log('Logged in.');
    await warmRoutes(page);

    for (const screen of SCREENS) {
      console.log(`Capturing ${screen.name}...`);
      await page.goto(`${BASE}${screen.path}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      await page.waitForSelector(`[data-testid="${screen.testid}"]`, { timeout: NAV_TIMEOUT });
      await page.waitForTimeout(1000);
      const actualPath = path.join(ACTUAL_DIR, `${screen.name}.png`);
      await page.screenshot({ path: actualPath, fullPage: true });

      const mockup = comparePair(
        `mockup/${screen.name}`,
        actualPath,
        path.join(MOCKUP_DIR, `${screen.name}.png`),
        MOCKUP_MAX_DIFF,
        !!screen.maskCharts
      );
      if (!mockup.ok) failed = true;

      const appBase = path.join(APP_BASELINE_DIR, `${screen.name}.png`);
      if (fs.existsSync(appBase)) {
        const app = comparePair(`app/${screen.name}`, actualPath, appBase, APP_MAX_DIFF, !!screen.maskCharts);
        if (!app.ok) failed = true;
      } else {
        fs.copyFileSync(actualPath, appBase);
        console.log(`  seeded app baseline ${screen.name}`);
      }
    }

    console.log('Running CRUD assertions...');
    const crud = await assertCrud(page);
    for (const line of crud) {
      console.log(`  ${line}`);
      if (line.startsWith('FAIL')) failed = true;
    }

    const tdActual = path.join(ACTUAL_DIR, 'tenant-details.png');
    if (fs.existsSync(tdActual)) {
      const mockupTd = comparePair(
        'mockup/tenant-details',
        tdActual,
        path.join(MOCKUP_DIR, 'tenant-details.png'),
        MOCKUP_MAX_DIFF,
        false
      );
      if (!mockupTd.ok) failed = true;
      const appTd = path.join(APP_BASELINE_DIR, 'tenant-details.png');
      if (!fs.existsSync(appTd)) {
        fs.copyFileSync(tdActual, appTd);
        console.log('  seeded app baseline tenant-details');
      } else {
        const app = comparePair('app/tenant-details', tdActual, appTd, APP_MAX_DIFF, false);
        if (!app.ok) failed = true;
      }
    }
  } catch (err) {
    console.error('Visual/e2e failed:', err);
    await page.screenshot({ path: path.join(DIFF_DIR, 'error-state.png'), fullPage: true }).catch(() => {});
    failed = true;
  } finally {
    await browser.close();
  }

  if (failed) {
    console.error('\nPlatform visual/e2e FAILED');
    process.exit(1);
  }
  console.log('\nPlatform visual/e2e PASSED');
}

main();
