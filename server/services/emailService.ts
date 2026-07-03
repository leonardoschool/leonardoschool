import nodemailer, { type Transporter, type SendMailOptions } from 'nodemailer';
import { prisma } from '@/lib/prisma/client';
import type { EmailLogStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

// Categoria dell'email, usata per filtrare lo storico invii (EmailLog)
export type EmailCategory =
  | 'CONTRACT_ASSIGNED'
  | 'CONTRACT_SIGNED_CONFIRMATION'
  | 'CONTRACT_REMINDER'
  | 'CONTRACT_EXPIRED'
  | 'ACCOUNT_ACTIVATED'
  | 'ADMIN_NOTIFICATION_PROFILE_COMPLETED'
  | 'ADMIN_NOTIFICATION_CONTRACT_SIGNED'
  | 'AUTH_EMAIL_VERIFICATION'
  | 'AUTH_PASSWORD_RESET'
  | 'WELCOME'
  | 'EVENT_INVITATION'
  | 'EVENT_MODIFICATION'
  | 'EVENT_CANCELLATION'
  | 'ABSENCE_STATUS'
  | 'SIMULATION_INVITATION';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  category: EmailCategory;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

interface ContractEmailData {
  studentName: string;
  studentEmail: string;
  signLink: string;
  contractName: string;
  price: number;
  expiresAt: Date;
}

interface ContractSignedEmailData {
  studentName: string;
  studentEmail: string;
  contractName: string;
  signedAt: Date;
  price: number;
}

interface ContractReminderEmailData {
  recipientName: string;
  recipientEmail: string;
  contractName: string;
  expiresAt: Date;
  signLink: string;
}

interface ContractExpiredEmailData {
  recipientName: string;
  recipientEmail: string;
  contractName: string;
}

interface AccountActivatedEmailData {
  studentName: string;
  studentEmail: string;
  loginUrl: string;
}

interface ProfileCompletedNotificationData {
  studentName: string;
  studentEmail: string;
  studentId: string;
}

// =============================================================================
// TRANSPORTER
// =============================================================================

const smtpAuth = () => ({
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASSWORD,
});
const smtpPort = () => Number.parseInt(process.env.SMTP_PORT || '465', 10);
// `secure` va tenuto esplicito nella call a createTransport, altrimenti
// sonarjs/no-clear-text-protocols non riesce a verificarlo e segnala un falso positivo.

// Transporter per invio singolo (una email, un destinatario)
export function createTransporter(): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort(),
    secure: process.env.SMTP_SECURE === 'true',
    auth: smtpAuth(),
  });
}

// Transporter per invii massivi (loop su molti destinatari): riusa UNA sola
// connessione e limita la cadenza. Evita il throttling dei provider SMTP: Aruba
// rifiuta le raffiche di connessioni ("550 ... temporarily rejected"), Resend ha un
// rate-limit di default di ~2 req/s. Una connessione riusata + pacing sta sotto
// entrambi. Va chiuso con `.close()` al termine del loop.
export function createBulkTransporter(): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort(),
    secure: process.env.SMTP_SECURE === 'true',
    auth: smtpAuth(),
    pool: true,
    maxConnections: 1,
    rateDelta: 1000,
    rateLimit: 2, // max ~2 email/secondo: sotto il rate-limit di default di Resend e il throttling di Aruba
  });
}

// Rileva i rifiuti SMTP TEMPORANEI (ritentabili). Aruba usa il codice 550 con
// testo "temporaneamente rifiutata / temporarily rejected" per il throttling,
// oltre ai classici 421/450/451.
function isTemporarySmtpError(error: unknown): boolean {
  const e = error as { responseCode?: number; response?: string };
  const code = e?.responseCode;
  const response = (e?.response || '').toLowerCase();
  if (code === 421 || code === 450 || code === 451) return true;
  if (code === 550 && (response.includes('temporan') || response.includes('temporarily') || response.includes('rejected'))) {
    return true;
  }
  return false;
}

