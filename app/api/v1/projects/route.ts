import { NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { requireTenantApi, withAudit } from '@/lib/api/tenant-admin';
import { createProject } from '@/lib/projects/hierarchy';
import { ensureDefaultUnitCategories } from '@/lib/projects/defaults';

function toInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 1 ? fallback : n;
}

export async function GET(req: Request) {
  try {
    const auth = await requireTenantApi(req, { permission: 'projects.read', module: 'projects' });
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const page = toInt(url.searchParams.get('page'), 1);
    const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);
    const search = url.searchParams.get('search');
    const offset = (page - 1) * pageSize;

    const sql = createTenantSql(auth.context.schemaName!);
    const scoped = auth.context.projectIds || [];

    if (search) {
      const params: unknown[] = [`%${search}%`];
      let where = `deleted_at IS NULL AND (name ILIKE $1 OR code ILIKE $1)`;
      if (scoped.length) {
        where += ` AND id = ANY($${params.length + 1}::uuid[])`;
        params.push(scoped);
      }
      const countResult = await sql.unsafe(
        `SELECT COUNT(*)::text AS count FROM projects WHERE ${where}`,
        params
      );
      const total = parseInt(countResult[0]?.count ?? '0', 10);
      const data = await sql.unsafe(
        `SELECT * FROM projects WHERE ${where}
         ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
        params
      );
      return NextResponse.json({ data, meta: { total, page, pageSize } });
    }

    if (scoped.length) {
      const countResult = await sql`
        SELECT COUNT(*)::text AS count FROM projects
        WHERE deleted_at IS NULL AND id = ANY(${scoped}::uuid[])
      `;
      const total = parseInt(countResult[0]?.count ?? '0', 10);
      const data = await sql`
        SELECT * FROM projects
        WHERE deleted_at IS NULL AND id = ANY(${scoped}::uuid[])
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      return NextResponse.json({ data, meta: { total, page, pageSize } });
    }

    const countResult = await sql`
      SELECT COUNT(*)::text AS count FROM projects WHERE deleted_at IS NULL
    `;
    const total = parseInt(countResult[0]?.count ?? '0', 10);
    const data = await sql`
      SELECT * FROM projects
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    return NextResponse.json({ data, meta: { total, page, pageSize } });
  } catch (error) {
    console.error('List projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAudit(
  { permission: 'projects.create', resource: 'project', action: 'Created Project', module: 'projects' },
  async ({ req, context, audit }) => {
    const body = await req.json();
    const { code, name, description, status, locationName, address, city, state, pincode, startDate, endDate, metadata } =
      body as Record<string, unknown>;

    if (!code || !name || typeof code !== 'string' || typeof name !== 'string') {
      return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
    }

    await ensureDefaultUnitCategories(context.schemaName!, context.tenantId);

    try {
      const project = await createProject(context.schemaName!, {
        tenantId: context.tenantId,
        userId: context.userId,
        code,
        name,
        description: (description as string) || null,
        status: (status as string) || 'draft',
        locationName: (locationName as string) || null,
        address: (address as string) || null,
        city: (city as string) || null,
        state: (state as string) || null,
        pincode: (pincode as string) || null,
        startDate: (startDate as string) || null,
        endDate: (endDate as string) || null,
        metadata: (metadata as Record<string, unknown>) || {},
      });

      audit({ resourceId: project.id as string, details: { code, name } });
      return NextResponse.json({ data: project }, { status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create project';
      if (msg.toLowerCase().includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json({ error: 'A project with this code already exists' }, { status: 409 });
      }
      throw error;
    }
  }
);
