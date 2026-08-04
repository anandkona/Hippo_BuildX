import { NextResponse } from 'next/server';
import { extractContextFromHeaders, type TenantContext } from '@/lib/tenant-context';
import { hasPermission } from '@/lib/rbac/permissions';

export type GuardResult = { ok: true; context: TenantContext } | { ok: false; response: NextResponse };

/**
 * Creates an RBAC guard that checks whether the request caller holds at least
 * one of the `allowedRoles`. Returns a typed result so callers can branch
 * on success/failure without a second extraction.
 */
export function createGuard(allowedRoles: string[]) {
  return async function guard(request: Request): Promise<GuardResult> {
    const context = extractContextFromHeaders(request.headers);

    if (!context.schemaName) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Forbidden: Missing tenant context' },
          { status: 403 }
        ),
      };
    }

    const userRoles = context.roles ?? [];
    const isAllowed = allowedRoles.some((role) => userRoles.includes(role));

    if (!isAllowed) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Forbidden: Insufficient role' },
          { status: 403 }
        ),
      };
    }

    return { ok: true, context };
  };
}

/**
 * Convenience guard that checks for a single role.
 */
export function requireRole(role: string) {
  return createGuard([role]);
}

/**
 * Guard that additionally verifies the caller's permissions array includes
 * the specified `module.action` permission.
 */
export function requirePermission(module: string, action: string) {
  const permission = `${module}.${action}`;
  const baseGuard = createGuard(['tenant_admin']);

  return async function permissionGuard(
    request: Request
  ): Promise<GuardResult> {
    const base = await baseGuard(request);
    if (!base.ok) return base;

    const context = base.context;
    const userPermissions = context.permissions ?? [];

    if (!hasPermission(userPermissions, permission)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: `Forbidden: Missing permission ${permission}` },
          { status: 403 }
        ),
      };
    }

    return { ok: true, context };
  };
}
