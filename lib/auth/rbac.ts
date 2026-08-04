import { TokenPayload } from './jwt';

export type RequiredScope = {
  action: string;
  projectId?: string;
  locationId?: string;
};

/**
 * Checks if the user has the required permission for the given scope.
 * 
 * The full 4-axis check involves:
 * 1. Role: Does the user's role have the `action`? (Checked against DB or JWT)
 * 2. Module: Is the module enabled for the tenant? (Checked against tenant flags)
 * 3. Project: Is the user assigned to `projectId`? (If applicable)
 * 4. Location: Is the user assigned to `locationId`? (If applicable)
 */
export async function checkPermission(
  payload: TokenPayload,
  scope: RequiredScope
): Promise<boolean> {
  // If the user is a platform admin and the action is a platform action, allow.
  if (payload.isPlatformAdmin && scope.action.startsWith('platform.')) {
    return true;
  }

  // TODO: In a full implementation, we would query the database here to:
  // 1. Fetch the actual permissions JSON for the user's roles (`payload.roles`).
  // 2. Fetch the tenant's feature flags to ensure the module is active.
  // 3. Verify user_roles mapping for projectId and locationId.
  //
  // For Phase 1 foundational setup, we stub this out to return true 
  // so we can build the API routes, and we'll wire up the DB queries next.

  console.log(`[RBAC] Checking permission '${scope.action}' for user ${payload.userId}`);
  return true;
}

/**
 * Middleware helper to assert permissions
 */
export async function requirePermission(payload: TokenPayload, scope: RequiredScope) {
  const allowed = await checkPermission(payload, scope);
  if (!allowed) {
    throw new Error(`Forbidden: Missing permission ${scope.action}`);
  }
}

export function getTenantContext(req: any) {
  // In a real implementation this extracts from the JWT or request headers.
  // We'll mock it for now since middleware handles verification
  return {
    userId: 'mock-user-id',
    tenantId: 'mock-tenant-id',
    schemaName: 'tenant_mock',
    roles: ['admin']
  };
}
