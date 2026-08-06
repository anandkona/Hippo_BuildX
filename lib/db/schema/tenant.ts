import { pgTable, uuid, varchar, timestamp, boolean, text, jsonb } from 'drizzle-orm/pg-core';

/**
 * Tenant-scoped base columns.
 * All tenant tables should spread these columns.
 */
export const tenantBaseColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
};

/**
 * Example tenant-scoped table: users
 * In production, each tenant gets their own schema with these tables.
 */
export const users = pgTable('users', {
  ...tenantBaseColumns,
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

export const roles = pgTable('roles', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: jsonb('permissions').notNull().default([]),
  isSystem: boolean('is_system').notNull().default(false),
});

export const userRoles = pgTable('user_roles', {
  ...tenantBaseColumns,
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  roleId: uuid('role_id')
    .notNull()
    .references(() => roles.id),
  projectId: uuid('project_id'),
  locationId: uuid('location_id'),
});

export const refreshTokens = pgTable('refresh_tokens', {
  ...tenantBaseColumns,
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 255 }),
});

export const auditLogs = pgTable('audit_logs', {
  ...tenantBaseColumns,
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
});

/** Phase 2 — Property / Project structure + Planning-lite (see migrations 002_property_planning). */
export const unitCategories = pgTable('unit_categories', {
  ...tenantBaseColumns,
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  unitType: varchar('unit_type', { length: 50 }).notNull(),
  description: text('description'),
});

export const projects = pgTable('projects', {
  ...tenantBaseColumns,
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  locationName: varchar('location_name', { length: 255 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  pincode: varchar('pincode', { length: 20 }),
  startDate: timestamp('start_date', { withTimezone: false, mode: 'string' }),
  endDate: timestamp('end_date', { withTimezone: false, mode: 'string' }),
  metadata: jsonb('metadata').notNull().default({}),
});
