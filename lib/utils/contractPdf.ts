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
  const logoUrl = `${window.location.origin}/images/NEW_LOGO_2026/Logo_sito.png`;
  const studentName = contract.student?.user.name.replace(/\s+/g, '_') || 'Utente';
  const contractName = contract.template.name.replace(/\s+/g, '_');
  const fileName = `Contratto_${contractName}_${studentName}`;
  
  // Sanitize content before generating PDF
  const sanitizedContent = sanitizeHtml(contract.contentSnapshot);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${fileName}</title>
      <style>
        body { 
          font-family: 'Times New Roman', Times, serif; 
          line-height: 1.6; 
          padding: 40px; 
          max-width: 800px; 
          margin: 0 auto; 
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
        }
        .signature-section { 
          margin-top: 50px; 
          page-break-inside: avoid; 
        }
        .signature-image { 
          max-width: 200px; 
          height: auto; 
          border-bottom: 1px solid #333; 
          background: white; 
          padding: 10px; 
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
          body { padding: 20px; }
          .logo-container { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
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
      <div class="signature-section">
        <p><strong>Firma${contract.student ? ' dello studente' : ''}:</strong></p>
        ${contract.signatureData 
          ? `<img src="${contract.signatureData}" alt="Firma" class="signature-image" />` 
          : '<p>-</p>'
        }
        ${contract.student 
          ? `<p><strong>Nome:</strong> ${contract.student.user.name}</p>` 
          : ''
        }
        <p><strong>Data firma:</strong> ${
          contract.signedAt 
            ? new Date(contract.signedAt).toLocaleString('it-IT') 
            : '-'
        }</p>
      </div>
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
  const printWindow = window.open(url, '_blank');
  
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
