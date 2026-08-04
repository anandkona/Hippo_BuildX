const MODULES = [
  'users',
  'roles',
  'projects',
  'crm',
  'customers',
  'inventory',
  'procurement',
  'construction',
  'accounting',
  'hrms',
  'settings',
  'channels',
] as const;

const ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'export',
] as const;

type Module = (typeof MODULES)[number];
type Action = (typeof ACTIONS)[number];

function buildPermissionMatrix(): Record<string, boolean> {
  const matrix: Record<string, boolean> = {};
  for (const mod of MODULES) {
    for (const action of ACTIONS) {
      matrix[`${mod}.${action}`] = true;
    }
  }
  return matrix;
}

export const PERMISSIONS = buildPermissionMatrix();

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if user has a specific permission.
 * The wildcard '*' grants full access.
 */
export function hasPermission(
  userPermissions: string[],
  required: string
): boolean {
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}

/**
 * Check if user has any of the given permissions.
 * The wildcard '*' grants full access.
 */
export function hasAnyPermission(
  userPermissions: string[],
  required: string[]
): boolean {
  if (userPermissions.includes('*')) return true;
  return required.some((p) => userPermissions.includes(p));
}
