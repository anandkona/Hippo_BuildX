/**
 * Diagnose Brevo sender + recent transactional events (no secrets printed).
 * Usage: npx tsx scripts/diagnose-brevo.ts [recipientEmail]
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const apiKey = process.env.BREVO_API_KEY?.trim();
const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
const recipient = (process.argv[2] || 'saikumarbali555@gmail.com').trim().toLowerCase();

async function brevo(path: string) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    headers: { accept: 'application/json', 'api-key': apiKey! },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  if (!apiKey) {
    console.log(JSON.stringify({ ok: false, error: 'BREVO_API_KEY missing' }, null, 2));
    process.exit(1);
  }

  const senderLooksFree = /@(gmail|yahoo|outlook|hotmail|icloud)\./i.test(senderEmail || '');
  console.log(
    JSON.stringify(
      {
        configuredSender: senderEmail || null,
        senderLooksLikeFreeMailbox: senderLooksFree,
        warning: senderLooksFree
          ? 'Free-mailbox From addresses (gmail/yahoo/etc) are not reliable with Brevo. Gmail often drops or silently rejects. Use a verified custom domain sender.'
          : null,
      },
      null,
      2
    )
  );

  const senders = await brevo('/senders');
  const senderList = Array.isArray((senders.body as any)?.senders)
    ? (senders.body as any).senders.map((s: any) => ({
        email: s.email,
        name: s.name,
        active: s.active,
        verified: s.verified ?? s.active,
      }))
    : senders.body;

  console.log('\n=== Verified senders in Brevo account ===');
  console.log(JSON.stringify({ http: senders.status, senders: senderList }, null, 2));

  const domains = await brevo('/senders/domains');
  console.log('\n=== Domains ===');
  console.log(JSON.stringify({ http: domains.status, body: domains.body }, null, 2));

  const domainName =
    (Array.isArray((domains.body as any)?.domains) &&
      (domains.body as any).domains[0]?.domain_name) ||
    null;
  if (domainName) {
    const detail = await brevo(`/senders/domains/${encodeURIComponent(domainName)}`);
    console.log(`\n=== Domain detail / DNS for ${domainName} ===`);
    console.log(JSON.stringify({ http: detail.status, body: detail.body }, null, 2));
  }

  // Recent events for this recipient
  const days = 2;
  const end = new Date();
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const qs = new URLSearchParams({
    limit: '20',
    email: recipient,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    sort: 'desc',
  });
  const events = await brevo(`/smtp/statistics/events?${qs}`);
  console.log(`\n=== Recent transactional events for ${recipient} ===`);
  console.log(JSON.stringify({ http: events.status, body: events.body }, null, 2));

  const account = await brevo('/account');
  const acc = account.body as any;
  console.log('\n=== Account (redacted) ===');
  console.log(
    JSON.stringify(
      {
        http: account.status,
        email: acc?.email,
        companyName: acc?.companyName,
        plan: acc?.plan?.[0]?.type || acc?.plan,
        relay: acc?.relay,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
