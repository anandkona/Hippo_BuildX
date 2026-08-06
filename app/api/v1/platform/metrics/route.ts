import { NextResponse } from 'next/server';
import { getDb, pingDatabase } from '@/lib/db/client';
import { tenants, subscriptions, plans, platformUsers } from '@/lib/db/schema/control-plane';
import { eq } from 'drizzle-orm';

async function pingRedis(): Promise<boolean> {
  try {
    const Redis = (await import('ioredis')).default;
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      lazyConnect: true,
    });
    await client.connect();
    const pong = await client.ping();
    client.disconnect();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const db = getDb();

    const allTenants = await db.select().from(tenants);
    const allSubs = await db
      .select({
        id: subscriptions.id,
        tenantId: subscriptions.tenantId,
        planId: subscriptions.planId,
        status: subscriptions.status,
        planPrice: plans.price,
        planName: plans.displayName,
        planBillingCycle: plans.billingCycle,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id));

    const allPlans = await db.select().from(plans).where(eq(plans.isActive, true));
    const allUsers = await db.select().from(platformUsers);

    const totalTenants = allTenants.length;
    const activeTenants = allTenants.filter((t) => t.status === 'active').length;

    // Aggregate usage users across tenants
    const totalUsers = allTenants.reduce((sum, t) => {
      const usage = (t.usage || {}) as { users?: number };
      return sum + (usage.users || 0);
    }, 0);

    const monthlyRevenue = allSubs
      .filter((s) => s.status === 'active' || s.status === 'trial')
      .reduce((sum, s) => {
        const price = s.planPrice || 0;
        if (s.planBillingCycle === 'yearly') return sum + Math.round(price / 12);
        return sum + price;
      }, 0);

    // Tenant growth — last 6 months
    const now = new Date();
    const tenantGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleString('en-IN', { month: 'short' });
      const count = allTenants.filter((t) => {
        const c = new Date(t.createdAt);
        return c < end;
      }).length;
      tenantGrowth.push({ month: label, count });
    }

    // Revenue overview — last 6 months (approximate from active subs created by then)
    const revenueOverview = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleString('en-IN', { month: 'short' });
      const revenue = allSubs
        .filter((s) => {
          const c = new Date(s.createdAt);
          return c < end && (s.status === 'active' || s.status === 'trial' || s.status === 'past_due');
        })
        .reduce((sum, s) => sum + (s.planPrice || 0), 0);
      revenueOverview.push({ month: label, revenue });
    }

    // Subscription distribution
    const distributionMap: Record<string, number> = {};
    for (const s of allSubs) {
      const name = s.planName || 'Unknown';
      distributionMap[name] = (distributionMap[name] || 0) + 1;
    }
    const subscriptionDistribution = Object.entries(distributionMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Recent tenants with plan
    const recentTenants = [...allTenants]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((t) => {
        const sub = allSubs.find((s) => s.tenantId === t.id);
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          domain: `${t.slug}.hippobuildx.com`,
          status: t.status,
          planName: sub?.planName || '—',
          createdAt: t.createdAt,
          usage: t.usage,
        };
      });

    const dbOk = await pingDatabase();
    const redisOk = await pingRedis();

    const systemHealth = [
      { name: 'Database', status: dbOk ? 'healthy' : 'down' },
      { name: 'Storage', status: 'healthy' },
      { name: 'Redis Cache', status: redisOk ? 'healthy' : 'degraded' },
      { name: 'Email Service', status: 'healthy' },
      { name: 'File Storage', status: 'healthy' },
    ];

    return NextResponse.json({
      metrics: {
        totalTenants,
        activeTenants,
        totalUsers,
        monthlyRevenue,
        platformUserCount: allUsers.length,
        planCount: allPlans.length,
      },
      tenantGrowth,
      revenueOverview,
      subscriptionDistribution,
      recentTenants,
      systemHealth,
    });
  } catch (error: any) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics', details: error.message }, { status: 500 });
  }
}
