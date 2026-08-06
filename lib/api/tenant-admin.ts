import { NextResponse } from 'next/server';
import { extractContextFromHeaders, type TenantContext } from '@/lib/tenant-context';
import { assertTenantActive } from '@/lib/tenants/assert-active';
import { logAudit } from '@/lib/audit';
import { evaluateScope, type ScopeCheckInput } from '@/lib/rbac/scope';
import { createTenantSql } from '@/lib/db/client';

export type AdminAuthResult =
  | { ok: true; context: TenantContext }
  | { ok: false; response: NextResponse };

export type RouteContext = {
  params?: Promise<Record<string, string>>;
};

export type AuditMeta = {
  resourceId?: string;
  details?: Record<string, unknown>;
  /** Override default action label for this response */
  action?: string;
  /** Skip audit for this response (e.g. no-op paths) */
  skip?: boolean;
};

export type MutationHandlerArgs = {
  req: Request;
  context: TenantContext;
  routeCtx?: RouteContext;
  /** Call before returning a successful mutation response to attach audit metadata */
  audit: (meta?: AuditMeta) => void;
};

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

export type WithAuditOptions = ScopeCheckInput & {
  /** Audit resource name, e.g. user | role | settings | channel */
  resource: string;
  /** Default audit action label when handler does not override */
  action: string;
};

/**
 * Shared interceptor for state-changing tenant admin endpoints (PRD §14.7).
 *
 * Flow: AuthZ (`requireTenantApi`) → handler → audit on 2xx responses.
 * Handlers must not call `auditTenantMutation` manually; use `audit()` to attach metadata.
 *
 * @example
 * export const POST = withAudit(
 *   { permission: 'users.create', resource: 'user', action: 'Created User' },
 *   async ({ req, context, audit }) => {
 *     // ... mutate ...
 *     audit({ resourceId: id, details: { email } });
 *     return NextResponse.json({ data: { id } }, { status: 201 });
 *   }
 * );
 */
export function withAudit(
  opts: WithAuditOptions,
  handler: (args: MutationHandlerArgs) => Promise<NextResponse>
) {
  return async (req: Request, routeCtx?: RouteContext): Promise<NextResponse> => {
    try {
      const auth = await requireTenantApi(req, opts);
      if (!auth.ok) return auth.response;

      let meta: AuditMeta = {};
      const response = await handler({
        req,
        context: auth.context,
        routeCtx,
        audit: (patch) => {
          meta = { ...meta, ...patch };
        },
      });

      const shouldAudit =
        !meta.skip && response.status >= 200 && response.status < 300;

      if (shouldAudit) {
        await auditTenantMutation(
          req,
          auth.context,
          meta.action || opts.action,
          opts.resource,
          meta.resourceId,
          meta.details
        );
      }

      return response;
    } catch (error) {
      console.error(`[withAudit:${opts.resource}]`, error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

/** Alias matching review naming */
export const withTenantMutation = withAudit;
