import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  schemaName: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
  projectIds?: string[];
  locationIds?: string[];
  correlationId?: string;
}

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Extracts context from Request headers injected by middleware.
 */
export function extractContextFromHeaders(headers: Headers): TenantContext {
  return {
    tenantId: headers.get('x-tenant-id') || '',
    schemaName: headers.get('x-schema-name') || '',
    userId: headers.get('x-user-id') || undefined,
    roles: JSON.parse(headers.get('x-roles') || '[]'),
  };
}

/**
 * Runs a callback within a specific tenant context.
 */
export function runWithTenantContext<T>(context: TenantContext, callback: () => T): T {
  return tenantContextStorage.run(context, callback);
}

/**
 * Retrieves the current tenant context.
 * Throws an error if no context is found, ensuring safety against global data access.
 */
export function getTenantContext(): TenantContext {
  const context = tenantContextStorage.getStore();
  if (!context) {
    throw new Error('Tenant context is not initialized. Cross-tenant access is prohibited.');
  }
  return context;
}

/**
 * Retrieves the current tenant context safely without throwing.
 */
export function getTenantContextSafe(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}
