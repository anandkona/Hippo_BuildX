import { hasPermission } from '@/lib/rbac/permissions';
import type { TenantContext } from '@/lib/tenant-context';

export interface ScopeCheckInput {
  /** Required permission, e.g. users.create */
  permission?: string;
  /** Module key for feature-flag axis (defaults from permission prefix) */
  module?: string;
  /** Target project — enforced when caller has non-empty project scope */
  projectId?: string | null;
  /** Target location — enforced when caller has non-empty location scope */
  locationId?: string | null;
  /**
   * When false, skip the role/permission axis (project/location-only checks).
   * Default true when used from API gates.
   */
  requireRole?: boolean;
  /**
   * Tenant feature flags map from tenant_settings.feature_flags.
   * Missing / empty map ⇒ all modules enabled (Phase 1 default).
   * Explicit `false` for a module denies access.
   */
  featureFlags?: Record<string, unknown> | null;
}

export interface ScopeCheckResult {
  allowed: boolean;
  reason?: string;
  axes: {
    role: boolean;
    module: boolean;
    project: boolean;
    location: boolean;
  };
}

function resolveModule(input: ScopeCheckInput): string | undefined {
  if (input.module) return input.module;
  if (input.permission) return input.permission.split('.')[0];
  return undefined;
}

/**
 * Four-axis AuthZ:
 * 1) role/permission (axis: role)
 * 2) module enabled for tenant (axis: module)
 * 3) project assignment (axis: project) — empty JWT projectIds ⇒ unrestricted
 * 4) location assignment (axis: location) — empty JWT locationIds ⇒ unrestricted
 *
 * tenant_admin / `*` permission bypasses role axis only; module/project/location still apply
 * unless the admin has unrestricted project/location lists (empty = unrestricted).
 */
export function evaluateScope(
  context: Pick<TenantContext, 'roles' | 'permissions' | 'projectIds' | 'locationIds'>,
  input: ScopeCheckInput = {}
): ScopeCheckResult {
  const roles = context.roles ?? [];
  const permissions = context.permissions ?? [];
  const isAdmin = roles.includes('tenant_admin') || permissions.includes('*');

  let roleOk: boolean;
  if (input.permission) {
    roleOk = isAdmin || hasPermission(permissions, input.permission);
  } else if (input.requireRole !== false) {
    // Default gate without explicit permission: tenant_admin / * only
    roleOk = isAdmin;
  } else {
    roleOk = true;
  }

  const moduleKey = resolveModule(input);
  let moduleOk = true;
  if (moduleKey && input.featureFlags && typeof input.featureFlags === 'object') {
    const flag = input.featureFlags[moduleKey];
    if (flag === false) moduleOk = false;
  }

  const scopedProjects = context.projectIds ?? [];
  let projectOk = true;
  if (input.projectId && scopedProjects.length > 0) {
    projectOk = scopedProjects.includes(input.projectId);
  }

  const scopedLocations = context.locationIds ?? [];
  let locationOk = true;
  if (input.locationId && scopedLocations.length > 0) {
    locationOk = scopedLocations.includes(input.locationId);
  }

  const axes = {
    role: Boolean(roleOk),
    module: moduleOk,
    project: projectOk,
    location: locationOk,
  };

  if (!axes.role) {
    return {
      allowed: false,
      reason: input.permission
        ? `Forbidden: missing permission ${input.permission}`
        : 'Forbidden: insufficient role',
      axes,
    };
  }
  if (!axes.module) {
    return { allowed: false, reason: `Forbidden: module disabled (${moduleKey})`, axes };
  }
  if (!axes.project) {
    return { allowed: false, reason: 'Forbidden: project out of scope', axes };
  }
  if (!axes.location) {
    return { allowed: false, reason: 'Forbidden: location out of scope', axes };
  }

  return { allowed: true, axes };
}

/** True when a resource project/location is in the caller's JWT scope. */
export function isInScope(
  context: Pick<TenantContext, 'projectIds' | 'locationIds'>,
  resource: { projectId?: string | null; locationId?: string | null }
): boolean {
  return evaluateScope(
    { ...context, roles: [], permissions: [] },
    {
      requireRole: false,
      projectId: resource.projectId,
      locationId: resource.locationId,
    }
  ).allowed;
}
