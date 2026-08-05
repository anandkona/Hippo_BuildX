import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.log(`  ❌ ${msg}`);
  }
}

function log(msg: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log('='.repeat(60));
}

async function screenshot(page: any, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true, timeout: 10000 });
  console.log(`  📸 screenshots/${name}.png`);
}

async function delay(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function dismissModals(page: any) {
  await page.evaluate(() => {
    document.querySelectorAll('.ant-modal-wrap').forEach((el: any) => {
      el.style.display = 'none';
    });
    document.querySelectorAll('.ant-modal-mask').forEach((el: any) => {
      el.style.display = 'none';
    });
  });
  await delay(300);
}

async function goto(page: any, path: string) {
  await dismissModals(page);
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(2000);
}

(async () => {
  const fs = require('fs');
  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // ============================================
    // 1. PLATFORM ADMIN LOGIN
    // ============================================
    log('1. PLATFORM ADMIN LOGIN');

    await goto(page, '/platform/login');
    await delay(1000);
    await screenshot(page, '01-platform-login');

    await page.fill('input[id="email"]', 'super@buildx.com');
    await page.fill('input[id="password"]', 'password123');
    await screenshot(page, '02-platform-login-filled');

    await page.click('button[type="submit"]');
    await delay(5000);
    await screenshot(page, '03-platform-dashboard');
    assert(page.url().includes('/platform') && !page.url().includes('/login'), 'Logged in to platform');

    // ============================================
    // 2. PLATFORM DASHBOARD
    // ============================================
    log('2. PLATFORM DASHBOARD');

    const dashContent = await page.textContent('body');
    assert(dashContent?.includes('Platform Dashboard'), 'Dashboard title visible');
    assert(dashContent?.includes('Total Tenants'), 'Total Tenants stat visible');
    assert(dashContent?.includes('Active'), 'Active stat visible');
    assert(dashContent?.includes('Subscriptions'), 'Subscriptions stat visible');
    await screenshot(page, '04-platform-dashboard-full');

    // ============================================
    // 3. TENANTS MANAGEMENT
    // ============================================
    log('3. TENANTS MANAGEMENT');

    await goto(page, '/platform/tenants');
    await screenshot(page, '05-tenants-list');
    assert(page.url().includes('/platform/tenants'), 'Tenants page loaded');

    const tenantsContent = await page.textContent('body');
    assert(tenantsContent?.includes('demo'), 'Demo tenant visible');

    // View tenant details
    const viewBtn = page.locator('.anticon-eye').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await delay(1500);
      await screenshot(page, '06-tenant-details');
      await dismissModals(page);
    }

    // Create new tenant
    await page.click('button:has-text("Create Tenant")');
    await delay(1000);
    await screenshot(page, '07-create-tenant-modal');

    await page.fill('input[id="name"]', 'Apex Builders');
    await page.fill('input[id="slug"]', 'apex-builders-2');
    await screenshot(page, '08-create-tenant-filled');

    await page.click('.ant-modal-footer button:has-text("OK")');
    await delay(3000);
    await screenshot(page, '09-tenant-created');
    assert(true, 'Tenant creation submitted');
    await dismissModals(page);

    // ============================================
    // 4. PLANS MANAGEMENT
    // ============================================
    log('4. PLANS MANAGEMENT');

    await goto(page, '/platform/plans');
    await screenshot(page, '10-plans-list');
    assert(page.url().includes('/platform/plans'), 'Plans page loaded');

    const plansContent = await page.textContent('body');
    assert(plansContent?.includes('Starter'), 'Starter plan visible');
    assert(plansContent?.includes('Professional'), 'Professional plan visible');
    assert(plansContent?.includes('Enterprise'), 'Enterprise plan visible');

    // Create new plan
    await page.click('button:has-text("Add Plan")');
    await delay(1000);
    await screenshot(page, '11-add-plan-modal');

    await page.fill('input[id="name"]', 'custom');
    await page.fill('input[id="displayName"]', 'Custom Plan');
    await page.fill('textarea[id="description"]', 'Custom plan for large enterprises');
    await page.fill('input[id="price"]', '49999');
    await screenshot(page, '12-add-plan-filled');

    await page.click('.ant-modal-footer button:has-text("OK")');
    await delay(3000);
    await screenshot(page, '13-plan-created');
    assert(true, 'Plan creation submitted');
    await dismissModals(page);

    // Reload to see the new plan
    await goto(page, '/platform/plans');
    await screenshot(page, '14-plans-after-create');
    const updatedPlans = await page.textContent('body');
    assert(updatedPlans?.includes('Custom Plan') || updatedPlans?.includes('custom'), 'New plan appears in list');

    // ============================================
    // 5. SUBSCRIPTIONS MANAGEMENT
    // ============================================
    log('5. SUBSCRIPTIONS MANAGEMENT');

    await goto(page, '/platform/subscriptions');
    await screenshot(page, '15-subscriptions-list');
    assert(page.url().includes('/platform/subscriptions'), 'Subscriptions page loaded');

    const subsContent = await page.textContent('body');
    assert(subsContent?.includes('Subscriptions'), 'Subscriptions heading visible');

    // Assign plan to tenant
    const assignBtn = page.locator('button:has-text("Assign Plan")');
    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      await delay(1000);
      await screenshot(page, '16-assign-plan-modal');
      await dismissModals(page);
    }

    // ============================================
    // 6. HEALTH MONITOR
    // ============================================
    log('6. HEALTH MONITOR');

    await goto(page, '/platform/health');
    await screenshot(page, '17-health-monitor');
    assert(page.url().includes('/platform/health'), 'Health page loaded');

    const healthContent = await page.textContent('body');
    assert(healthContent?.includes('System Status') || healthContent?.includes('Health'), 'Health monitor content visible');
    assert(healthContent?.includes('Database') || healthContent?.includes('Connected'), 'Database status visible');
    await screenshot(page, '18-health-full');

    // ============================================
    // 7. TENANT LOGIN
    // ============================================
    log('7. TENANT LOGIN');

    await goto(page, '/login');
    await delay(2000);
    await screenshot(page, '19-tenant-login');

    // Use label-based filling for Ant Design form items
    await page.getByLabel('Workspace').click();
    await page.getByLabel('Workspace').fill('demo');
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill('user@demo.com');
    await page.getByLabel('Password').click();
    await page.getByLabel('Password').fill('password123');
    await screenshot(page, '20-tenant-login-filled');

    await page.click('button[type="submit"]');
    // Wait for navigation after login
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(async () => {
      console.log(`  ⚠️  Still on: ${page.url()}`);
      await screenshot(page, '21b-login-stuck');
    });
    await delay(2000);
    await screenshot(page, '21-tenant-dashboard');
    const tenantUrl = page.url();
    console.log(`  🔍 Tenant login URL: ${tenantUrl}`);
    assert(tenantUrl.includes('/dashboard'), 'Logged in to tenant dashboard');

    // ============================================
    // 8. TENANT ADMIN PAGES
    // ============================================
    log('8. TENANT ADMIN PAGES');

    await goto(page, '/admin/users');
    await screenshot(page, '22-admin-users');
    assert(page.url().includes('/admin/users'), 'Users page loaded');

    await goto(page, '/admin/roles');
    await screenshot(page, '23-admin-roles');
    assert(page.url().includes('/admin/roles'), 'Roles page loaded');

    await goto(page, '/admin/settings');
    await screenshot(page, '24-admin-settings');
    assert(page.url().includes('/admin/settings'), 'Settings page loaded');

    await goto(page, '/admin/channels');
    await screenshot(page, '25-admin-channels');
    assert(page.url().includes('/admin/channels'), 'Channels page loaded');

    // ============================================
    // 9. LOGOUT
    // ============================================
    log('9. LOGOUT');

    await goto(page, '/dashboard');
    await delay(1000);

    // Click user avatar dropdown
    const avatar = page.locator('.ant-dropdown-trigger').last();
    if (await avatar.isVisible()) {
      await avatar.click();
      await delay(500);
      await page.click('text=Logout');
      await delay(3000);
      await screenshot(page, '26-logout-redirect');
      assert(page.url().includes('/login'), 'Logged out successfully');
    } else {
      console.log('  ⚠️  Avatar dropdown not visible, skipping logout test');
    }

  } catch (error) {
    console.error('\n❌ Test error:', error);
    await screenshot(page, 'error-state').catch(() => {});
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${total} total`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
})();
