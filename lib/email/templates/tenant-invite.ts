export type TenantInviteEmailInput = {
  companyName: string;
  workspace: string;
  adminName: string;
  adminEmail: string;
  inviteUrl: string;
  expiresHours: number;
  /** Absolute app origin for logo assets, e.g. http://localhost:3000 */
  appUrl?: string;
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
  const appUrl = (input.appUrl || '').replace(/\/$/, '');
  // Localhost images are invisible in real inboxes — use HTML wordmark there.
  const canHostLogo = Boolean(appUrl && !/localhost|127\.0\.0\.1/i.test(appUrl));
  const logoUrl = canHostLogo ? `${appUrl}/brand/hippo-buildx-logo.png` : '';

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
    '— Hippo buildX by Hippo Cloud Technologies',
  ].join('\n');

  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="160" height="40" alt="Hippo buildX" style="display:block;border:0;outline:none;text-decoration:none;height:40px;width:auto;max-width:180px;" />`
    : `<div style="font-family:Trebuchet MS,Segoe UI,Arial,sans-serif;font-style:italic;font-weight:900;letter-spacing:-0.5px;line-height:1;">
        <span style="font-size:26px;color:#60A5FA;">Hippo</span><span style="font-size:26px;color:#F87171;">build</span><span style="font-size:30px;color:#F87171;">X</span>
      </div>`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#e8eef5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your BuildX workspace is ready — set your own password to activate admin access.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8eef5;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #d7e0ec;">
          <!-- Brand header -->
          <tr>
            <td style="background:#082F49;padding:28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    ${logoBlock}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:18px;">
                    <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#93C5FD;font-weight:700;">Workspace invitation</div>
                    <div style="margin-top:8px;font-size:24px;line-height:1.3;color:#ffffff;font-weight:700;">Create your password</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;background:#ffffff;color:#0f172a;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hello ${name},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                Your organization <strong style="color:#0f172a;">${company}</strong> has been provisioned on Hippo buildX.
                Click below to choose your own password and activate your admin access.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#0f172a;">
                    <div><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Company</span><br/><strong style="color:#0f172a;">${company}</strong></div>
                    <div style="margin-top:12px;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Workspace</span><br/><strong style="font-family:Consolas,Monaco,monospace;color:#0f172a;">${workspace}</strong></div>
                    <div style="margin-top:12px;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Your sign-in email</span><br/><strong style="color:#0f172a;">${email}</strong></div>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" bgcolor="#1D4ED8" style="border-radius:8px;">
                    <a href="${inviteUrl}"
                       target="_blank"
                       style="display:inline-block;background:#1D4ED8;color:#ffffff !important;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;mso-padding-alt:0;">
                      <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;mso-text-raise:21pt;">&nbsp;</i><![endif]-->
                      <span style="color:#ffffff !important;">Set my password</span>
                      <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;">&nbsp;</i><![endif]-->
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                This link expires in ${hours} hours. We never send your password by email — you create it yourself.
                If you did not expect this invitation, ignore this message.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;color:#94a3b8;line-height:1.55;">
              <strong style="color:#64748b;">Hippo buildX</strong> · Hippo Cloud Technologies<br/>
              If the button does not work, paste this link into your browser:<br/>
              <a href="${inviteUrl}" style="color:#1D4ED8;word-break:break-all;">${inviteUrl}</a>
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
