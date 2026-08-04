import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/rbac';
import { createTenantSql } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  try {
    const context = getTenantContext(req);
    const tenantSql = createTenantSql(context.schemaName);

    // In a real implementation, we would query the unit linked to the current context.userId
    // For this MVP, we will fetch the first booked unit for demonstration
    const [unitData] = await tenantSql`
      SELECT u.id, u.unit_number as number, u.floor_id, u.tower_id, u.status,
             p.name as project_name, t.name as tower_name
      FROM units u
      LEFT JOIN towers t ON u.tower_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE u.status IN ('Booked', 'Sold')
      LIMIT 1
    `;

    if (!unitData) {
      return NextResponse.json({ data: null, message: "No active unit found for this customer." });
    }

    // Mock progress and demand letters for the portal MVP response
    const portalData = {
      unit: unitData,
      progress: {
        overallPercentage: 62,
        currentStage: "Superstructure",
        lastUpdated: new Date().toISOString()
      },
      demandLetters: [
        { id: "DL-101", amount: 500000, status: "Paid", date: "2023-01-15" },
        { id: "DL-102", amount: 250000, status: "Unpaid", date: "2023-06-20" }
      ],
      documents: [
        { id: "DOC-1", name: "Sale Agreement.pdf", type: "Agreement" },
        { id: "DOC-2", name: "Floor Plan.pdf", type: "Drawing" }
      ]
    };

    return NextResponse.json({ data: portalData }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}
