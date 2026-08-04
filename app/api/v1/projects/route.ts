import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { projects } from '@/lib/db/schema/tenant';
import { generateUuid } from '@/lib/utils';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/interceptors/audit';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    
    // Check permissions
    if (!context.permissions.includes('projects.view')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    
    const projectList = await tenantSql`
      SELECT id, name, code, description, status, address, created_at, updated_at
      FROM projects
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ data: projectList });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    
    // Check permissions
    if (!context.permissions.includes('projects.create')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description, address } = body;

    if (!name) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Name is required' } }, { status: 400 });
    }

    const projectId = generateUuid();
    const tenantSql = createTenantSql(context.schemaName);

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      await tx`
        INSERT INTO projects (id, tenant_id, name, code, description, address, created_by)
        VALUES (${projectId}, ${context.tenantId}, ${name}, ${code || null}, ${description || null}, ${address || null}, ${context.userId})
      `;
    });

    // Write audit log
    await logAudit(context, 'CREATE', 'Project', projectId, body);

    return NextResponse.json({ data: { id: projectId } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: error.status || 500 }
    );
  }
}
