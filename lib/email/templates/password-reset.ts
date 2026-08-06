export type PasswordResetEmailInput = {
  name: string;
  email: string;
  resetUrl: string;
  expiresHours: number;
  scopeLabel: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput) {
  const subject = 'Reset your Hippo buildX password';
  const name = escapeHtml(input.name || 'there');
  const email = escapeHtml(input.email);
  const resetUrl = escapeHtml(input.resetUrl);
  const hours = String(input.expiresHours);
  const scopeLabel = escapeHtml(input.scopeLabel);

  const textContent = [
    `Hello ${input.name || 'there'},`,
    '',
    'We received a request to reset your Hippo buildX password.',
    `Account: ${input.email}`,
    `Type: ${input.scopeLabel}`,
    '',
    `Reset your password using this link (valid ${input.expiresHours} hour(s)):`,
    input.resetUrl,
    '',
    'If you did not request this, you can ignore this email — your password will stay the same.',
    '',
    '— Hippo buildX by Hippo Cloud Technologies',
  ].join('\n');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#e8eef5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8eef5;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #d7e0ec;">
          <tr>
            <td style="background:#082F49;padding:28px 32px;">
              <div style="font-family:Trebuchet MS,Segoe UI,Arial,sans-serif;font-style:italic;font-weight:900;letter-spacing:-0.5px;line-height:1;">
                <span style="font-size:26px;color:#60A5FA;">Hippo</span><span style="font-size:26px;color:#F87171;">build</span><span style="font-size:30px;color:#F87171;">X</span>
              </div>
              <div style="margin-top:18px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#93C5FD;font-weight:700;">Password reset</div>
              <div style="margin-top:8px;font-size:24px;line-height:1.3;color:#ffffff;font-weight:700;">Choose a new password</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;background:#ffffff;color:#0f172a;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hello ${name},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                We received a request to reset the password for your Hippo buildX account.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#0f172a;">
                    <div><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Email</span><br/><strong style="color:#0f172a;">${email}</strong></div>
                    <div style="margin-top:12px;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Account type</span><br/><strong style="color:#0f172a;">${scopeLabel}</strong></div>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" bgcolor="#1D4ED8" style="border-radius:8px;">
                    <a href="${resetUrl}" target="_blank"
                       style="display:inline-block;background:#1D4ED8;color:#ffffff !important;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;">
                      <span style="color:#ffffff !important;">Reset my password</span>
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                This link expires in ${hours} hour(s). If you did not request a reset, ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;color:#94a3b8;line-height:1.55;">
              <strong style="color:#64748b;">Hippo buildX</strong> · Hippo Cloud Technologies<br/>
              If the button does not work, paste this link into your browser:<br/>
              <a href="${resetUrl}" style="color:#1D4ED8;word-break:break-all;">${resetUrl}</a>
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
