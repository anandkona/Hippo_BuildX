import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';
import { generateUuid } from '@/lib/utils';
import { logAudit } from '@/lib/interceptors/audit';

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const context = getTenantContext(req);
    const { projectId } = params;
    
    // Check permissions
    if (!context.permissions.includes('projects.create')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
    }

    const body = await req.json();
    const { 
      blocksCount, 
      towersPerBlock, 
      floorsPerTower, 
      unitsPerFloor, 
      namingConvention = 'numeric' // numeric, alpha, alphnumeric
    } = body;

    if (!blocksCount || !towersPerBlock || !floorsPerTower || !unitsPerFloor) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing generation parameters' } }, { status: 400 });
    }

    const tenantSql = createTenantSql(context.schemaName);
    let totalUnits = 0;

    await tenantSql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path TO "${context.schemaName}", public`);
      
      // Verify project exists
      const projectRows = await tx`SELECT id FROM projects WHERE id = ${projectId}`;
      if (projectRows.length === 0) {
        throw new Error('Project not found');
      }

      for (let b = 1; b <= blocksCount; b++) {
        const blockId = generateUuid();
        const blockName = `Block ${b}`;
        await tx`INSERT INTO blocks (id, tenant_id, project_id, name) VALUES (${blockId}, ${context.tenantId}, ${projectId}, ${blockName})`;

        for (let t = 1; t <= towersPerBlock; t++) {
          const towerId = generateUuid();
          const towerName = `Tower ${t}`;
          await tx`INSERT INTO towers (id, tenant_id, block_id, name) VALUES (${towerId}, ${context.tenantId}, ${blockId}, ${towerName})`;

          for (let f = 1; f <= floorsPerTower; f++) {
            const floorId = generateUuid();
            const floorName = `Floor ${f}`;
            await tx`INSERT INTO floors (id, tenant_id, tower_id, name, floor_number) VALUES (${floorId}, ${context.tenantId}, ${towerId}, ${floorName}, ${f})`;

            for (let u = 1; u <= unitsPerFloor; u++) {
              const unitId = generateUuid();
              const unitNumber = `${t}${f < 10 ? '0'+f : f}${u < 10 ? '0'+u : u}`; // simple naming convention
              await tx`INSERT INTO units (id, tenant_id, floor_id, number, status) VALUES (${unitId}, ${context.tenantId}, ${floorId}, ${unitNumber}, 'available')`;
              totalUnits++;
            }
          }
        }
      }
    });

    // Write audit log
    await logAudit(context, 'BULK_CREATE', 'Unit', projectId, { totalUnits });

    return NextResponse.json({ data: { message: `Successfully generated ${totalUnits} units` } }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating units:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: error.status || 500 }
    );
  }
}
