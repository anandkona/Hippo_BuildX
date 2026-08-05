export type TenantInviteEmailInput = {
  companyName: string;
  workspace: string;
  adminName: string;
  adminEmail: string;
  inviteUrl: string;
  expiresHours: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Invite email: buyer sets their own password via secure link (no password in email). */
export function buildTenantInviteEmail(input: TenantInviteEmailInput) {
  const subject = `Set up your BuildX account for ${input.companyName}`;
  const name = escapeHtml(input.adminName || 'there');
  const company = escapeHtml(input.companyName);
  const workspace = escapeHtml(input.workspace);
  const email = escapeHtml(input.adminEmail);
  const inviteUrl = escapeHtml(input.inviteUrl);
  const hours = String(input.expiresHours);

  const textContent = [
    `Hello ${input.adminName || 'there'},`,
    '',
    `Your BuildX workspace for ${input.companyName} is ready.`,
    '',
    `Workspace: ${input.workspace}`,
    `Sign-in email: ${input.adminEmail}`,
    '',
    `Create your own password using this link (valid ${input.expiresHours} hours):`,
    input.inviteUrl,
    '',
    'No password was set for you — choose one yourself on that page, then sign in.',
    '',
    '— BuildX by Hippo Cloud Technologies',
  ].join('\n');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0f2744;padding:28px 32px;">
              <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#93c5fd;font-weight:600;">BuildX</div>
              <div style="margin-top:8px;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;">Create your password</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${name},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
                Your organization <strong>${company}</strong> has been provisioned on BuildX.
                Click below to choose your own password and activate your admin access.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.7;">
                    <div><span style="color:#64748b;">Company</span><br/><strong>${company}</strong></div>
                    <div style="margin-top:12px;"><span style="color:#64748b;">Workspace</span><br/><strong style="font-family:Consolas,Monaco,monospace;">${workspace}</strong></div>
                    <div style="margin-top:12px;"><span style="color:#64748b;">Your sign-in email</span><br/><strong>${email}</strong></div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">
                  Set my password
                </a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                This link expires in ${hours} hours. We never send your password by email — you create it yourself.
                If you did not expect this invitation, ignore this message.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;color:#94a3b8;line-height:1.5;">
              Sent by BuildX · Hippo Cloud Technologies<br/>
              Invite link: ${inviteUrl}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, htmlContent, textContent };
}
