import { NextResponse } from 'next/server';
import {
  requireTenantApi,
  auditTenantMutation,
  type AdminAuthResult,
  type AuditMeta,
  type MutationHandlerArgs,
  type RouteContext,
  type WithAuditOptions,
} from '@/lib/api/tenant-admin';
import { createTenantSql } from '@/lib/db/client';
import type { TenantContext } from '@/lib/tenant-context';

export type ProjectMutationArgs = MutationHandlerArgs & {
  projectId: string;
  project: Record<string, unknown>;
};

async function loadProject(schemaName: string, projectId: string) {
  const sql = createTenantSql(schemaName);
  const [row] = await sql`
    SELECT * FROM projects
    WHERE id = ${projectId} AND deleted_at IS NULL
    LIMIT 1
  `;
  return row || null;
}

/**
 * Tenant AuthZ gated on projects.* + JWT project scope.
 * Verifies the project exists in the tenant schema.
 */
export async function requireProjectApi(
  req: Request,
  projectId: string,
  opts: { permission: string }
): Promise<(AdminAuthResult & { project?: Record<string, unknown> })> {
  const auth = await requireTenantApi(req, {
    permission: opts.permission,
    projectId,
    module: 'projects',
  });
  if (!auth.ok) return auth;

  const project = await loadProject(auth.context.schemaName!, projectId);
  if (!project) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
    };
  }

  return { ok: true, context: auth.context, project };
}

/** Mutation HOF: resolve :projectId → scope + existence → handler → audit on 2xx. */
export function withProjectAudit(
  opts: WithAuditOptions,
  handler: (args: ProjectMutationArgs) => Promise<NextResponse>
) {
  return async (req: Request, routeCtx?: RouteContext): Promise<NextResponse> => {
    try {
      const params = routeCtx?.params ? await routeCtx.params : {};
      const projectId = params.projectId;
      if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
      }

      const auth = await requireProjectApi(req, projectId, {
        permission: opts.permission || 'projects.update',
      });
      if (!auth.ok) return auth.response;

      let meta: AuditMeta = {};
      const response = await handler({
        req,
        context: auth.context,
        routeCtx,
        projectId,
        project: auth.project!,
        audit: (patch) => {
          meta = { ...meta, ...patch };
        },
      });

      const shouldAudit = !meta.skip && response.status >= 200 && response.status < 300;
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
      console.error(`[withProjectAudit:${opts.resource}]`, error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export async function assertProjectReadable(
  context: TenantContext,
  projectId: string
): Promise<{ ok: true; project: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const project = await loadProject(context.schemaName!, projectId);
  if (!project) {
    return { ok: false, response: NextResponse.json({ error: 'Project not found' }, { status: 404 }) };
  }
  return { ok: true, project };
}

export type { AuditMeta, RouteContext };
