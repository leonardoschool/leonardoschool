/**
 * Calendar PDF Export
 *
 * Genera una vista stampabile del calendario nel browser e attiva la finestra
 * di stampa, da cui l'utente può scegliere "Salva come PDF".
 *
 * Approccio scelto per evitare nuove dipendenze pesanti (jsPDF, puppeteer, ecc.)
 * — sufficiente per i requisiti correnti (export inviato manualmente alle classi).
 */

export interface CalendarExportEvent {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  locationType?: string | null;
  locationDetails?: string | null;
  onlineLink?: string | null;
  isCancelled?: boolean;
  tag?: { id: string; name: string; color: string } | null;
  invitations?: Array<{
    user?: { id: string; name: string | null } | null;
    group?: { id: string; name: string } | null;
  }>;
}

export interface CalendarExportOptions {
  /** Title shown at the top of the document */
  title: string;
  /** Subtitle (e.g. selected date range / filters summary) */
  subtitle?: string;
  /** Events to render, already filtered/sorted */
  events: CalendarExportEvent[];
  /** Optional translation map for type → label */
  typeLabels?: Record<string, string>;
}

const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatRange = (start: Date, end: Date, allDay: boolean): string => {
  const dateFmt: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const sameDay = start.toDateString() === end.toDateString();

  if (allDay) {
    if (sameDay) return start.toLocaleDateString('it-IT', dateFmt);
    return `${start.toLocaleDateString('it-IT', dateFmt)} → ${end.toLocaleDateString('it-IT', dateFmt)}`;
  }
  if (sameDay) {
    return `${start.toLocaleDateString('it-IT', dateFmt)} · ${start.toLocaleTimeString('it-IT', timeFmt)} – ${end.toLocaleTimeString('it-IT', timeFmt)}`;
  }
  return `${start.toLocaleDateString('it-IT', dateFmt)} ${start.toLocaleTimeString('it-IT', timeFmt)} → ${end.toLocaleDateString('it-IT', dateFmt)} ${end.toLocaleTimeString('it-IT', timeFmt)}`;
};

const renderRow = (event: CalendarExportEvent, typeLabels?: Record<string, string>): string => {
  const tagBadge = event.tag
    ? `<span class="badge" style="background:${escapeHtml(event.tag.color)}1a;color:${escapeHtml(event.tag.color)};border-color:${escapeHtml(event.tag.color)}">${escapeHtml(event.tag.name)}</span>`
    : '';
  const typeLabel = typeLabels?.[event.type] ?? event.type;
  const groups = (event.invitations ?? [])
    .map((i) => i.group?.name)
    .filter((n): n is string => !!n);
  const users = (event.invitations ?? [])
    .map((i) => i.user?.name)
    .filter((n): n is string => !!n);

  const inviteesParts: string[] = [];
  if (groups.length > 0) inviteesParts.push(`<strong>Gruppi:</strong> ${escapeHtml(groups.join(', '))}`);
  if (users.length > 0) inviteesParts.push(`<strong>Utenti:</strong> ${escapeHtml(users.join(', '))}`);

  const location = [event.locationDetails, event.onlineLink].filter(Boolean).join(' · ');

  return `
    <tr class="${event.isCancelled ? 'cancelled' : ''}">
      <td class="when">${escapeHtml(formatRange(event.startDate, event.endDate, event.isAllDay))}</td>
      <td>
        <div class="title">${escapeHtml(event.title)}${event.isCancelled ? ' <em>(annullato)</em>' : ''}</div>
        ${event.description ? `<div class="desc">${escapeHtml(event.description)}</div>` : ''}
        ${inviteesParts.length > 0 ? `<div class="invitees">${inviteesParts.join(' &nbsp;·&nbsp; ')}</div>` : ''}
      </td>
      <td><span class="type">${escapeHtml(typeLabel)}</span></td>
      <td>${tagBadge}</td>
      <td class="location">${escapeHtml(location || '—')}</td>
    </tr>
  `;
};

/**
 * Build the printable HTML document and open it in a new window.
 * Triggers the browser's print dialog automatically.
 */
export function exportCalendarToPdf(options: CalendarExportOptions): void {
  if (typeof window === 'undefined') return;

  const { title, subtitle, events, typeLabels } = options;
  const sorted = [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 12mm 18mm 12mm;

      @bottom-center {
        content: "Pagina " counter(page);
        font-family: "Times New Roman", Times, serif;
        font-size: 10pt;
      }
    }

    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111827;
      margin: 24px;
      font-size: 12px;
      line-height: 1.45;
    }
    h1 { font-size: 20px; margin: 0 0 4px 0; color: #a8012b; }
    .subtitle { color: #4b5563; margin-bottom: 16px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      text-align: left;
      vertical-align: top;
      padding: 8px 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #374151;
    }
    .when { white-space: nowrap; font-weight: 600; }
    .title { font-weight: 600; }
    .desc { color: #4b5563; font-size: 11px; margin-top: 2px; }
    .invitees { color: #6b7280; font-size: 11px; margin-top: 2px; }
    .type { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 500; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; border: 1px solid; font-size: 11px; font-weight: 500; }
    tr.cancelled td { color: #9ca3af; text-decoration: line-through; }
    .footer { margin-top: 24px; color: #9ca3af; font-size: 10px; }
    @media print {
      body { margin: 0; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
  ${sorted.length === 0
    ? '<p>Nessun evento nel periodo selezionato.</p>'
    : `<table>
        <thead>
          <tr>
            <th>Quando</th>
            <th>Evento</th>
            <th>Tipo</th>
            <th>Tag</th>
            <th>Luogo</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((e) => renderRow(e, typeLabels)).join('')}
        </tbody>
      </table>`}
  <div class="footer">Generato il ${new Date().toLocaleString('it-IT')}</div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 150);
    });
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
  if (!win) {
    // Popup blocked: fall back to a Blob URL the user can open manually.
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
