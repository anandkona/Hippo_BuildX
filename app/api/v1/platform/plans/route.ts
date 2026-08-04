import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { plans } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';
import { extractContextFromHeaders } from '@/lib/tenant-context';

export async function GET() {
  try {
    const db = getDb();
    const allPlans = await db.select().from(plans).orderBy(plans.createdAt);
    return NextResponse.json({ plans: allPlans });
  } catch (error: any) {
    console.error('Failed to fetch plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);
    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, displayName, description, price, billingCycle, maxUsers, maxProjects, featureFlags } = body;

    if (!name || !displayName) {
      return NextResponse.json({ error: 'Name and display name are required' }, { status: 400 });
    }

    const db = getDb();
    const [newPlan] = await db.insert(plans).values({
      name,
      displayName,
      description,
      price: price || 0,
      billingCycle: billingCycle || 'monthly',
      maxUsers: maxUsers || 5,
      maxProjects: maxProjects || 1,
      featureFlags: featureFlags || {},
    }).returning();

    return NextResponse.json({ plan: newPlan }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create plan:', error);
    if (error.message?.includes('unique')) {
      return NextResponse.json({ error: 'A plan with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
