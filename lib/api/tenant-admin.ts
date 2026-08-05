import { NextResponse } from 'next/server';
import { extractContextFromHeaders, type TenantContext } from '@/lib/tenant-context';
import { hasPermission } from '@/lib/rbac/permissions';
import { assertTenantActive } from '@/lib/tenants/assert-active';
import { logAudit } from '@/lib/audit';

export type AdminAuthResult =
  | { ok: true; context: TenantContext }
  | { ok: false; response: NextResponse };

function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
}

/**
 * Tenant API gate: active tenant + tenant_admin OR matching permission.
 */
export async function requireTenantApi(
  req: Request,
  opts?: { permission?: string }
): Promise<AdminAuthResult> {
  const context = extractContextFromHeaders(req.headers);

  if (!context.schemaName || !context.tenantId || context.tenantId === 'PLATFORM') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: tenant context required' }, { status: 403 }),
    };
  }

  const active = await assertTenantActive(context.tenantId);
  if (!active.ok) return active;

  const roles = context.roles ?? [];
  const isAdmin = roles.includes('tenant_admin');

  if (isAdmin) {
    return { ok: true, context };
  }

  if (opts?.permission) {
    if (hasPermission(context.permissions ?? [], opts.permission)) {
      return { ok: true, context };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden: missing permission ${opts.permission}` },
        { status: 403 }
      ),
    };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 }),
  };
}

export async function auditTenantMutation(
  req: Request,
  context: TenantContext,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>
) {
  if (!context.userId || !context.schemaName) return;
  await logAudit({
    schemaName: context.schemaName,
    tenantId: context.tenantId,
    userId: context.userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: clientIp(req),
  });
}
