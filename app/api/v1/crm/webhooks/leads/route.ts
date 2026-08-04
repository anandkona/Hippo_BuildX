import { NextRequest, NextResponse } from 'next/server';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

/**
 * Webhook ingestion for leads (e.g., from Meta, Website forms).
 * Real systems use API keys/signatures. For MVP, we pass tenant_id via query param.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenant_id');
    const sourceName = req.nextUrl.searchParams.get('source') || 'webhook'; // e.g., 'meta', 'website'

    if (!tenantId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing tenant_id' } }, { status: 401 });
    }

    const body = await req.json();
    
    // Normalize payload based on source
    let firstName = '';
    let lastName = '';
    let phone = '';
    let email = '';

    if (sourceName === 'meta') {
      firstName = body.first_name;
      lastName = body.last_name;
      phone = body.phone_number;
      email = body.email;
    } else {
      // default generic parsing
      firstName = body.firstName || body.name || 'Unknown';
      lastName = body.lastName || '';
      phone = body.phone || body.phoneNumber || '';
      email = body.email || '';
    }

    if (!firstName || (!phone && !email)) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Could not parse sufficient lead details' } }, { status: 400 });
    }

    // Resolve tenant schema. In real app, look up by tenantId.
    const { getSql } = require('@/lib/db/client');
    const sql = getSql();
    const [tenantRow] = await sql`SELECT schema_name FROM tenants WHERE id = ${tenantId} AND deleted_at IS NULL`;
    
    if (!tenantRow) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, { status: 404 });
    }

    const schemaName = tenantRow.schema_name;
    const tenantSql = createTenantSql(schemaName);
    const leadId = generateUuid();

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
      
      // Ensure source exists or create it
      let sourceId = null;
      const [existingSource] = await tx`SELECT id FROM lead_sources WHERE name = ${sourceName} LIMIT 1`;
      
      if (existingSource) {
        sourceId = existingSource.id;
      } else {
        sourceId = generateUuid();
        await tx`INSERT INTO lead_sources (id, tenant_id, name, type) VALUES (${sourceId}, ${tenantId}, ${sourceName}, ${sourceName})`;
      }

      await tx`
        INSERT INTO leads (id, tenant_id, first_name, last_name, phone, email, source_id, status)
        VALUES (${leadId}, ${tenantId}, ${firstName}, ${lastName || null}, ${phone || null}, ${email || null}, ${sourceId}, 'Lead')
      `;
      
      const activityId = generateUuid();
      await tx`
        INSERT INTO lead_activities (id, tenant_id, lead_id, type, notes)
        VALUES (${activityId}, ${tenantId}, ${leadId}, 'note', 'Lead ingested via webhook from ' || ${sourceName})
      `;
    });

    // We pass a mock context to logAudit for webhook
    const mockContext = { tenantId, schemaName, userId: null, permissions: [] };
    await logAudit(mockContext as any, 'WEBHOOK_INGEST', 'Lead', leadId, { source: sourceName });

    return NextResponse.json({ data: { id: leadId, message: 'Lead ingested successfully' } }, { status: 201 });
  } catch (error: any) {
    console.error('Error ingesting webhook lead:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: error.status || 500 }
    );
  }
}
