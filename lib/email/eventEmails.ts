/**
 * Event Email Service
 * Handles sending email notifications for calendar events
 */

import nodemailer from 'nodemailer';
import type { EventType, EventLocationType, StaffAbsenceStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface EventEmailData {
  id?: string; // For iCalendar UID
  title: string;
  description?: string | null;
  type: EventType;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  locationType: EventLocationType;
  locationDetails?: string | null;
  onlineLink?: string | null;
  createdByName: string;
}

export interface InviteeData {
  email: string;
  name: string;
}

export interface AbsenceEmailData {
  requesterName: string;
  requesterEmail: string;
  startDate: Date;
  endDate: Date;
  reason?: string | null;
  status: StaffAbsenceStatus;
  adminNotes?: string | null;
}

// =============================================================================
// iCALENDAR (.ics) GENERATION
// =============================================================================

/**
 * Format date for iCalendar (YYYYMMDDTHHMMSSZ for UTC)
 */
function formatICalDate(date: Date, isAllDay: boolean): string {
  if (isAllDay) {
    // All-day events use VALUE=DATE format: YYYYMMDD
    return date.toISOString().replace(/[-:]/g, '').split('T')[0];
  }
  // Timed events use UTC: YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape special characters for iCalendar text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate iCalendar (.ics) file content for an event
 * Compatible with Google Calendar, Apple Calendar, Outlook, etc.
 */
export function generateICalendar(
  event: EventEmailData,
  method: 'REQUEST' | 'CANCEL' = 'REQUEST'
): string {
  const uid = event.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  const dtStamp = formatICalDate(now, false);
  
  // Build location string
  let location = '';
  if (event.locationType === 'ONLINE' && event.onlineLink) {
    location = event.onlineLink;
  } else if (event.locationDetails) {
    location = event.locationDetails;
  }
  
  // Build description with additional info
  let description = event.description || '';
  if (event.onlineLink) {
    description += `\\n\\nLink online: ${event.onlineLink}`;
  }
  if (event.locationType !== 'ONLINE' && event.locationDetails) {
    description += `\\n\\nLuogo: ${event.locationDetails}`;
  }
  description += `\\n\\nOrganizzato da: ${event.createdByName}`;
  description += `\\n\\n---\\nLeonardo School`;
  
  // iCalendar format
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Leonardo School//Calendar//IT',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}@leonardoschool.it`,
    `DTSTAMP:${dtStamp}`,
    `ORGANIZER;CN=${escapeICalText(event.createdByName)}:mailto:noreply@leonardoschool.it`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];
  
  // Date handling
  if (event.isAllDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatICalDate(event.startDate, true)}`);
    // For all-day events, end date is exclusive, so add one day
    const endDate = new Date(event.endDate);
    endDate.setDate(endDate.getDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${formatICalDate(endDate, true)}`);
  } else {
    lines.push(`DTSTART:${formatICalDate(event.startDate, false)}`);
    lines.push(`DTEND:${formatICalDate(event.endDate, false)}`);
  }
  
  if (location) {
    lines.push(`LOCATION:${escapeICalText(location)}`);
  }
  
  if (description) {
    lines.push(`DESCRIPTION:${escapeICalText(description)}`);
  }
  
  // Add URL if online event
  if (event.onlineLink) {
    lines.push(`URL:${event.onlineLink}`);
  }
  
  // Status for cancelled events
  if (method === 'CANCEL') {
    lines.push('STATUS:CANCELLED');
  } else {
    lines.push('STATUS:CONFIRMED');
  }
  
  // Category based on event type
  const categoryMap: Record<EventType, string> = {
    LESSON: 'Lezione',
    SIMULATION: 'Simulazione',
    MEETING: 'Riunione',
    EXAM: 'Esame',
    OTHER: 'Evento',
  };
  lines.push(`CATEGORIES:${categoryMap[event.type]}`);
  
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}

// =============================================================================
// EMAIL TRANSPORTER
// =============================================================================

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

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

