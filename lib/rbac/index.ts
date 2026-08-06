export {
  MODULES,
  hasPermission,
  hasAnyPermission,
} from '@/lib/rbac/permissions';

export {
  createGuard,
  requireRole,
  requirePermission,
} from '@/lib/rbac/guard';

export {
  evaluateScope,
  isInScope,
  type ScopeCheckInput,
  type ScopeCheckResult,
} from '@/lib/rbac/scope';
