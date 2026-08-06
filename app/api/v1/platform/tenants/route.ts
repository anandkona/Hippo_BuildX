import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { tenants, subscriptions, plans } from '@/lib/db/schema/control-plane';
import { provisionTenantQueue } from '@/lib/queue';
import { extractContextFromHeaders } from '@/lib/tenant-context';
import { eq, desc } from 'drizzle-orm';
import { logPlatformAudit, getClientIp } from '@/lib/platform-audit';
import { DEFAULT_TENANT_ADMIN_PASSWORD, provisionTenant } from '@/lib/tenants/provision';
import { generateInviteToken, sendTenantAdminInvite } from '@/lib/tenants/invite';
import type { TenantInviteResult } from '@/lib/tenants/invite';
function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function pickTenantProfile(body: Record<string, unknown>) {
  return {
    legalName: clean(body.legalName),
    industry: clean(body.industry) || 'Construction',
    companySize: clean(body.companySize),
    gstin: clean(body.gstin)?.toUpperCase(),
    pan: clean(body.pan)?.toUpperCase(),
    cin: clean(body.cin)?.toUpperCase(),
    website: clean(body.website),
    addressLine1: clean(body.addressLine1),
    addressLine2: clean(body.addressLine2),
    city: clean(body.city),
    state: clean(body.state),
    pincode: clean(body.pincode),
    country: clean(body.country) || 'India',
    contactName: clean(body.contactName),
    contactEmail: clean(body.contactEmail)?.toLowerCase(),
    contactPhone: clean(body.contactPhone),
    contactDesignation: clean(body.contactDesignation),
    billingEmail: clean(body.billingEmail)?.toLowerCase(),
    adminName: clean(body.adminName) || clean(body.contactName),
    adminEmail: clean(body.adminEmail)?.toLowerCase() || clean(body.contactEmail)?.toLowerCase(),
  };
}

