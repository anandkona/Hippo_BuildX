import { chromium } from 'playwright';
import * as fs from 'fs';

const BASE = 'http://localhost:3000';
let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`    ✅ ${msg}`);
  } else {
    failed++;
    console.log(`    ❌ ${msg}`);
  }
}

function log(msg: string) {
  console.log(`\n${'━'.repeat(70)}`);
  console.log(`  ${msg}`);
  console.log('━'.repeat(70));
}

function sublog(msg: string) {
  console.log(`\n  ── ${msg} ──`);
}

async function ss(page: any, name: string) {
  await page.screenshot({ path: `screenshots/e2e/${name}.png`, fullPage: true, timeout: 15000 });
  console.log(`    📸 e2e/${name}.png`);
}

async function scrollAndScreenshot(page: any, name: string) {
  // Take full-page screenshot
  await ss(page, name);
  // Scroll to bottom and take another
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await ss(page, `${name}-scrolled`);
}

async function delay(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function clearAndFill(page: any, selector: string, value: string) {
  await page.locator(selector).click();
  await page.locator(selector).fill(value);
}

(async () => {
  if (!fs.existsSync('screenshots/e2e')) fs.mkdirSync('screenshots/e2e', { recursive: true });

  const browser = await chromium.launch({ headless: false });

  try {
    // ════════════════════════════════════════════════════════════
    // PART 1: PLATFORM ADMIN FLOW (Fresh context)
    // ════════════════════════════════════════════════════════════
    log('PART 1: PLATFORM ADMIN FLOW');

    const platformCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pPage = await platformCtx.newPage();

    // ── 1.1 Platform Login ──
    sublog('1.1 Platform Login Page');
    await pPage.goto(`${BASE}/platform/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2000);

    // Verify NO sidebar on login page
    const sidebarVisible = await pPage.locator('.ant-layout-sider').isVisible().catch(() => false);
    assert(!sidebarVisible, 'No sidebar on platform login page');

    // Verify NO header bar on login page
    const headerVisible = await pPage.locator('header').isVisible().catch(() => false);
    assert(!headerVisible, 'No header bar on platform login page');

    // Verify clean form (no stale data)
    const emailValue = await pPage.locator('input[id="email"]').inputValue().catch(() => '');
    assert(emailValue === '', 'Email field is empty (no stale data)');
    await ss(pPage, '01-platform-login-clean');

    // Fill and submit
    await pPage.getByLabel('Email').fill('super@buildx.com');
    await pPage.getByLabel('Password').fill('password123');
    await ss(pPage, '02-platform-login-filled');
    await pPage.click('button[type="submit"]');
    await delay(5000);
    // After login, may redirect to /platform or stay on /platform/login briefly
    const postLoginUrl = pPage.url();
    assert(postLoginUrl.includes('/platform'), 'On platform after login');
    if (postLoginUrl.includes('/login')) {
      // If still on login, wait for redirect
      await pPage.waitForURL('**/platform**', { timeout: 10000 }).catch(() => {});
      await delay(2000);
    }
    assert(!pPage.url().includes('/login'), 'Redirected away from login');

    // ── 1.2 Platform Dashboard ──
    sublog('1.2 Platform Dashboard');
    await pPage.goto(`${BASE}/platform`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    // Verify sidebar IS present now
    const sidebarAfterLogin = await pPage.locator('.ant-layout-sider').isVisible();
    assert(sidebarAfterLogin, 'Sidebar visible on platform dashboard');

    // Verify dashboard content
    const dashText = await pPage.textContent('body');
    assert(dashText?.includes('Platform Dashboard'), 'Title: Platform Dashboard');
    assert(dashText?.includes('Total Tenants'), 'Stat: Total Tenants');
    assert(dashText?.includes('Active'), 'Stat: Active');
    assert(dashText?.includes('Subscriptions'), 'Stat: Subscriptions');
    assert(dashText?.includes('All Tenants'), 'Table: All Tenants');

    // Verify sidebar nav items
    const navItems = await pPage.locator('.ant-menu-item').allTextContents();
    assert(navItems.some(t => t.includes('Dashboard')), 'Nav: Dashboard');
    assert(navItems.some(t => t.includes('Tenants')), 'Nav: Tenants');
    assert(navItems.some(t => t.includes('Plans')), 'Nav: Plans');
    assert(navItems.some(t => t.includes('Subscriptions')), 'Nav: Subscriptions');
    assert(navItems.some(t => t.includes('Health')), 'Nav: Health');

    await scrollAndScreenshot(pPage, '03-platform-dashboard');

    // ── 1.3 Platform Tenants ──
    sublog('1.3 Platform Tenants Page');
    await pPage.goto(`${BASE}/platform/tenants`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    const tenantsText = await pPage.textContent('body');
    assert(tenantsText?.includes('Tenants'), 'Title: Tenants');
    assert(tenantsText?.includes('Manage all tenant'), 'Subtitle visible');
    assert(tenantsText?.includes('demo') || tenantsText?.includes('Demo'), 'Demo tenant in list');
    assert(tenantsText?.includes('Create Tenant'), 'Create Tenant button');

    // Verify table columns
    assert(tenantsText?.includes('Schema'), 'Column: Schema');
    assert(tenantsText?.includes('Status'), 'Column: Status');
    assert(tenantsText?.includes('Actions'), 'Column: Actions');

    await scrollAndScreenshot(pPage, '04-platform-tenants');

    // ── 1.4 Platform Plans ──
    sublog('1.4 Platform Plans Page');
    await pPage.goto(`${BASE}/platform/plans`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    const plansText = await pPage.textContent('body');
    assert(plansText?.includes('Plans'), 'Title: Plans');
    assert(plansText?.includes('Manage subscription'), 'Subtitle visible');
    assert(plansText?.includes('Starter'), 'Plan: Starter');
    assert(plansText?.includes('Professional'), 'Plan: Professional');
    assert(plansText?.includes('Enterprise'), 'Plan: Enterprise');
    assert(plansText?.includes('Add Plan'), 'Add Plan button');

    // Verify plan columns
    assert(plansText?.includes('Price'), 'Column: Price');
    assert(plansText?.includes('Limits'), 'Column: Limits');
    assert(plansText?.includes('Features'), 'Column: Features');

    await scrollAndScreenshot(pPage, '05-platform-plans');

    // ── 1.5 Platform Subscriptions ──
    sublog('1.5 Platform Subscriptions Page');
    await pPage.goto(`${BASE}/platform/subscriptions`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    const subsText = await pPage.textContent('body');
    assert(subsText?.includes('Subscriptions'), 'Title: Subscriptions');
    assert(subsText?.includes('Manage tenant subscriptions'), 'Subtitle visible');
    assert(subsText?.includes('Assign Plan'), 'Assign Plan button');

    // Verify subscription columns
    assert(subsText?.includes('Tenant'), 'Column: Tenant');
    assert(subsText?.includes('Plan'), 'Column: Plan');
    assert(subsText?.includes('Status'), 'Column: Status');
    assert(subsText?.includes('Start Date'), 'Column: Start Date');

    await scrollAndScreenshot(pPage, '06-platform-subscriptions');

    // ── 1.6 Platform Health ──
    sublog('1.6 Platform Health Monitor Page');
    await pPage.goto(`${BASE}/platform/health`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    const healthText = await pPage.textContent('body');
    assert(healthText?.includes('Health Monitor'), 'Title: Health Monitor');
    assert(healthText?.includes('Platform health'), 'Subtitle visible');
    assert(healthText?.includes('Total Tenants'), 'Stat: Total Tenants');
    assert(healthText?.includes('Active'), 'Stat: Active');
    assert(healthText?.includes('System Status'), 'Section: System Status');
    assert(healthText?.includes('Database'), 'System: Database');
    assert(healthText?.includes('Connected'), 'Status: Connected');
    assert(healthText?.includes('Platform Usage'), 'Section: Platform Usage');

    await scrollAndScreenshot(pPage, '07-platform-health');

    // ── 1.7 Platform Logout ──
    sublog('1.7 Platform Logout');
    const logoutBtn = pPage.locator('.ant-menu-item:has-text("Logout")');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await delay(3000);
      assert(pPage.url().includes('/platform/login'), 'Logged out to platform login');
    }

    await platformCtx.close();

    // ════════════════════════════════════════════════════════════
    // PART 2: TENANT USER FLOW (Fresh context)
    // ════════════════════════════════════════════════════════════
    log('PART 2: TENANT USER FLOW');

    const tenantCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const tPage = await tenantCtx.newPage();

    // ── 2.1 Tenant Login ──
    sublog('2.1 Tenant Login Page');
    await tPage.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2000);

    // Verify NO sidebar on login
    const tenantSidebar = await tPage.locator('.ant-layout-sider').isVisible().catch(() => false);
    assert(!tenantSidebar, 'No sidebar on tenant login page');

    // Verify NO header bar on login
    const tenantHeader = await tPage.locator('header').isVisible().catch(() => false);
    assert(!tenantHeader, 'No header bar on tenant login page');

    // Verify clean form
    const tenantEmailVal = await tPage.locator('input[id="email"]').inputValue().catch(() => '');
    assert(tenantEmailVal === '', 'Email field is empty (no stale data)');

    const tenantSlugVal = await tPage.locator('input[id="tenantSlug"]').inputValue().catch(() => '');
    assert(tenantSlugVal === '', 'Workspace field is empty (no stale data)');
    await ss(tPage, '08-tenant-login-clean');

    // Fill and submit
    await tPage.getByLabel('Workspace').fill('demo');
    await tPage.getByLabel('Email').fill('user@demo.com');
    await tPage.getByLabel('Password').fill('password123');
    await ss(tPage, '09-tenant-login-filled');
    await tPage.click('button[type="submit"]');
    // Wait for redirect after login
    await tPage.waitForURL('**/dashboard**', { timeout: 15000 }).catch(async () => {
      console.log(`    ⚠️  Still on: ${tPage.url()}`);
    });
    await delay(4000);
    assert(tPage.url().includes('/dashboard'), 'Redirected to tenant dashboard');

    // ── 2.2 Tenant Dashboard ──
    sublog('2.2 Tenant Dashboard');
    // Wait for dashboard content to fully render
    await tPage.waitForSelector('text=Total Users', { timeout: 15000 }).catch(() => {});
    await delay(3000);

    const tenantDashText = await tPage.textContent('body');
    assert(tenantDashText?.includes('Dashboard'), 'Title: Dashboard');
    assert(tenantDashText?.includes('Total Users'), 'Stat: Total Users');
    assert(tenantDashText?.includes('Active Roles'), 'Stat: Active Roles');
    assert(tenantDashText?.includes('Channels'), 'Stat: Channels');
    assert(tenantDashText?.includes('System Status'), 'Section: System Status');
    assert(tenantDashText?.includes('Quick Actions'), 'Section: Quick Actions');

    // Verify NO stale mock data
    assert(!tenantDashText?.includes('John Smith'), 'No stale mock user "John Smith"');
    assert(!tenantDashText?.includes('Sarah Johnson'), 'No stale mock user "Sarah Johnson"');

    // Verify header bar is present
    const headerBarVisible = await tPage.locator('.ant-layout-header').isVisible().catch(() => false);
    const headerFallback = await tPage.locator('[class*="header"]').first().isVisible().catch(() => false);
    assert(headerBarVisible || headerFallback, 'Header bar visible on dashboard');

    // Verify top nav
    const topNavVisible = await tPage.locator('.ant-menu-horizontal').isVisible().catch(() => false);
    assert(topNavVisible, 'Top navigation visible');

    await scrollAndScreenshot(tPage, '10-tenant-dashboard');

    // ── 2.3 Admin Users ──
    sublog('2.3 Tenant Admin - Users Page');
    await tPage.goto(`${BASE}/admin/users`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    const usersText = await tPage.textContent('body');
    assert(usersText?.includes('Users'), 'Title: Users');
    assert(usersText?.includes('Manage user accounts'), 'Subtitle visible');
    assert(usersText?.includes('Add User'), 'Add User button');
    const searchInput = await tPage.locator('input[placeholder*="Search"]').isVisible();
    assert(searchInput, 'Search input visible');

    // Verify admin sidebar
    const adminSidebar = await tPage.locator('.ant-layout-sider').isVisible();
    assert(adminSidebar, 'Admin sidebar visible');
    const adminNav = await tPage.locator('.ant-layout-sider').textContent();
    assert(adminNav?.includes('Users'), 'Admin nav: Users');
    assert(adminNav?.includes('Roles'), 'Admin nav: Roles');
    assert(adminNav?.includes('Settings'), 'Admin nav: Settings');
    assert(adminNav?.includes('Channels'), 'Admin nav: Channels');

    await scrollAndScreenshot(tPage, '11-admin-users');

    // ── 2.4 Admin Roles ──
    sublog('2.4 Tenant Admin - Roles Page');
    await tPage.goto(`${BASE}/admin/roles`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    const rolesText = await tPage.textContent('body');
    assert(rolesText?.includes('Roles & Permissions'), 'Title: Roles & Permissions');
    assert(rolesText?.includes('Manage roles and'), 'Subtitle visible');
    assert(rolesText?.includes('Add Role'), 'Add Role button');
    assert(rolesText?.includes('Permissions'), 'Column: Permissions');

    await scrollAndScreenshot(tPage, '12-admin-roles');

    // ── 2.5 Admin Settings ──
    sublog('2.5 Tenant Admin - Settings Page');
    await tPage.goto(`${BASE}/admin/settings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    const settingsText = await tPage.textContent('body');
    assert(settingsText?.includes('Settings'), 'Title: Settings');
    assert(settingsText?.includes('Configure your tenant'), 'Subtitle visible');
    assert(settingsText?.includes('Save Settings'), 'Save button');
    assert(settingsText?.includes('General'), 'Section: General');
    assert(settingsText?.includes('Branding'), 'Section: Branding');
    assert(settingsText?.includes('Feature Flags'), 'Section: Feature Flags');
    assert(settingsText?.includes('Company Name'), 'Field: Company Name');
    assert(settingsText?.includes('CRM'), 'Feature: CRM');
    assert(settingsText?.includes('HRMS'), 'Feature: HRMS');

    await scrollAndScreenshot(tPage, '13-admin-settings');

    // ── 2.6 Admin Channels ──
    sublog('2.6 Tenant Admin - Channels Page');
    await tPage.goto(`${BASE}/admin/channels`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(3000);

    const channelsText = await tPage.textContent('body');
    assert(channelsText?.includes('Notification Channels'), 'Title: Notification Channels');
    assert(channelsText?.includes('Configure WhatsApp'), 'Subtitle visible');
    assert(channelsText?.includes('WhatsApp'), 'Channel: WhatsApp');
    assert(channelsText?.includes('Email'), 'Channel: Email');
    assert(channelsText?.includes('SMS'), 'Channel: SMS');
    assert(channelsText?.includes('Configure'), 'Configure button');

    await scrollAndScreenshot(tPage, '14-admin-channels');

    // ── 2.7 Tenant Logout ──
    sublog('2.7 Tenant Logout');
    const userDropdown = tPage.locator('.ant-dropdown-trigger').last();
    if (await userDropdown.isVisible()) {
      await userDropdown.click();
      await delay(500);
      await tPage.click('text=Logout');
      await delay(3000);
      assert(tPage.url().includes('/login'), 'Logged out to tenant login');
      await ss(tPage, '15-tenant-logout');
    }

    await tenantCtx.close();

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`  FINAL RESULTS: ${passed} passed, ${failed} failed, ${total} total`);
  console.log('═'.repeat(70));

  process.exit(failed > 0 ? 1 : 0);
})();
