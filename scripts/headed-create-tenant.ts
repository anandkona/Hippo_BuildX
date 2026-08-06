/**
 * Headed Playwright — manual-style tenant provision on /platform/tenants.
 * Usage: npx tsx scripts/headed-create-tenant.ts
 */
import { chromium, type Page } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'saikumarbali555@gmail.com';

async function fillPlaceholder(page: Page, placeholder: string, value: string) {
  const el = page.locator(`input[placeholder="${placeholder}"]`);
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.click();
  await el.fill(value);
}

async function selectByLabelNear(page: Page, label: string, optionLabel: string) {
  const section = page.locator('label, div').filter({ hasText: new RegExp(`^${label}`, 'i') }).first();
  // Find select in the same Field wrapper
  const select = page
    .locator('div')
    .filter({ has: page.getByText(label, { exact: false }) })
    .locator('select')
    .first();
  if ((await select.count()) > 0) {
    await select.selectOption({ label: optionLabel }).catch(async () => {
      await select.selectOption({ value: optionLabel });
    });
    return;
  }
  // fallback: any select containing option
  const any = page.locator(`select:has(option:text("${optionLabel}"))`).first();
  if ((await any.count()) > 0) {
    await any.selectOption({ label: optionLabel });
  }
}

async function main() {
  const stamp = Date.now().toString(36).slice(-6);
  const slug = `nativestar${stamp}`;

  console.log('\n▶ Headed Chromium — create Indian tenant (watch the browser)\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  try {
    console.log('1) Login...');
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('#email', 'super@buildx.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/platform') && !u.pathname.includes('login'), {
      timeout: 45000,
    });

    console.log('2) Open Tenants page...');
    await page.goto(`${BASE}/platform/tenants`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1200);

    console.log('3) Open Provision Tenant modal...');
    await page.getByRole('button', { name: /Provision Tenant/i }).click();
    await page.waitForSelector('text=Provision New Tenant', { timeout: 15000 });

    console.log('4) Fill Company section...');
    await fillPlaceholder(page, 'e.g. Skyline Construction', 'NativeStar Infra Projects');
    await fillPlaceholder(page, 'Skyline Construction Pvt Ltd', 'NativeStar Infra Projects Private Limited');

    // Industry already Construction by default — set company size
    const sizeSelect = page.locator('select').filter({ has: page.locator('option[value="51-200"]') }).first();
    await sizeSelect.selectOption('51-200');

    await fillPlaceholder(page, '27AABCU9603R1ZM', '36AABCU9603R1ZM');
    await fillPlaceholder(page, 'AABCU9603R', 'AABCU9603R');
    await fillPlaceholder(page, 'U45200MH2015PTC123456', 'U45200TG2019PTC134567');
    await fillPlaceholder(page, 'https://skyline.example.com', 'https://nativestar.example.com');

    console.log('5) Fill Address (Hyderabad / Telangana)...');
    await fillPlaceholder(page, 'Plot 12, Business Park', 'Plot 42, Hitech City Road');
    await fillPlaceholder(page, 'Andheri East', 'Madhapur');
    await fillPlaceholder(page, 'Mumbai', 'Hyderabad');

    const stateSelect = page.locator('select').filter({ has: page.locator('option[value="Telangana"]') }).first();
    await stateSelect.selectOption('Telangana');
    await fillPlaceholder(page, '400069', '500081');

    console.log('6) Fill Contact + Admin email...');
    await fillPlaceholder(page, 'Ravi Mehta', 'Sai Kumar Bali');
    await fillPlaceholder(page, 'Director / Admin Head', 'Managing Director');
    await fillPlaceholder(page, 'ravi@skyline.example.com', ADMIN_EMAIL);
    await fillPlaceholder(page, '+91 98765 43210', '+91 98765 43210');
    await fillPlaceholder(page, 'accounts@skyline.example.com', ADMIN_EMAIL);

    // Subdomain if present
    const slugInput = page.locator('input[placeholder="skyline"]');
    if ((await slugInput.count()) > 0) {
      await slugInput.fill(slug);
    }

    await fillPlaceholder(page, 'Defaults to contact / company admin', 'Sai Kumar Bali');
    await fillPlaceholder(page, 'admin@skyline.example.com', ADMIN_EMAIL);

    // Prefer Professional plan if listed
    const planSelect = page.locator('select').filter({ hasText: /Optional — assign later|Professional|Business/i }).last();
    if ((await planSelect.count()) > 0) {
      const options = await planSelect.locator('option').allTextContents();
      const pro = options.findIndex((t) => /Professional|Business/i.test(t));
      if (pro > 0) await planSelect.selectOption({ index: pro });
    }

    console.log('7) Click Provision Schema...');
    await page.getByRole('button', { name: /Provision Schema/i }).click();

    console.log('8) Waiting for Tenant ready modal...');
    await page.waitForSelector('[data-testid="tenant-credentials"]', { timeout: 120000 });
    await page.waitForTimeout(1500);

    const modal = page.locator('[data-testid="tenant-credentials"]');
    console.log('\n──── Tenant ready ────\n' + (await modal.innerText()) + '\n──────────────────────\n');

    let inviteUrl =
      (await modal.locator('a[href*="/invite"]').getAttribute('href').catch(() => null)) || '';
    if (!inviteUrl) {
      const html = await modal.innerHTML();
      const m = html.match(/https?:\/\/[^"'\\s]*\/invite\?token=[a-f0-9]+/i) || html.match(/\/invite\?token=[a-f0-9]+/i);
      if (m) inviteUrl = m[0].startsWith('http') ? m[0] : `${BASE}${m[0]}`;
    }

    if (inviteUrl) {
      console.log('SET YOUR PASSWORD HERE:\n' + inviteUrl + '\n');
      console.log('Then login at http://localhost:3000/login');
      console.log(`  Email: ${ADMIN_EMAIL}`);
      console.log('  Password: (the one you create on the invite page)\n');
    } else {
      console.log('Could not find invite link in modal — copy it from the browser UI.\n');
    }

    console.log('Browser stays open 2 minutes so you can copy the link...');
    await page.waitForTimeout(120000);

    const done = page.getByRole('button', { name: /^Done$/i });
    if (await done.isVisible().catch(() => false)) await done.click();
    console.log('✅ Headed create flow finished.\n');
  } catch (err) {
    console.error('❌', err);
    await page.screenshot({ path: 'screenshots/headed-create-tenant-error.png', fullPage: true }).catch(() => undefined);
    process.exitCode = 1;
    await page.waitForTimeout(20000);
  } finally {
    await browser.close();
  }
}

main();
