/**
 * Permission helpers. Supports:
 * - `*` full access
 * - `module.*` all actions on module
 * - exact `module.action`
 */
export function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(required)) return true;

  const [mod] = required.split('.');
  if (mod && userPermissions.includes(`${mod}.*`)) return true;

  return false;
}

export function hasAnyPermission(userPermissions: string[], required: string[]): boolean {
  if (userPermissions.includes('*')) return true;
  return required.some((p) => hasPermission(userPermissions, p));
}

export const MODULES = [
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
