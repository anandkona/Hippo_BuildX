import 'dotenv/config';
import { getSql, getDb } from '../lib/db/client';
import {
  platformUsers,
  tenants,
  plans,
  subscriptions,
  featureFlags,
  platformSettings,
  platformAuditLogs,
} from '../lib/db/schema/control-plane';
import { hashPassword } from '../lib/auth/crypto';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Starting database seed...');

  const sql = getSql();
  const db = getDb();
  const passwordHash = await hashPassword('password123');

  try {
    // --- Platform users ---
    const userDefs = [
      { name: 'Rajesh Kumar', email: 'super@buildx.com', role: 'platform_owner' },
      { name: 'Priya Sharma', email: 'admin@buildx.com', role: 'platform_admin' },
      { name: 'Amit Patel', email: 'support@buildx.com', role: 'support_manager' },
      { name: 'Sneha Reddy', email: 'billing@buildx.com', role: 'billing_manager' },
      { name: 'Vikram Singh', email: 'readonly@buildx.com', role: 'read_only' },
    ];

    for (const u of userDefs) {
      const [existing] = await db.select().from(platformUsers).where(eq(platformUsers.email, u.email));
      if (!existing) {
        console.log(`Creating platform user ${u.email}...`);
        await db.insert(platformUsers).values({
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role,
          isActive: true,
          lastLoginAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        });
      } else {
        await db
          .update(platformUsers)
          .set({ role: u.role, name: u.name, isActive: true })
          .where(eq(platformUsers.email, u.email));
        console.log(`Updated platform user ${u.email}`);
      }
    }

    // --- Plans ---
    const planDefs = [
      {
        name: 'basic',
        displayName: 'Basic',
        description: 'Small teams getting started',
        price: 999,
        maxUsers: 10,
        maxProjects: 5,
        maxStorageGb: 5,
        maxApiCalls: 10000,
        supportLevel: 'Email',
        sortOrder: 1,
        featureFlags: { multiCompany: false, advancedReports: false, apiAccess: false },
      },
      {
        name: 'professional',
        displayName: 'Professional',
        description: 'Growing companies — Most Popular',
        price: 2499,
        maxUsers: 50,
        maxProjects: 100,
        maxStorageGb: 10,
        maxApiCalls: 100000,
        supportLevel: 'Priority Email',
        sortOrder: 2,
        featureFlags: { multiCompany: true, advancedReports: true, apiAccess: true },
      },
      {
        name: 'business',
        displayName: 'Business',
        description: 'Established businesses',
        price: 5499,
        maxUsers: 200,
        maxProjects: 500,
        maxStorageGb: 50,
        maxApiCalls: 500000,
        supportLevel: 'Phone + Email',
        sortOrder: 3,
        featureFlags: { multiCompany: true, advancedReports: true, apiAccess: true, workflowAutomation: true },
      },
      {
        name: 'enterprise',
        displayName: 'Enterprise',
        description: 'Large enterprises — Custom pricing',
        price: 0,
        maxUsers: 9999,
        maxProjects: 9999,
        maxStorageGb: 500,
        maxApiCalls: 9999999,
        supportLevel: 'Dedicated CSM',
        sortOrder: 4,
        featureFlags: { multiCompany: true, advancedReports: true, apiAccess: true, workflowAutomation: true, sso: true },
      },
    ];

    const planIds: Record<string, string> = {};
    for (const p of planDefs) {
      const [existing] = await db.select().from(plans).where(eq(plans.name, p.name));
      if (!existing) {
        console.log(`Creating plan ${p.displayName}...`);
        const [created] = await db.insert(plans).values(p).returning();
        planIds[p.name] = created.id;
      } else {
        const [updated] = await db
          .update(plans)
          .set({
            displayName: p.displayName,
            description: p.description,
            price: p.price,
            maxUsers: p.maxUsers,
            maxProjects: p.maxProjects,
            maxStorageGb: p.maxStorageGb,
            maxApiCalls: p.maxApiCalls,
            supportLevel: p.supportLevel,
            sortOrder: p.sortOrder,
            featureFlags: p.featureFlags,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(plans.name, p.name))
          .returning();
        planIds[p.name] = updated.id;
        console.log(`Updated plan ${p.displayName}`);
      }
    }

    // --- Tenants ---
    const tenantDefs = [
      {
        name: 'ABC Constructions',
        slug: 'abc-constructions',
        status: 'active',
        plan: 'professional',
        usage: { users: 24, projects: 12, storageGb: 2.4, apiCalls: 75000 },
        createdDaysAgo: 120,
      },
      {
        name: 'Larsen Infra Pvt Ltd',
        slug: 'larsen-infra',
        status: 'active',
        plan: 'enterprise',
        usage: { users: 480, projects: 124, storageGb: 210, apiCalls: 4200000 },
        createdDaysAgo: 340,
      },
      {
        name: 'Shapoorji Homes',
        slug: 'shapoorji-homes',
        status: 'active',
        plan: 'business',
        usage: { users: 156, projects: 64, storageGb: 48, apiCalls: 890000 },
        createdDaysAgo: 280,
      },
      {
        name: 'Demo Builders Inc.',
        slug: 'demo',
        status: 'active',
        plan: 'business',
        usage: { users: 45, projects: 28, storageGb: 12.1, apiCalls: 180000 },
        createdDaysAgo: 90,
      },
      {
        name: 'Skyline Developers',
        slug: 'skyline',
        status: 'active',
        plan: 'basic',
        usage: { users: 8, projects: 3, storageGb: 1.2, apiCalls: 4200 },
        createdDaysAgo: 60,
      },
      {
        name: 'Horizon Realty',
        slug: 'horizon',
        status: 'active',
        plan: 'enterprise',
        usage: { users: 312, projects: 86, storageGb: 120, apiCalls: 2100000 },
        createdDaysAgo: 200,
      },
      {
        name: 'Prestige Projects',
        slug: 'prestige',
        status: 'active',
        plan: 'professional',
        usage: { users: 38, projects: 19, storageGb: 6.2, apiCalls: 112000 },
        createdDaysAgo: 75,
      },
      {
        name: 'BuildRight Corp',
        slug: 'buildright',
        status: 'suspended',
        plan: 'professional',
        usage: { users: 18, projects: 7, storageGb: 3.5, apiCalls: 22000 },
        createdDaysAgo: 45,
      },
      {
        name: 'Greenfield Homes',
        slug: 'greenfield',
        status: 'provisioning',
        plan: 'basic',
        usage: { users: 0, projects: 0, storageGb: 0, apiCalls: 0 },
        createdDaysAgo: 1,
      },
      {
        name: 'Metro Structures',
        slug: 'metro',
        status: 'active',
        plan: 'business',
        usage: { users: 92, projects: 41, storageGb: 28, apiCalls: 410000 },
        createdDaysAgo: 150,
      },
      {
        name: 'Prime Estates',
        slug: 'prime',
        status: 'active',
        plan: 'professional',
        usage: { users: 31, projects: 15, storageGb: 4.8, apiCalls: 88000 },
        createdDaysAgo: 30,
      },
      {
        name: 'Godrej Properties West',
        slug: 'godrej-west',
        status: 'active',
        plan: 'enterprise',
        usage: { users: 265, projects: 71, storageGb: 95, apiCalls: 1650000 },
        createdDaysAgo: 190,
      },
    ];

    const tenantIds: Record<string, string> = {};
    for (const t of tenantDefs) {
      const [existing] = await db.select().from(tenants).where(eq(tenants.slug, t.slug));
      const createdAt = new Date(Date.now() - t.createdDaysAgo * 24 * 60 * 60 * 1000);
      if (!existing) {
        console.log(`Creating tenant ${t.name}...`);
        const [created] = await db
          .insert(tenants)
          .values({
            name: t.name,
            slug: t.slug,
            schemaName: `tenant_${t.slug.replace(/[^a-z0-9_]/g, '_')}`,
            status: t.status,
            usage: t.usage,
            featureFlags: {},
            createdAt,
            updatedAt: createdAt,
          })
          .returning();
        tenantIds[t.slug] = created.id;
      } else {
        await db
          .update(tenants)
          .set({
            name: t.name,
            status: t.status,
            usage: t.usage,
            updatedAt: new Date(),
          })
          .where(eq(tenants.slug, t.slug));
        tenantIds[t.slug] = existing.id;
        console.log(`Updated tenant ${t.name}`);
      }

      // Subscription
      const tenantId = tenantIds[t.slug];
      const planId = planIds[t.plan];
      if (tenantId && planId) {
        const [existingSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.tenantId, tenantId));
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        const subStatus = t.status === 'suspended' ? 'past_due' : t.status === 'provisioning' ? 'trial' : 'active';
        if (!existingSub) {
          await db.insert(subscriptions).values({
            tenantId,
            planId,
            status: subStatus,
            expiresAt,
          });
        } else {
          await db
            .update(subscriptions)
            .set({ planId, status: subStatus, expiresAt, updatedAt: new Date() })
            .where(eq(subscriptions.id, existingSub.id));
        }
      }
    }

    // --- Feature flags ---
    const flagDefs = [
      {
        key: 'multi_company',
        name: 'Multi Company',
        description: 'Allow tenants to manage multiple companies under one account',
        enabled: true,
      },
      {
        key: 'advanced_reports',
        name: 'Advanced Reports',
        description: 'Unlock advanced analytics and custom report builder',
        enabled: true,
      },
      {
        key: 'api_access',
        name: 'API Access',
        description: 'Enable REST API access for integrations',
        enabled: false,
      },
      {
        key: 'workflow_automation',
        name: 'Workflow Automation',
        description: 'Automated workflows and approval chains',
        enabled: true,
      },
      {
        key: 'file_upload',
        name: 'File Upload',
        description: 'Allow document and media uploads',
        enabled: true,
      },
    ];

    for (const f of flagDefs) {
      const [existing] = await db.select().from(featureFlags).where(eq(featureFlags.key, f.key));
      if (!existing) {
        await db.insert(featureFlags).values({ ...f, scope: 'global' });
        console.log(`Created feature flag ${f.key}`);
      } else {
        await db
          .update(featureFlags)
          .set({ name: f.name, description: f.description, enabled: f.enabled, updatedAt: new Date() })
          .where(eq(featureFlags.key, f.key));
      }
    }

    // --- Platform settings ---
    const settingsDefs: Record<string, Record<string, unknown>> = {
      general: {
        platformName: 'HIPPO BUILD X',
        platformUrl: 'https://app.hippobuildx.com',
        supportEmail: 'support@hippobuildx.com',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
      },
      email: {
        provider: 'brevo',
        fromName: 'Hippo Build X',
        fromEmail: 'noreply@hippobuildx.com',
      },
      storage: {
        provider: 's3',
        bucket: 'hippo-buildx',
        region: 'ap-south-1',
      },
      security: {
        sessionTimeoutMinutes: 15,
        requireMfa: false,
        passwordMinLength: 8,
      },
      notifications: {
        emailAlerts: true,
        slackWebhook: '',
      },
      integrations: {
        webhookBaseUrl: 'https://app.hippobuildx.com/api/webhooks',
      },
      backup: {
        enabled: true,
        schedule: 'daily',
        retentionDays: 30,
      },
    };

    for (const [key, value] of Object.entries(settingsDefs)) {
      const [existing] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
      if (!existing) {
        await db.insert(platformSettings).values({ key, value });
        console.log(`Created settings section ${key}`);
      } else {
        await db
          .update(platformSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(platformSettings.key, key));
      }
    }

    // --- Sample audit logs (refresh clean realistic set) ---
    await db.delete(platformAuditLogs);
    const [owner] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, 'super@buildx.com'));
    const [admin] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, 'admin@buildx.com'));
    const [billing] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, 'billing@buildx.com'));

    const auditSamples = [
      { actor: owner, action: 'Created Tenant', resource: 'tenant', details: 'Created tenant Larsen Infra Pvt Ltd', daysAgo: 12, ip: '103.21.244.12' },
      { actor: admin, action: 'Created Tenant', resource: 'tenant', details: 'Created tenant Prestige Projects', daysAgo: 10, ip: '103.21.244.18' },
      { actor: billing, action: 'Assigned Subscription', resource: 'subscription', details: 'Assigned Enterprise to Shapoorji Homes', daysAgo: 8, ip: '49.36.112.40' },
      { actor: owner, action: 'Updated Plan', resource: 'plan', details: 'Updated Professional plan max users to 50', daysAgo: 6, ip: '103.21.244.12' },
      { actor: admin, action: 'Suspended Tenant', resource: 'tenant', details: 'Suspended BuildRight Corp for payment failure', daysAgo: 4, ip: '103.21.244.18' },
      { actor: billing, action: 'Assigned Subscription', resource: 'subscription', details: 'Assigned Business to Metro Structures', daysAgo: 3, ip: '49.36.112.40' },
      { actor: owner, action: 'Toggled Feature Flag', resource: 'feature_flag', details: 'Disabled API Access globally', daysAgo: 2, ip: '103.21.244.12' },
      { actor: admin, action: 'Updated Settings', resource: 'settings', details: 'Updated General settings (support email)', daysAgo: 1.5, ip: '103.21.244.18' },
      { actor: owner, action: 'Resumed Tenant', resource: 'tenant', details: 'Resumed Skyline Developers after onboarding', daysAgo: 1, ip: '103.21.244.12' },
      { actor: billing, action: 'Updated Subscription', resource: 'subscription', details: 'Upgraded Prime Estates to Professional', daysAgo: 0.4, ip: '49.36.112.40' },
    ];
    for (const a of auditSamples) {
      await db.insert(platformAuditLogs).values({
        actorUserId: a.actor?.id,
        actorEmail: a.actor?.email || 'super@buildx.com',
        action: a.action,
        resource: a.resource,
        details: a.details,
        ipAddress: a.ip,
        createdAt: new Date(Date.now() - a.daysAgo * 24 * 60 * 60 * 1000),
      });
    }
    console.log(`Seeded ${auditSamples.length} realistic platform audit logs`);

    console.log('Seed complete!');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

seed();