export async function POST(req: Request) {
  try {
    const context = extractContextFromHeaders(req.headers);

    if (!context.roles?.includes('super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const name = clean(body.name);
    const slug = clean(body.slug)?.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const planId = clean(body.planId);
    const profile = pickTenantProfile(body);
    const sendInvite = body.sendInvite !== false;
    // Buyer sets password via invite email. Optional adminPassword only when invite is skipped.
    let adminPassword = clean(body.adminPassword);
    if (sendInvite || !adminPassword) {
      // Provision with an unknown hash; invite accept overwrites it.
      adminPassword = generateInviteToken();
    }
    adminPassword = adminPassword || DEFAULT_TENANT_ADMIN_PASSWORD;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Company name and subdomain are required' }, { status: 400 });
    }

    // Ensure we always have an admin email for seeded login
    if (!profile.adminEmail) {
      profile.adminEmail = `admin@${slug}.local`;
    }
    if (!profile.adminName) {
      profile.adminName = profile.contactName || `${name} Admin`;
    }

    if (profile.gstin && !/^[0-9A-Z]{15}$/.test(profile.gstin)) {
      return NextResponse.json({ error: 'GSTIN must be 15 characters' }, { status: 400 });
    }
    if (profile.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(profile.pan)) {
      return NextResponse.json({ error: 'PAN format looks invalid' }, { status: 400 });
    }

    const schemaName = `tenant_${slug.replace(/[^a-z0-9_]/g, '')}`;
    const db = getDb();

    const [newTenant] = await db
      .insert(tenants)
      .values({
        name,
        slug,
        schemaName,
        status: 'provisioning',
        usage: { users: 0, projects: 0, storageGb: 0, apiCalls: 0 },
        ...profile,
      })
      .returning();

    if (planId) {
      await db.insert(subscriptions).values({
        tenantId: newTenant.id,
        planId,
        status: 'trial',
      });
    }

    const jobPayload = {
      tenantId: newTenant.id,
      schemaName,
      name,
      adminEmail: profile.adminEmail,
      adminName: profile.adminName,
      adminPassword,
    };

    let provisionMode: 'queue' | 'sync' = 'queue';
    let queueError: string | null = null;
    let credentials = {
      workspace: slug,
      adminEmail: profile.adminEmail!,
      adminPassword,
    };

    try {
      await provisionTenantQueue.add('provision', jobPayload);
    } catch (err: any) {
      console.error('Failed to enqueue provision job, running sync fallback:', err);
      queueError = err?.message || 'Queue unavailable';
      provisionMode = 'sync';
      const result = await provisionTenant(jobPayload);
      credentials = {
        workspace: slug,
        adminEmail: result.adminEmail,
        adminPassword: result.adminPassword,
      };
    }

    // If queued successfully but worker may not be running in local dev,
    // also run sync when SYNC_PROVISION=1 or always for reliability in create response.
    if (provisionMode === 'queue' && process.env.SYNC_PROVISION !== '0') {
      try {
        const result = await provisionTenant(jobPayload);
        credentials = {
          workspace: slug,
          adminEmail: result.adminEmail,
          adminPassword: result.adminPassword,
        };
        provisionMode = 'sync';
      } catch (syncErr) {
        console.error('Sync provision after enqueue failed (worker may still process):', syncErr);
      }
    }

    let invite: TenantInviteResult | null = null;
    const [fresh] = await db.select().from(tenants).where(eq(tenants.id, newTenant.id));

    if (sendInvite && fresh?.status === 'active') {
      invite = await sendTenantAdminInvite({
        tenantId: fresh.id,
        companyName: name!,
        workspace: slug!,
        adminName: profile.adminName || `${name} Admin`,
        adminEmail: credentials.adminEmail,
        req,
      });
    } else if (sendInvite) {
      invite = {
        sent: false,
        skipped: true,
        error: 'Invite deferred until tenant becomes active',
        to: credentials.adminEmail,
      };
    }

    // Never return a usable password when invite flow is used — buyer creates it.
    const safeCredentials = {
      workspace: credentials.workspace,
      adminEmail: credentials.adminEmail,
      adminPassword: sendInvite ? null : credentials.adminPassword,
      mustSetPassword: Boolean(sendInvite),
    };

    await logPlatformAudit({
      actorUserId: context.userId,
      action: 'Created Tenant',
      resource: 'tenant',
      resourceId: newTenant.id,
      details: [
        queueError
          ? `Created tenant ${name} via sync fallback (${queueError})`
          : `Created tenant ${name} (${provisionMode})`,
        invite?.sent
          ? `Invite emailed to ${invite.to}`
          : invite
            ? `Invite not sent: ${invite.error}`
            : 'Invite not requested',
      ].join(' · '),
      ipAddress: getClientIp(req),
    });

    return NextResponse.json(
      {
        message:
          fresh?.status === 'active'
            ? invite?.sent
              ? 'Tenant provisioned — invite sent for admin to set password'
              : 'Tenant provisioned and ready for login'
            : 'Tenant provisioning started',
        tenant: fresh || newTenant,
        credentials: safeCredentials,
        invite,
        provisionMode,
        queueWarning: queueError,
      },
      { status: fresh?.status === 'active' ? 201 : 202 }
    );
  } catch (error: any) {
    console.error('Failed to provision tenant:', error);
    if (error.message?.includes('unique')) {
      return NextResponse.json({ error: 'A tenant with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to provision tenant', details: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    const allSubs = await db
      .select({
        tenantId: subscriptions.tenantId,
        planId: subscriptions.planId,
        status: subscriptions.status,
        planName: plans.displayName,
        planPrice: plans.price,
        maxUsers: plans.maxUsers,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id));

    const enriched = allTenants.map((t) => {
      const sub = allSubs.find((s) => s.tenantId === t.id);
      const usage = (t.usage || {}) as { users?: number };
      return {
        ...t,
        domain: `${t.slug}.hippobuildx.com`,
        planName: sub?.planName || null,
        planId: sub?.planId || null,
        subscriptionStatus: sub?.status || null,
        userCount: usage.users ?? 0,
      };
    });

    return NextResponse.json({ tenants: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}
