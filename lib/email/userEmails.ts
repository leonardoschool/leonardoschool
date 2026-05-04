import nodemailer from 'nodemailer';

function createEmailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

const roleLabels: Record<string, string> = {
  STUDENT: 'Studente',
  COLLABORATOR: 'Collaboratore',
  ADMIN: 'Amministratore',
};

export async function sendWelcomeEmail({
  name,
  email,
  passwordSetLink,
  role,
}: {
  name: string;
  email: string;
  passwordSetLink: string;
  role: string;
}) {
  const transporter = createEmailTransporter();
  const roleLabel = roleLabels[role] ?? role;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background-color:#c41e3a;padding:32px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Leonardo School</h1>
                  <p style="color:#fca5a5;margin:8px 0 0;font-size:14px;">Benvenuto nella piattaforma</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <p style="font-size:18px;font-weight:600;color:#111827;margin:0 0 8px;">Ciao ${name}! 👋</p>
                  <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
                    Il tuo account su <strong>Leonardo School</strong> è stato creato con il ruolo di <strong>${roleLabel}</strong>.
                  </p>
                  <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
                    Per accedere alla piattaforma devi prima impostare la tua password cliccando il pulsante qui sotto.
                    Il link è valido per <strong>24 ore</strong>.
                  </p>
                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                    <tr>
                      <td style="background-color:#c41e3a;border-radius:8px;">
                        <a href="${passwordSetLink}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">
                          Imposta la tua password →
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">
                    Se non riesci a cliccare il pulsante, copia e incolla questo link nel browser:
                  </p>
                  <p style="color:#6b7280;font-size:11px;word-break:break-all;margin:0 0 24px;background-color:#f9fafb;padding:10px;border-radius:6px;">
                    ${passwordSetLink}
                  </p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />
                  <p style="color:#9ca3af;font-size:12px;margin:0;">
                    Se non hai richiesto la creazione di questo account, ignora questa email o contatta il supporto.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">Leonardo School — info@leonardoschool.it</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `Ciao ${name},\n\nIl tuo account Leonardo School è stato creato con il ruolo di ${roleLabel}.\n\nPer impostare la tua password e accedere alla piattaforma, visita il seguente link (valido 24 ore):\n\n${passwordSetLink}\n\n— Leonardo School`;

  await transporter.sendMail({
    from: `"Leonardo School" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Benvenuto in Leonardo School — Imposta la tua password',
    text,
    html,
  });
}
