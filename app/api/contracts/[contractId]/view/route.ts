/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: 'any' types used for Prisma query results with dynamic includes
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma/client';
import { cookies } from 'next/headers';
import { sanitizeText } from '@/lib/utils/escapeHtml';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;
    
    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Verify token
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        student: true,
        collaborator: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    // Get contract
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        template: true,
        student: {
          include: { user: true },
        },
        collaborator: {
          include: { user: true },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contratto non trovato' }, { status: 404 });
    }

    // Check authorization:
    // - Admin can view all contracts
    // - Student can view their own contracts
    // - Collaborator can view their own contracts
    const isAdmin = user.role === 'ADMIN';
    const isOwnStudentContract = contract.studentId && user.student?.id === contract.studentId;
    const isOwnCollaboratorContract = contract.collaboratorId && user.collaborator?.id === contract.collaboratorId;

    if (!isAdmin && !isOwnStudentContract && !isOwnCollaboratorContract) {
      return NextResponse.json({ error: 'Non autorizzato a visualizzare questo contratto' }, { status: 403 });
    }

    // Get target user info
    const targetUser = contract.student?.user || contract.collaborator?.user;
    const targetProfile = contract.student || contract.collaborator;

    const safeTemplateName = sanitizeText(contract.template.name);
    const safeTemplateDescription = sanitizeText(contract.template.description);
    const safeTargetName = sanitizeText(targetUser?.name || 'N/D');
    const safeTargetEmail = sanitizeText(targetUser?.email || 'N/D');
    const safeFiscalCode = sanitizeText((targetProfile as any)?.fiscalCode || 'N/D');
    const safeAssignedAt = sanitizeText(
      new Date(contract.assignedAt).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    );
    const safeExpiresAt = contract.expiresAt
      ? sanitizeText(
          new Date(contract.expiresAt).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        )
      : '';
    const safePrice = contract.template.price
      ? sanitizeText(
          `€ ${contract.template.price.toLocaleString('it-IT', {
            minimumFractionDigits: 2,
          })}`
        )
      : '';
    const safeSignatureDate = contract.signedAt
      ? sanitizeText(
          new Date(contract.signedAt).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        )
      : '';
    const safeSignatureIp = sanitizeText(contract.signatureIp);

    const statusClassMap: Record<string, string> = {
      PENDING: 'status-pending',
      SIGNED: 'status-signed',
      EXPIRED: 'status-expired',
      CANCELLED: 'status-cancelled',
    };

    const statusLabelMap: Record<string, string> = {
      PENDING: '⌛ In attesa di firma',
      SIGNED: '✔ Firmato',
      EXPIRED: '⚠ Scaduto',
      CANCELLED: '✖ Annullato',
    };

    // Status class and label are computed but used in templates - kept for future HTML template updates
    // eslint-disable-next-line sonarjs/no-unused-vars -- reserved for future status badge in HTML template
    const _statusClass = statusClassMap[contract.status] ?? 'status-pending';
    // eslint-disable-next-line sonarjs/no-unused-vars -- reserved for future status display in HTML template
    const _statusLabel = statusLabelMap[contract.status] ?? 'Stato non disponibile';

    const safeSignatureData =
      contract.signatureData && contract.signatureData.startsWith('data:image/')
        ? sanitizeText(contract.signatureData)
        : null;

    // Build HTML response
    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contratto - ${safeTemplateName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #8B0000, #6B0000);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { opacity: 0.9; }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 15px;
    }
    .status-pending { background: #FEF3C7; color: #92400E; }
    .status-signed { background: #D1FAE5; color: #065F46; }
    .status-expired { background: #FEE2E2; color: #991B1B; }
    .status-cancelled { background: #E5E7EB; color: #374151; }
    .actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: white;
      color: #8B0000;
    }
    .btn-primary:hover {
      background: #f5f5f5;
    }
    .btn svg {
      width: 18px;
      height: 18px;
    }
    @media print {
      .actions { display: none !important; }
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-item label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .info-item span {
      font-size: 15px;
      font-weight: 500;
      color: #111827;
    }
    .content {
      padding: 30px;
    }
    .content h2 {
      font-size: 18px;
      color: #111827;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #8B0000;
    }
    .contract-text {
      color: #374151;
      white-space: pre-wrap;
    }
    .signature-section {
      margin-top: 30px;
      padding: 20px;
      background: #f0fdf4;
      border-radius: 8px;
      border: 1px solid #86efac;
    }
    .signature-section h3 {
      color: #166534;
      margin-bottom: 15px;
    }
    .signature-info {
      font-size: 14px;
      color: #166534;
    }
    .signature-image {
      max-width: 300px;
      margin-top: 15px;
      border: 1px solid #86efac;
      border-radius: 4px;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${safeTemplateName}</h1>
      <p>${safeTemplateDescription || 'Contratto Leonardo School'}</p>
            <span class="status-badge ">
        
      </span>
      <div class="actions">
        <button class="btn btn-primary" onclick="window.print()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Scarica PDF
        </button>
      </div>
    </div>
    
    <div class="info-grid">
      <div class="info-item">
        <label>Intestatario</label>
        <span>${safeTargetName}</span>
      </div>
      <div class="info-item">
        <label>Email</label>
        <span>${safeTargetEmail}</span>
      </div>
      <div class="info-item">
        <label>Codice Fiscale</label>
        <span>${safeFiscalCode}</span>
      </div>
      <div class="info-item">
        <label>Data Assegnazione</label>
        <span>${safeAssignedAt}</span>
      </div>
      ${contract.expiresAt ? `
      <div class="info-item">
        <label>Scadenza Firma</label>
        <span>${safeExpiresAt}</span>
      </div>
      ` : ''}
      ${contract.template.price ? `
      <div class="info-item">
        <label>Importo</label>
        <span>${safePrice}</span>
      </div>
      ` : ''}
    </div>
    
    <div class="content">
      <h2>Contenuto del Contratto</h2>
      <div class="contract-text">${sanitizeHtml(contract.contentSnapshot) || 'Contenuto non disponibile'}</div>
      
      ${contract.status === 'SIGNED' && contract.signedAt ? `
      <div class="signature-section">
        <h3>✓ Contratto Firmato</h3>
        <div class="signature-info">
          <p><strong>Data firma:</strong> ${safeSignatureDate}</p>
          ${contract.signatureIp ? `<p><strong>IP:</strong> ${safeSignatureIp}</p>` : ''}
        </div>
        ${safeSignatureData ? `
        <img src="${safeSignatureData}" alt="Firma" class="signature-image" />
        ` : ''}
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error viewing contract:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
