import { pgTable, uuid, varchar, timestamp, jsonb, unique, boolean, integer, text } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  schemaName: varchar('schema_name', { length: 100 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull().default('provisioning'),
  /** Registered / legal name (may differ from display name) */
  legalName: varchar('legal_name', { length: 255 }),
  industry: varchar('industry', { length: 100 }).default('Construction'),
  companySize: varchar('company_size', { length: 50 }),
  gstin: varchar('gstin', { length: 20 }),
  pan: varchar('pan', { length: 20 }),
  cin: varchar('cin', { length: 30 }),
  website: varchar('website', { length: 255 }),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  pincode: varchar('pincode', { length: 20 }),
  country: varchar('country', { length: 100 }).default('India'),
  contactName: varchar('contact_name', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 30 }),
  contactDesignation: varchar('contact_designation', { length: 100 }),
  billingEmail: varchar('billing_email', { length: 255 }),
  adminName: varchar('admin_name', { length: 255 }),
  adminEmail: varchar('admin_email', { length: 255 }),
  branding: jsonb('branding'),
  featureFlags: jsonb('feature_flags'),
  usage: jsonb('usage').$type<{
    users?: number;
    projects?: number;
    storageGb?: number;
    apiCalls?: number;
  }>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const tenantMigrations = pgTable(
  'tenant_migrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    migrationName: varchar('migration_name', { length: 255 }).notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('tenant_migrations_tenant_name_uq').on(table.tenantId, table.migrationName)],
);

/** Allowed tenant status values */
export const TENANT_STATUS = Object.freeze({
  PROVISIONING: 'provisioning',
  ACTIVE: 'active',
  FAILED: 'failed',
  SUSPENDED: 'suspended',
});

export const PLATFORM_USER_ROLES = Object.freeze({
  PLATFORM_OWNER: 'platform_owner',
  PLATFORM_ADMIN: 'platform_admin',
  SUPPORT_MANAGER: 'support_manager',
  BILLING_MANAGER: 'billing_manager',
  READ_ONLY: 'read_only',
});

export const platformUsers = pgTable('platform_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('platform_admin'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

export const platformSessions = pgTable('platform_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformUserId: uuid('platform_user_id').notNull().references(() => platformUsers.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 255 }),
});

/** One-time invite for tenant admins to set their own password */
export const tenantInvites = pgTable('tenant_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** One-time password reset for platform or tenant users */
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: varchar('scope', { length: 20 }).notNull(), // platform | tenant
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Subscription plans available on the platform */
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull().default('monthly'),
  maxUsers: integer('max_users').notNull().default(5),
  maxProjects: integer('max_projects').notNull().default(1),
  maxStorageGb: integer('max_storage_gb').notNull().default(5),
  maxApiCalls: integer('max_api_calls').notNull().default(10000),
  supportLevel: varchar('support_level', { length: 50 }).notNull().default('Email'),
  featureFlags: jsonb('feature_flags').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Tenant subscriptions — links a tenant to a plan */
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  planId: uuid('plan_id').notNull().references(() => plans.id),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Subscription status values */
export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  TRIAL: 'trial',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

/** Platform-level feature flags / kill-switches */
export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  enabled: boolean('enabled').notNull().default(true),
  scope: varchar('scope', { length: 20 }).notNull().default('global'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Platform system settings (key/value jsonb sections) */
export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Platform-wide audit log */
export const platformAuditLogs = pgTable('platform_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => platformUsers.id),
  actorEmail: varchar('actor_email', { length: 255 }),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: varchar('resource_id', { length: 100 }),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
