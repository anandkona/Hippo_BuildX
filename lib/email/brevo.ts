/**
 * Brevo (Sendinblue) transactional email client.
 * Config: BREVO_API_KEY, BREVO_SENDER_EMAIL, optional BREVO_SENDER_NAME.
 */

export type BrevoSendInput = {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  tags?: string[];
};

export type BrevoSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; status?: number };

function requireConfig():
  | { ok: true; apiKey: string; senderEmail: string; senderName: string }
  | { ok: false; error: string } {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'BuildX';

  if (!apiKey) {
    return { ok: false, error: 'BREVO_API_KEY is not configured' };
  }
  if (!senderEmail) {
    return { ok: false, error: 'BREVO_SENDER_EMAIL is not configured' };
  }
  return { ok: true, apiKey, senderEmail, senderName };
}

export async function sendBrevoEmail(input: BrevoSendInput): Promise<BrevoSendResult> {
  const cfg = requireConfig();
  if (!cfg.ok) {
    return { ok: false, error: cfg.error };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': cfg.apiKey,
      },
      body: JSON.stringify({
        sender: { email: cfg.senderEmail, name: cfg.senderName },
        to: [{ email: input.toEmail, name: input.toName || undefined }],
        subject: input.subject,
        htmlContent: input.htmlContent,
        textContent: input.textContent,
        tags: input.tags,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      messageId?: string;
      message?: string;
      code?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: body.message || body.code || `Brevo HTTP ${res.status}`,
      };
    }

    return { ok: true, messageId: body.messageId || 'sent' };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Brevo request failed',
    };
  }
}

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim() && process.env.BREVO_SENDER_EMAIL?.trim());
}