// Event type labels
const eventTypeLabels: Record<EventType, string> = {
  LESSON: 'Lezione',
  SIMULATION: 'Simulazione',
  MEETING: 'Riunione',
  EXAM: 'Esame',
  OTHER: 'Altro',
};

// Location type labels
const locationTypeLabels: Record<EventLocationType, string> = {
  IN_PERSON: 'In presenza',
  ONLINE: 'Online',
  HYBRID: 'Ibrido',
};

function getEmailHeader(title: string, emoji: string, subtitle?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #a8012b 0%, #D54F8A 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; }
          .content { background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .event-card { background: linear-gradient(to bottom, #fdf2f8, white); border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #fce7f3; }
          .event-title { font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 8px; }
          .event-type { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background-color: #fce7f3; color: #a8012b; margin-bottom: 16px; }
          .info-row { display: flex; align-items: flex-start; margin-bottom: 12px; }
          .info-icon { width: 20px; margin-right: 12px; color: #a8012b; }
          .info-content { flex: 1; }
          .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-value { font-size: 14px; color: #111827; margin-top: 2px; }
          .description { background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 16px; }
          .description p { margin: 0; color: #374151; font-size: 14px; }
          .cta-button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #a8012b 0%, #D54F8A 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { background-color: #111827; color: white; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px; }
          .footer a { color: #D54F8A; }
          .divider { height: 1px; background-color: #e5e7eb; margin: 20px 0; }
          .cancelled { text-decoration: line-through; opacity: 0.6; }
          .status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
          .status-confirmed { background-color: #dcfce7; color: #166534; }
          .status-rejected { background-color: #fee2e2; color: #991b1b; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} ${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
          </div>
          <div class="content">
  `;
}

function getEmailFooter(): string {
  return `
          </div>
          <div class="footer">
            <p style="margin: 0;">Leonardo School - La tua preparazione ai test di ammissione</p>
            <p style="margin: 8px 0 0 0;">
              <a href="https://www.leonardoschool.it">www.leonardoschool.it</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateRange(start: Date, end: Date, isAllDay: boolean): string {
  const startFormatted = formatDate(start);
  const endFormatted = formatDate(end);
  
  if (isAllDay) {
    if (startFormatted === endFormatted) {
      return `${startFormatted} (tutto il giorno)`;
    }
    return `Dal ${startFormatted} al ${endFormatted} (tutto il giorno)`;
  }
  
  if (startFormatted === endFormatted) {
    return `${startFormatted}, dalle ${formatTime(start)} alle ${formatTime(end)}`;
  }
  
  return `Dal ${startFormatted} ore ${formatTime(start)} al ${endFormatted} ore ${formatTime(end)}`;
}

// =============================================================================
// EVENT INVITATION EMAIL
// =============================================================================

export async function sendEventInvitationEmail(
  event: EventEmailData,
  invitees: InviteeData[]
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  if (invitees.length === 0) {
    return { success: true, sentCount: 0, errors: [] };
  }

  const errors: string[] = [];
  let sentCount = 0;

  const subject = `📅 Nuovo evento: ${event.title}`;
  
  // Build HTML content
  let htmlContent = getEmailHeader('Sei stato invitato ad un evento', '📅', 'Leonardo School');
  
  htmlContent += `
    <div class="event-card">
      <span class="event-type">${eventTypeLabels[event.type]}</span>
      <div class="event-title">${event.title}</div>
      
      <div class="info-row">
        <span class="info-icon">📆</span>
        <div class="info-content">
          <div class="info-label">Data e ora</div>
          <div class="info-value">${formatDateRange(event.startDate, event.endDate, event.isAllDay)}</div>
        </div>
      </div>
      
      <div class="info-row">
        <span class="info-icon">${event.locationType === 'ONLINE' ? '💻' : '📍'}</span>
        <div class="info-content">
          <div class="info-label">Modalità</div>
          <div class="info-value">${locationTypeLabels[event.locationType]}</div>
          ${event.locationDetails ? `<div class="info-value" style="color: #6b7280;">${event.locationDetails}</div>` : ''}
        </div>
      </div>
      
      ${event.onlineLink ? `
        <a href="${event.onlineLink}" class="cta-button">Partecipa online</a>
      ` : ''}
      
      ${event.description ? `
        <div class="description">
          <p>${event.description.replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}
    </div>
    
    <p style="color: #6b7280; font-size: 13px;">
      Evento creato da <strong>${event.createdByName}</strong>
    </p>
  `;
  
  htmlContent += getEmailFooter();
  
  // Plain text version
  const textContent = `
Sei stato invitato ad un evento - Leonardo School

${event.title}
Tipo: ${eventTypeLabels[event.type]}

Data: ${formatDateRange(event.startDate, event.endDate, event.isAllDay)}
Modalità: ${locationTypeLabels[event.locationType]}
${event.locationDetails ? `Luogo: ${event.locationDetails}` : ''}
${event.onlineLink ? `Link online: ${event.onlineLink}` : ''}

${event.description ? `Descrizione:\n${event.description}` : ''}

Evento creato da: ${event.createdByName}

---
Leonardo School - www.leonardoschool.it
  `.trim();

  // Generate iCalendar file for calendar integration
  const icsContent = generateICalendar(event, 'REQUEST');

  const transporter = createEmailTransporter();

  // Send to each invitee individually
  for (const invitee of invitees) {
    try {
      await transporter.sendMail({
        from: `"Leonardo School" <${process.env.EMAIL_FROM}>`,
        to: invitee.email,
        subject,
        html: htmlContent.replace('Ciao,', `Ciao ${invitee.name},`),
        text: textContent,
        attachments: [
          {
            filename: 'evento.ics',
            content: icsContent,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST',
          },
        ],
        // Alternative calendar content for better compatibility
        icalEvent: {
          filename: 'invite.ics',
          method: 'REQUEST',
          content: icsContent,
        },
      });
      sentCount++;
    } catch (error) {
      console.error(`Error sending event invitation to ${invitee.email}:`, error);
      errors.push(`${invitee.email}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  return { success: errors.length === 0, sentCount, errors };
}

// =============================================================================
// EVENT MODIFICATION EMAIL
// =============================================================================

export async function sendEventModificationEmail(
  event: EventEmailData,
  invitees: InviteeData[],
  changes?: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  if (invitees.length === 0) {
    return { success: true, sentCount: 0, errors: [] };
  }

  const errors: string[] = [];
  let sentCount = 0;

  const subject = `🔄 Evento modificato: ${event.title}`;
  
  let htmlContent = getEmailHeader('Un evento è stato modificato', '🔄', 'Aggiornamento importante');
  
  htmlContent += `
    <p style="color: #374151; margin-bottom: 20px;">
      L'evento a cui sei stato invitato ha subito delle modifiche. Controlla i nuovi dettagli qui sotto.
    </p>
    
    <div class="event-card">
      <span class="event-type">${eventTypeLabels[event.type]}</span>
      <div class="event-title">${event.title}</div>
      
      <div class="info-row">
        <span class="info-icon">📆</span>
        <div class="info-content">
          <div class="info-label">Data e ora</div>
          <div class="info-value">${formatDateRange(event.startDate, event.endDate, event.isAllDay)}</div>
        </div>
      </div>
      
      <div class="info-row">
        <span class="info-icon">${event.locationType === 'ONLINE' ? '💻' : '📍'}</span>
        <div class="info-content">
          <div class="info-label">Modalità</div>
          <div class="info-value">${locationTypeLabels[event.locationType]}</div>
          ${event.locationDetails ? `<div class="info-value" style="color: #6b7280;">${event.locationDetails}</div>` : ''}
        </div>
      </div>
      
      ${event.onlineLink ? `
        <a href="${event.onlineLink}" class="cta-button">Partecipa online</a>
      ` : ''}
      
      ${event.description ? `
        <div class="description">
          <p>${event.description.replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}
    </div>
    
    ${changes ? `
      <div class="divider"></div>
      <p style="color: #6b7280; font-size: 13px;"><strong>Modifiche effettuate:</strong><br>${changes}</p>
    ` : ''}
  `;
  
  htmlContent += getEmailFooter();
  
  const textContent = `
Evento modificato - Leonardo School

L'evento "${event.title}" è stato modificato.

Nuovi dettagli:
Tipo: ${eventTypeLabels[event.type]}
Data: ${formatDateRange(event.startDate, event.endDate, event.isAllDay)}
Modalità: ${locationTypeLabels[event.locationType]}
${event.locationDetails ? `Luogo: ${event.locationDetails}` : ''}
${event.onlineLink ? `Link online: ${event.onlineLink}` : ''}

${event.description ? `Descrizione:\n${event.description}` : ''}

${changes ? `Modifiche: ${changes}` : ''}

---
Leonardo School - www.leonardoschool.it
  `.trim();

  // Generate updated iCalendar file
  const icsContent = generateICalendar(event, 'REQUEST');

  const transporter = createEmailTransporter();

  for (const invitee of invitees) {
    try {
      await transporter.sendMail({
        from: `"Leonardo School" <${process.env.EMAIL_FROM}>`,
        to: invitee.email,
        subject,
        html: htmlContent,
        text: textContent,
        attachments: [
          {
            filename: 'evento-aggiornato.ics',
            content: icsContent,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST',
          },
        ],
        icalEvent: {
          filename: 'invite.ics',
          method: 'REQUEST',
          content: icsContent,
        },
      });
      sentCount++;
    } catch (error) {
      console.error(`Error sending event modification to ${invitee.email}:`, error);
      errors.push(`${invitee.email}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  return { success: errors.length === 0, sentCount, errors };
}

// =============================================================================
// EVENT CANCELLATION EMAIL
// =============================================================================

export async function sendEventCancellationEmail(
  event: EventEmailData,
  invitees: InviteeData[],
  reason?: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  if (invitees.length === 0) {
    return { success: true, sentCount: 0, errors: [] };
  }

  const errors: string[] = [];
  let sentCount = 0;

  const subject = `❌ Evento annullato: ${event.title}`;
  
  let htmlContent = getEmailHeader('Evento annullato', '❌', 'Comunicazione importante');
  
  htmlContent += `
    <p style="color: #374151; margin-bottom: 20px;">
      Ci dispiace informarti che il seguente evento è stato <strong>annullato</strong>.
    </p>
    
    <div class="event-card" style="opacity: 0.7;">
      <span class="event-type">${eventTypeLabels[event.type]}</span>
      <div class="event-title cancelled">${event.title}</div>
      
      <div class="info-row">
        <span class="info-icon">📆</span>
        <div class="info-content">
          <div class="info-label">Data prevista</div>
          <div class="info-value cancelled">${formatDateRange(event.startDate, event.endDate, event.isAllDay)}</div>
        </div>
      </div>
    </div>
    
    ${reason ? `
      <div class="divider"></div>
      <p style="color: #6b7280;"><strong>Motivo:</strong> ${reason}</p>
    ` : ''}
    
    <p style="color: #374151; margin-top: 20px;">
      Ci scusiamo per l'inconveniente. Per qualsiasi domanda, non esitare a contattarci.
    </p>
  `;
  
  htmlContent += getEmailFooter();
  
  const textContent = `
Evento annullato - Leonardo School

L'evento "${event.title}" è stato ANNULLATO.

Dettagli evento annullato:
Data prevista: ${formatDateRange(event.startDate, event.endDate, event.isAllDay)}

${reason ? `Motivo: ${reason}` : ''}

Ci scusiamo per l'inconveniente.

---
Leonardo School - www.leonardoschool.it
  `.trim();

  // Generate CANCEL iCalendar to remove event from calendars
  const icsContent = generateICalendar(event, 'CANCEL');

  const transporter = createEmailTransporter();

  for (const invitee of invitees) {
    try {
      await transporter.sendMail({
        from: `"Leonardo School" <${process.env.EMAIL_FROM}>`,
        to: invitee.email,
        subject,
        html: htmlContent,
        text: textContent,
        attachments: [
          {
            filename: 'evento-annullato.ics',
            content: icsContent,
            contentType: 'text/calendar; charset=utf-8; method=CANCEL',
          },
        ],
        icalEvent: {
          filename: 'cancel.ics',
          method: 'CANCEL',
          content: icsContent,
        },
      });
      sentCount++;
    } catch (error) {
      console.error(`Error sending event cancellation to ${invitee.email}:`, error);
      errors.push(`${invitee.email}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  return { success: errors.length === 0, sentCount, errors };
}

// =============================================================================
// ABSENCE STATUS EMAIL
// =============================================================================

export async function sendAbsenceStatusEmail(
  absence: AbsenceEmailData
): Promise<{ success: boolean; error?: string }> {
  const statusLabels: Record<StaffAbsenceStatus, string> = {
    PENDING: 'In attesa',
    CONFIRMED: 'Confermata',
    REJECTED: 'Rifiutata',
    CANCELLED: 'Annullata',
  };
  
  const statusEmojis: Record<StaffAbsenceStatus, string> = {
    PENDING: '⏳',
    CONFIRMED: '✅',
    REJECTED: '❌',
    CANCELLED: '🚫',
  };
  
  const statusClasses: Record<StaffAbsenceStatus, string> = {
    PENDING: 'status-pending',
    CONFIRMED: 'status-confirmed',
    REJECTED: 'status-rejected',
    CANCELLED: 'status-rejected',
  };

  const subject = `${statusEmojis[absence.status]} Richiesta assenza: ${statusLabels[absence.status]}`;
  
  let htmlContent = getEmailHeader(
    'Aggiornamento richiesta assenza',
    statusEmojis[absence.status],
    'Leonardo School'
  );
  
  htmlContent += `
    <p style="color: #374151; margin-bottom: 20px;">
      La tua richiesta di assenza è stata aggiornata.
    </p>
    
    <div class="event-card">
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="status-badge ${statusClasses[absence.status]}">${statusLabels[absence.status]}</span>
      </div>
      
      <div class="info-row">
        <span class="info-icon">📆</span>
        <div class="info-content">
          <div class="info-label">Periodo richiesto</div>
          <div class="info-value">${formatDateRange(absence.startDate, absence.endDate, true)}</div>
        </div>
      </div>
      
      ${absence.reason ? `
        <div class="info-row">
          <span class="info-icon">📝</span>
          <div class="info-content">
            <div class="info-label">Motivazione</div>
            <div class="info-value">${absence.reason}</div>
          </div>
        </div>
      ` : ''}
      
      ${absence.adminNotes ? `
        <div class="divider"></div>
        <div class="info-row">
          <span class="info-icon">💬</span>
          <div class="info-content">
            <div class="info-label">Note dell'amministrazione</div>
            <div class="info-value">${absence.adminNotes}</div>
          </div>
        </div>
      ` : ''}
    </div>
    
    ${absence.status === 'CONFIRMED' ? `
      <p style="color: #166534; background: #dcfce7; padding: 12px; border-radius: 8px; text-align: center;">
        ✅ La tua assenza è stata approvata. Buon riposo!
      </p>
    ` : absence.status === 'REJECTED' ? `
      <p style="color: #991b1b; background: #fee2e2; padding: 12px; border-radius: 8px; text-align: center;">
        Per maggiori informazioni, contatta l'amministrazione.
      </p>
    ` : ''}
  `;
  
  htmlContent += getEmailFooter();
  
  const textContent = `
Aggiornamento richiesta assenza - Leonardo School

Stato: ${statusLabels[absence.status]}

Periodo richiesto: ${formatDateRange(absence.startDate, absence.endDate, true)}
${absence.reason ? `Motivazione: ${absence.reason}` : ''}
${absence.adminNotes ? `Note amministrazione: ${absence.adminNotes}` : ''}

---
Leonardo School - www.leonardoschool.it
  `.trim();

  try {
    const transporter = createEmailTransporter();
    
    await transporter.sendMail({
      from: `"Leonardo School" <${process.env.EMAIL_FROM}>`,
      to: absence.requesterEmail,
      subject,
      html: htmlContent,
      text: textContent,
    });
    
    return { success: true };
  } catch (error) {
    console.error(`Error sending absence status email to ${absence.requesterEmail}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    };
  }
}
