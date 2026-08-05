export type TenantInviteEmailInput = {
  companyName: string;
  workspace: string;
  adminName: string;
  adminEmail: string;
  tempPassword: string;
  loginUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildTenantInviteEmail(input: TenantInviteEmailInput) {
  const subject = `You're invited to ${input.companyName} on BuildX`;
  const name = escapeHtml(input.adminName || 'there');
  const company = escapeHtml(input.companyName);
  const workspace = escapeHtml(input.workspace);
  const email = escapeHtml(input.adminEmail);
  const password = escapeHtml(input.tempPassword);
  const loginUrl = escapeHtml(input.loginUrl);

  const textContent = [
    `Hello ${input.adminName || 'there'},`,
    '',
    `Your BuildX workspace for ${input.companyName} is ready.`,
    '',
    `Workspace: ${input.workspace}`,
    `Sign-in email: ${input.adminEmail}`,
    `Temporary password: ${input.tempPassword}`,
    `Login: ${input.loginUrl}`,
    '',
    'For security, please sign in and change your password immediately.',
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
              <div style="margin-top:8px;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;">Your workspace is ready</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${name},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
                Your organization <strong>${company}</strong> has been provisioned on BuildX.
                Use the details below to access the tenant admin dashboard.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.7;">
                    <div><span style="color:#64748b;">Company</span><br/><strong>${company}</strong></div>
                    <div style="margin-top:12px;"><span style="color:#64748b;">Workspace</span><br/><strong style="font-family:Consolas,Monaco,monospace;">${workspace}</strong></div>
                    <div style="margin-top:12px;"><span style="color:#64748b;">Admin email</span><br/><strong>${email}</strong></div>
                    <div style="margin-top:12px;"><span style="color:#64748b;">Temporary password</span><br/><strong style="font-family:Consolas,Monaco,monospace;">${password}</strong></div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">
                  Sign in to BuildX
                </a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                For security, change this temporary password right after your first login.
                If you did not expect this invitation, contact your BuildX administrator.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;color:#94a3b8;line-height:1.5;">
              Sent by BuildX · Hippo Cloud Technologies<br/>
              Login URL: ${loginUrl}
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