// Invia con retry a backoff sui soli errori temporanei (es. throttling Aruba).
// Sugli errori permanenti (indirizzo inesistente, ecc.) rilancia subito.
export async function sendMailWithRetry(
  transporter: Transporter,
  mailOptions: SendMailOptions,
  attempts = 3,
  baseDelayMs = 1500,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return;
    } catch (error) {
      const isLastAttempt = attempt === attempts - 1;
      if (isLastAttempt || !isTemporarySmtpError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
}

// =============================================================================
// BASE EMAIL SENDER
// =============================================================================

// Persiste ogni esito di invio in DB: i log applicativi (Vercel) hanno retention
// breve senza piano Pro, quindi sono l'unico storico consultabile in modo affidabile.
// Non deve mai far fallire l'invio: eventuali errori di scrittura restano interni.
// Esportata così anche eventEmails.ts (transporter separato) può registrare i suoi invii.
export async function logEmail(entry: {
  to: string;
  subject: string;
  category: EmailCategory;
  status: EmailLogStatus;
  error?: string;
}): Promise<void> {
  try {
    await prisma.emailLog.create({ data: entry });
  } catch (err) {
    console.error('[Email] Failed to write EmailLog:', err);
  }
}

async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Skip email sending if SMTP is not configured (development)
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log('[Email] SMTP not configured, skipping email to:', options.to);
      console.log('[Email] Subject:', options.subject);
      await logEmail({
        to: options.to,
        subject: options.subject,
        category: options.category,
        status: 'FAILED',
        error: 'SMTP non configurato',
      });
      return { success: true }; // Return success to not break flows
    }

    const transporter = createTransporter();

    await sendMailWithRetry(transporter, {
      from: `"Leonardo School" <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments,
    });

    await logEmail({
      to: options.to,
      subject: options.subject,
      category: options.category,
      status: 'SENT',
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.error('Error sending email:', error);
    await logEmail({
      to: options.to,
      subject: options.subject,
      category: options.category,
      status: 'FAILED',
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

function getBaseEmailTemplate(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
          }
          .email-wrapper {
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .content { 
            padding: 30px 25px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
            color: white !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }
          .button:hover {
            background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%);
          }
          .info-box {
            background-color: #fef2f2;
            border-left: 4px solid #991b1b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .info-box strong {
            color: #7f1d1d;
          }
          .warning-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .success-box {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .detail-row {
            display: flex;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-label {
            font-weight: 600;
            color: #6b7280;
            width: 150px;
            flex-shrink: 0;
          }
          .detail-value {
            color: #111827;
          }
          .footer { 
            background-color: #1f2937; 
            color: #9ca3af; 
            padding: 25px; 
            text-align: center; 
            font-size: 12px;
          }
          .footer a {
            color: #d1d5db;
            text-decoration: none;
          }
          .footer a:hover {
            color: white;
          }
          .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 25px 0;
          }
          @media only screen and (max-width: 600px) {
            .container { padding: 10px; }
            .content { padding: 20px 15px; }
            .detail-row { flex-direction: column; }
            .detail-label { width: 100%; margin-bottom: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-wrapper">
            <div class="header">
              <h1>🎓 Leonardo School</h1>
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Leonardo School. Tutti i diritti riservati.</p>
              <p style="margin-top: 10px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.leonardoschool.it'}">Visita il sito</a> | 
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.leonardoschool.it'}/contattaci">Contattaci</a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// =============================================================================
// CONTRACT EMAILS
// =============================================================================

/**
 * Invia email allo studente con il link per firmare il contratto
 */
export async function sendContractAssignedEmail(data: ContractEmailData): Promise<{ success: boolean; error?: string }> {
  const formattedPrice = new Intl.NumberFormat('it-IT', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(data.price);

  const formattedExpiry = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.expiresAt);

  const content = `
    <p class="greeting">Ciao <strong>${data.studentName}</strong>,</p>
    
    <p>Il tuo percorso con Leonardo School sta per iniziare! Ti è stato assegnato un contratto di iscrizione che richiede la tua firma.</p>
    
    <div class="info-box">
      <strong>📋 Dettagli Contratto</strong>
      <div style="margin-top: 10px;">
        <div class="detail-row">
          <span class="detail-label">Tipologia:</span>
          <span class="detail-value">${data.contractName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Importo:</span>
          <span class="detail-value">${formattedPrice}</span>
        </div>
      </div>
    </div>
    
    <p style="text-align: center;">
      <a href="${data.signLink}" class="button">✍️ Firma il Contratto</a>
    </p>
    
    <div class="warning-box">
      <strong>⚠️ Importante</strong>
      <p style="margin: 5px 0 0 0;">Il link per la firma scade il <strong>${formattedExpiry}</strong>. Dopo questa data, sarà necessario richiedere un nuovo contratto.</p>
    </div>
    
    <div class="divider"></div>
    
    <p style="font-size: 14px; color: #6b7280;">
      Se non hai richiesto questo contratto o hai domande, contattaci rispondendo a questa email o visitando la pagina contatti del nostro sito.
    </p>
  `;

  return sendEmail({
    to: data.studentEmail,
    subject: `📋 Contratto da firmare - ${data.contractName}`,
    html: getBaseEmailTemplate(content, 'Contratto da Firmare'),
    category: 'CONTRACT_ASSIGNED',
  });
}

/**
 * Invia email di conferma allo studente dopo la firma
 */
export async function sendContractSignedConfirmationEmail(data: ContractSignedEmailData): Promise<{ success: boolean; error?: string }> {
  const formattedPrice = new Intl.NumberFormat('it-IT', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(data.price);

  const formattedSignDate = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.signedAt);

  const content = `
    <p class="greeting">Ciao <strong>${data.studentName}</strong>,</p>
    
    <div class="success-box">
      <strong>✅ Contratto firmato con successo!</strong>
    </div>
    
    <p>Grazie per aver firmato il contratto. La tua iscrizione è ora in attesa di attivazione da parte del nostro team amministrativo.</p>
    
    <div class="info-box">
      <strong>📋 Riepilogo</strong>
      <div style="margin-top: 10px;">
        <div class="detail-row">
          <span class="detail-label">Contratto:</span>
          <span class="detail-value">${data.contractName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Importo:</span>
          <span class="detail-value">${formattedPrice}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Data firma:</span>
          <span class="detail-value">${formattedSignDate}</span>
        </div>
      </div>
    </div>
    
    <p><strong>Prossimi passi:</strong></p>
    <ol>
      <li>Il nostro team verificherà i dati del contratto</li>
      <li>Riceverai una email di conferma quando il tuo account sarà attivato</li>
      <li>Potrai quindi accedere alla piattaforma e iniziare la preparazione</li>
    </ol>
    
    <div class="divider"></div>
    
    <p style="font-size: 14px; color: #6b7280;">
      Per qualsiasi domanda, non esitare a contattarci. Siamo qui per aiutarti!
    </p>
  `;

  return sendEmail({
    to: data.studentEmail,
    subject: `✅ Contratto firmato - ${data.contractName}`,
    html: getBaseEmailTemplate(content, 'Contratto Firmato'),
    category: 'CONTRACT_SIGNED_CONFIRMATION',
  });
}

/**
 * Invia email di promemoria per contratto in scadenza
 */
export async function sendContractReminderEmail(data: ContractReminderEmailData): Promise<{ success: boolean; error?: string }> {
  const formattedExpiry = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.expiresAt);

  const content = `
    <p class="greeting">Ciao <strong>${data.recipientName}</strong>,</p>
    
    <div class="warning-box">
      <strong>⏰ Promemoria: Contratto in scadenza</strong>
    </div>
    
    <p>Ti ricordiamo che hai un contratto da firmare che sta per scadere.</p>
    
    <div class="info-box">
      <strong>📋 Dettagli Contratto</strong>
      <div style="margin-top: 10px;">
        <div class="detail-row">
          <span class="detail-label">Tipologia:</span>
          <span class="detail-value">${data.contractName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Scadenza:</span>
          <span class="detail-value">${formattedExpiry}</span>
        </div>
      </div>
    </div>
    
    <p style="text-align: center;">
      <a href="${data.signLink}" class="button">✍️ Firma il Contratto</a>
    </p>
    
    <p style="font-size: 14px; color: #6b7280;">
      Dopo la scadenza, sarà necessario richiedere un nuovo contratto. Non perdere questa opportunità!
    </p>
  `;

  return sendEmail({
    to: data.recipientEmail,
    subject: `⏰ Promemoria: Contratto in scadenza - ${data.contractName}`,
    html: getBaseEmailTemplate(content, 'Promemoria Contratto'),
    category: 'CONTRACT_REMINDER',
  });
}

/**
 * Invia email quando un contratto è scaduto senza firma
 */
export async function sendContractExpiredEmail(data: ContractExpiredEmailData): Promise<{ success: boolean; error?: string }> {
  const content = `
    <p class="greeting">Ciao <strong>${data.recipientName}</strong>,</p>
    
    <div class="warning-box">
      <strong>⚠️ Contratto scaduto</strong>
    </div>
    
    <p>Purtroppo il termine per firmare il contratto "<strong>${data.contractName}</strong>" è scaduto.</p>
    
    <p>Se desideri ancora procedere con l'iscrizione, contattaci per richiedere un nuovo contratto.</p>
    
    <div class="divider"></div>
    
    <p style="font-size: 14px; color: #6b7280;">
      Hai domande? Rispondi a questa email o contattaci attraverso il nostro sito.
    </p>
  `;

  return sendEmail({
    to: data.recipientEmail,
    subject: `⚠️ Contratto scaduto - ${data.contractName}`,
    html: getBaseEmailTemplate(content, 'Contratto Scaduto'),
    category: 'CONTRACT_EXPIRED',
  });
}

/**
 * Invia email allo studente quando l'account viene attivato
 */
export async function sendAccountActivatedEmail(data: AccountActivatedEmailData): Promise<{ success: boolean; error?: string }> {
  const content = `
    <p class="greeting">Ciao <strong>${data.studentName}</strong>,</p>
    
    <div class="success-box">
      <strong>🎉 Il tuo account è stato attivato!</strong>
    </div>
    
    <p>Ottime notizie! Il tuo account Leonardo School è ora completamente attivo. Puoi accedere alla piattaforma e iniziare la tua preparazione per i test universitari.</p>
    
    <p style="text-align: center;">
      <a href="${data.loginUrl}" class="button">🚀 Accedi alla Piattaforma</a>
    </p>
    
    <div class="info-box">
      <strong>🎯 Cosa puoi fare ora</strong>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Accedere ai materiali didattici</li>
        <li>Svolgere simulazioni di test</li>
        <li>Monitorare i tuoi progressi</li>
        <li>Prepararti al meglio per il test di ammissione</li>
      </ul>
    </div>
    
    <div class="divider"></div>
    
    <p style="font-size: 14px; color: #6b7280;">
      In bocca al lupo per la tua preparazione! Il team Leonardo School è sempre a tua disposizione per supportarti nel tuo percorso.
    </p>
  `;

  return sendEmail({
    to: data.studentEmail,
    subject: '🎉 Account attivato - Benvenuto in Leonardo School!',
    html: getBaseEmailTemplate(content, 'Account Attivato'),
    category: 'ACCOUNT_ACTIVATED',
  });
}

// =============================================================================
// ADMIN NOTIFICATION EMAILS
// =============================================================================

/**
 * Notifica gli admin quando uno studente completa il profilo
 */
export async function sendProfileCompletedAdminNotification(data: ProfileCompletedNotificationData): Promise<{ success: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_TO;
  
  if (!adminEmail) {
    console.warn('No admin email configured for notifications');
    return { success: false, error: 'No admin email configured' };
  }

  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.leonardoschool.it'}/utenti`;

  const content = `
    <p class="greeting">Nuovo studente registrato!</p>
    
    <div class="info-box">
      <strong>👤 Dettagli Studente</strong>
      <div style="margin-top: 10px;">
        <div class="detail-row">
          <span class="detail-label">Nome:</span>
          <span class="detail-value">${data.studentName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${data.studentEmail}</span>
        </div>
      </div>
    </div>
    
    <p>Lo studente ha completato la registrazione e il profilo anagrafico. È necessario:</p>
    <ol>
      <li>Assegnare un contratto allo studente</li>
      <li>Attendere la firma del contratto</li>
      <li>Attivare l'account</li>
    </ol>
    
    <p style="text-align: center;">
      <a href="${adminUrl}" class="button">📊 Vai al Pannello Admin</a>
    </p>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `👤 Nuovo studente: ${data.studentName}`,
    html: getBaseEmailTemplate(content, 'Nuovo Studente Registrato'),
    category: 'ADMIN_NOTIFICATION_PROFILE_COMPLETED',
  });
}

/**
 * Notifica gli admin quando uno studente firma un contratto
 */
export async function sendContractSignedAdminNotification(data: {
  studentName: string;
  studentEmail: string;
  contractName: string;
  signedAt: Date;
}): Promise<{ success: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_TO;
  
  if (!adminEmail) {
    console.warn('No admin email configured for notifications');
    return { success: false, error: 'No admin email configured' };
  }

  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.leonardoschool.it'}/contratti`;
  
  const formattedSignDate = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.signedAt);

  const content = `
    <p class="greeting">Contratto firmato!</p>
    
    <div class="success-box">
      <strong>✍️ Uno studente ha firmato il contratto</strong>
    </div>
    
    <div class="info-box">
      <strong>📋 Dettagli</strong>
      <div style="margin-top: 10px;">
        <div class="detail-row">
          <span class="detail-label">Studente:</span>
          <span class="detail-value">${data.studentName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${data.studentEmail}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Contratto:</span>
          <span class="detail-value">${data.contractName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Data firma:</span>
          <span class="detail-value">${formattedSignDate}</span>
        </div>
      </div>
    </div>
    
    <p>L'account dello studente è pronto per essere attivato.</p>
    
    <p style="text-align: center;">
      <a href="${adminUrl}" class="button">✅ Attiva Account</a>
    </p>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `✍️ Contratto firmato: ${data.studentName}`,
    html: getBaseEmailTemplate(content, 'Contratto Firmato'),
    category: 'ADMIN_NOTIFICATION_CONTRACT_SIGNED',
  });
}

// =============================================================================
// AUTH EMAILS
// =============================================================================

interface AuthEmailVerificationData {
  name: string;
  email: string;
  verificationLink: string;
}

interface AuthPasswordResetData {
  name: string;
  email: string;
  resetLink: string;
}

interface WelcomeEmailData {
  name: string;
  email: string;
  passwordSetLink: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  STUDENT: 'Studente',
  COLLABORATOR: 'Collaboratore',
  ADMIN: 'Amministratore',
};

/**
 * Invia email di verifica indirizzo con link generato da Firebase Admin
 */
export async function sendAuthEmailVerification(data: AuthEmailVerificationData): Promise<{ success: boolean; error?: string }> {
  const content = `
    <p class="greeting">Ciao <strong>${data.name}</strong>,</p>

    <p>Grazie per esserti registrato su <strong>Leonardo School</strong>. Per completare la registrazione, verifica il tuo indirizzo email cliccando sul pulsante qui sotto.</p>

    <p style="text-align: center;">
      <a href="${data.verificationLink}" class="button">✉️ Verifica il tuo indirizzo email</a>
    </p>

    <div class="warning-box">
      <strong>⏰ Il link scade entro 24 ore</strong>
      <p style="margin: 5px 0 0 0;">Se non completi la verifica entro 24 ore, dovrai richiedere un nuovo link di verifica.</p>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #6b7280;">
      Se non hai creato un account su Leonardo School, puoi ignorare questa email. Il tuo indirizzo email non sarà registrato.
    </p>
  `;

  return sendEmail({
    to: data.email,
    subject: 'Verifica il tuo indirizzo email – Leonardo School',
    html: getBaseEmailTemplate(content, 'Verifica Email'),
    category: 'AUTH_EMAIL_VERIFICATION',
  });
}

/**
 * Invia email di reset password con link generato da Firebase Admin
 */
export async function sendAuthPasswordReset(data: AuthPasswordResetData): Promise<{ success: boolean; error?: string }> {
  const content = `
    <p class="greeting">Ciao <strong>${data.name}</strong>,</p>

    <p>Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account <strong>Leonardo School</strong>.</p>

    <p style="text-align: center;">
      <a href="${data.resetLink}" class="button">🔑 Reimposta la tua password</a>
    </p>

    <div class="warning-box">
      <strong>⏰ Il link scade entro 1 ora</strong>
      <p style="margin: 5px 0 0 0;">Per motivi di sicurezza, questo link è valido per 1 ora soltanto.</p>
    </div>

    <div class="divider"></div>

    <div class="info-box">
      <strong>🔒 Non hai richiesto il cambio di password?</strong>
      <p style="margin: 5px 0 0 0;">Se non hai richiesto questa operazione, puoi ignorare questa email in tutta sicurezza. Il tuo account non subirà modifiche.</p>
    </div>
  `;

  return sendEmail({
    to: data.email,
    subject: 'Reimposta la tua password – Leonardo School',
    html: getBaseEmailTemplate(content, 'Reimposta Password'),
    category: 'AUTH_PASSWORD_RESET',
  });
}

/**
 * Invia email di benvenuto con link per impostare la password (creazione utente da admin)
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; error?: string }> {
  const roleLabel = roleLabels[data.role] ?? data.role;

  const content = `
    <p class="greeting">Ciao <strong>${data.name}</strong>! 👋</p>

    <p>Il tuo account su <strong>Leonardo School</strong> è stato creato con il ruolo di <strong>${roleLabel}</strong>.</p>

    <p>Per accedere alla piattaforma devi prima impostare la tua password cliccando sul pulsante qui sotto.</p>

    <p style="text-align: center;">
      <a href="${data.passwordSetLink}" class="button">🔑 Imposta la tua password</a>
    </p>

    <div class="warning-box">
      <strong>⏰ Il link è valido per 24 ore</strong>
      <p style="margin: 5px 0 0 0;">Se il link scade, potrai richiederne uno nuovo dalla pagina di recupero password.</p>
    </div>

    <div class="divider"></div>

    <div class="info-box">
      <strong>🔒 Non hai richiesto questo account?</strong>
      <p style="margin: 5px 0 0 0;">Se non ti aspettavi questa email, puoi ignorarla in tutta sicurezza oppure contattare il supporto.</p>
    </div>
  `;

  return sendEmail({
    to: data.email,
    subject: 'Benvenuto in Leonardo School — Imposta la tua password',
    html: getBaseEmailTemplate(content, 'Benvenuto'),
    category: 'WELCOME',
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const emailService = {
  // Base
  sendEmail,

  // Auth emails
  sendAuthEmailVerification,
  sendAuthPasswordReset,
  sendWelcomeEmail,

  // Contract emails (to student/collaborator)
  sendContractAssignedEmail,
  sendContractSignedConfirmationEmail,
  sendContractReminderEmail,
  sendContractExpiredEmail,
  sendAccountActivatedEmail,

  // Admin notifications
  sendProfileCompletedAdminNotification,
  sendContractSignedAdminNotification,
};

export default emailService;
