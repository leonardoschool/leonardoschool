import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

export interface ContractPdfData {
  id: string;
  contentSnapshot: string;
  signatureData?: string | null;
  signedAt?: Date | string | null;
  assignedAt: Date | string;
  template: {
    name: string;
  };
  student?: {
    user: {
      name: string;
      email: string;
    };
  };
}

/**
 * Generate and print a contract as PDF
 * Opens a print dialog for the user to save as PDF
 */
export function generateContractPdf(contract: ContractPdfData): void {
  const logoUrl = `${globalThis.location.origin}/images/NEW_LOGO_2026/Logo_sito.png`;
  const studentName = contract.student?.user.name.replace(/\s+/g, '_') || 'Utente';
  const contractName = contract.template.name.replace(/\s+/g, '_');
  const fileName = `Contratto_${contractName}_${studentName}`;
  
  // Replace {{FIRMA}} with a professional "Firma: ___ [signature image on line]" block
  const signatureBlock = contract.signatureData
    ? `<div style="margin:20px 0;page-break-inside:avoid;">
        <strong style="vertical-align:bottom;">Firma:</strong>&nbsp;<span style="display:inline-block;vertical-align:bottom;min-width:300px;border-bottom:1px solid #333;">
          <img src="${contract.signatureData}" alt="Firma" style="display:block;height:60px;max-width:300px;background:white;" />
        </span>
      </div>`
    : `<div style="margin:20px 0;page-break-inside:avoid;">
        <strong>Firma:</strong>&nbsp;<span style="display:inline-block;border-bottom:1px solid #333;min-width:300px;">&nbsp;</span>
      </div>`;
  const contentWithSignature = (contract.contentSnapshot ?? '').replaceAll('{{FIRMA}}', signatureBlock);
  const sanitizedContent = sanitizeHtml(contentWithSignature);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${fileName}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 15mm 20mm 15mm;

          @bottom-center {
            content: "Pagina " counter(page);
            font-family: 'Times New Roman', Times, serif;
            font-size: 10pt;
          }
        }

        * { box-sizing: border-box; }

        body {
          font-family: 'Times New Roman', Times, serif;
          line-height: 1.6;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo-container {
          background: #8B1A1A;
          padding: 20px 40px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .logo-container img {
          max-width: 300px;
          height: auto;
        }
        h1 {
          text-align: center;
          color: #333;
          margin: 0;
          font-size: 24px;
          padding-top: 15px;
          border-top: 2px solid #8B1A1A;
        }
        .contract-content {
          margin: 30px 0;
          text-align: justify;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        /* Force all editor-generated content to fit page width */
        .contract-content * {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        .contract-content img {
          height: auto !important;
        }
        .contract-content table {
          width: 100% !important;
          table-layout: fixed !important;
        }
        .contract-content td,
        .contract-content th {
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        .signature-section {
          margin-top: 50px;
          page-break-inside: avoid;
        }
        .signature-field {
          display: inline-block;
          min-width: 320px;
          margin: 8px 0 4px;
        }
        .signature-field img {
          display: block;
          max-width: 320px;
          height: 80px;
          object-fit: contain;
          background: white;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          width: 320px;
        }
        .meta-info {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-top: 30px;
          font-size: 12px;
        }
        .meta-info p {
          margin: 5px 0;
        }
        @media print {
          body {
            padding: 0;
            max-width: 100%;
            width: 100%;
          }
          .logo-container {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .contract-content * {
            max-width: 100% !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
          }
          .contract-content table {
            width: 100% !important;
            table-layout: fixed !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-container">
          <img src="${logoUrl}" alt="Leonardo School" />
        </div>
        <h1>${contract.template.name}</h1>
      </div>
      <div class="contract-content">
        ${sanitizedContent}
      </div>
      ${!(contract.contentSnapshot ?? '').includes('{{FIRMA}}') ? `
      <div class="signature-section">
        <p><strong>Firma${contract.student ? ' dello studente' : ''}:</strong></p>
        <div class="signature-field">
          ${contract.signatureData
            ? `<img src="${contract.signatureData}" alt="Firma" />`
            : '<div style="height:80px;"></div>'
          }
          <div class="signature-line"></div>
        </div>
        ${contract.student
          ? `<p style="margin-top:8px;"><strong>Nome:</strong> ${contract.student.user.name}</p>`
          : ''
        }
        <p><strong>Data firma:</strong> ${
          contract.signedAt
            ? new Date(contract.signedAt).toLocaleString('it-IT')
            : '-'
        }</p>
      </div>` : ''}
      <div class="meta-info">
        <p><strong>ID Contratto:</strong> ${contract.id}</p>
        <p><strong>Data assegnazione:</strong> ${new Date(contract.assignedAt).toLocaleString('it-IT')}</p>
        ${contract.student 
          ? `<p><strong>Email studente:</strong> ${contract.student.user.email}</p>` 
          : ''
        }
      </div>
    </body>
    </html>
  `;

  // Create blob and open print dialog
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = globalThis.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      // Set document title for PDF filename
      printWindow.document.title = fileName;
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}
