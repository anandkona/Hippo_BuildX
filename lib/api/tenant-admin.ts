import { NextResponse } from 'next/server';
import { extractContextFromHeaders, type TenantContext } from '@/lib/tenant-context';
import { assertTenantActive } from '@/lib/tenants/assert-active';
import { logAudit } from '@/lib/audit';
import { evaluateScope, type ScopeCheckInput } from '@/lib/rbac/scope';
import { createTenantSql } from '@/lib/db/client';

export type AdminAuthResult =
  | { ok: true; context: TenantContext }
  | { ok: false; response: NextResponse };

function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
}

async function loadFeatureFlags(schemaName: string): Promise<Record<string, unknown> | null> {
  try {
    const sql = createTenantSql(schemaName);
    const [row] = await sql`
      SELECT value FROM tenant_settings WHERE key = 'feature_flags' LIMIT 1
    `;
    if (!row?.value || typeof row.value !== 'object') return null;
    return row.value as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Tenant API gate: active tenant + four-axis scope (role/module/project/location).
 */
export async function requireTenantApi(
  req: Request,
  opts?: ScopeCheckInput
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

  const featureFlags =
    opts?.featureFlags !== undefined
      ? opts.featureFlags
      : await loadFeatureFlags(context.schemaName);

  const scope = evaluateScope(context, { ...opts, featureFlags });
  if (!scope.allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: scope.reason || 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, context };
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
