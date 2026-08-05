import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as controlPlaneSchema from './schema/control-plane';
import * as tenantSchema from './schema/tenant';

let _sql: postgres.Sql | null = null;
let _db: any = null;

/**
 * Get the raw postgres.js SQL client (lazy).
 */
export function getSql() {
  if (!_sql) {
    const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/build_ex';
    _sql = postgres(DATABASE_URL, { max: 10 });
  }
  return _sql;
}

/**
 * Get the control-plane Drizzle client (public schema).
 */
export function getDb() {
  if (!_db) {
    _db = drizzle(getSql(), {
      schema: {
        ...controlPlaneSchema,
        ...tenantSchema,
      },
    });
  }
  return _db;
}

/**
 * Create a tenant-scoped SQL helper bound exclusively to one tenant schema.
 *
 * Correctness (PRD §5.2):
 * - Throws if `schemaName` is missing or does not match `tenant_[a-z0-9_]+`
 *   (rejects `public` and any foreign/forged schema).
 * - Every query runs inside a transaction with
 *   `SET LOCAL search_path TO "<schemaName>", public`.
 * - Unqualified table names therefore resolve to the tenant schema first and
 *   cannot accidentally read/write another tenant's tables.
 * - `public` remains on the path only for extensions/functions (e.g. gen_random_uuid);
 *   business tables are never looked up only via an ambient global client.
 * - A repository-style call must pass tenant context via this helper (or
 *   `createTenantDb`); using `getSql()`/`getDb()` without an explicit tenant
 *   path is for control-plane/`public` only.
 */
export function createTenantSql(schemaName: string) {
  if (!schemaName) {
    throw new Error('Repository call without tenant context: schemaName is required');
  }
  if (schemaName === 'public' || !/^tenant_[a-z0-9_]+$/.test(schemaName)) {
    throw new Error(`Invalid tenant schema: ${schemaName}`);
  }
  const sql = getSql();

  async function tenantQuery(strings: TemplateStringsArray, ...values: any[]) {
    return sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
      // Bound for this txn only — search_path cannot leak across requests.
      return tx(strings, ...values);
    });
  }

  tenantQuery.unsafe = async (query: string, params: any[] = []) => {
    return sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
      return tx.unsafe(query, params);
    });
  };

  tenantQuery.schemaName = schemaName;
  return tenantQuery;
}

/**
 * Create a tenant-scoped Drizzle client.
 * @param schemaName
 */
export function createTenantDb(schemaName: string) {
  if (!schemaName) {
    throw new Error('Repository call without tenant context: schemaName is required');
  }
  if (schemaName === 'public' || !/^tenant_[a-z0-9_]+$/.test(schemaName)) {
    throw new Error(`Invalid tenant schema: ${schemaName}`);
  }
  
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/build_ex';
  const tenantClient = postgres(DATABASE_URL, {
    max: 5,
    connection: {
      // Connection-level binding — same isolation contract as createTenantSql.
      search_path: `${schemaName},public`,
    },
  });
  
  return drizzle(tenantClient, {
    schema: { ...tenantSchema },
  });
}

/**
 * Ping the database.
 */
export async function pingDatabase() {
  try {
    const sql = getSql();
    const [row] = await sql`SELECT 1 AS ok`;
    return row?.ok === 1;
  } catch (e) {
    return false;
  }
}
