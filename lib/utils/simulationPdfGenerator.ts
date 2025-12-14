/**
 * Simulation PDF Generator
 * Generates exam-style PDFs for paper-based simulations
 */
import jsPDF from 'jspdf';

// Leonardo School brand color (bordeaux)
const BRAND_COLOR: [number, number, number] = [168, 1, 43]; // #a8012b

interface Question {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  subject?: { name?: string | null; color?: string | null } | null;
  topic?: { name?: string | null } | null;
  answers?: Array<{
    id?: string;
    text: string;
    isCorrect: boolean;
    order?: number;
  }>;
}

interface SimulationPdfData {
  title: string;
  description?: string;
  durationMinutes: number;
  correctPoints: number;
  wrongPoints: number;
  blankPoints: number;
  questions: Question[];
  paperInstructions?: string;
  // School info
  schoolName?: string;
  academicYear?: string;
  date?: string;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Generate exam PDF
 */
export function generateSimulationPdf(data: SimulationPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Leonardo School brand color (bordeaux: #a8012b)
  const primaryColor = BRAND_COLOR;

  // ============ HEADER ============
  // School name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(data.schoolName || 'Leonardo School', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(data.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Academic year and date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const dateStr = data.date || new Date().toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const academicYear = data.academicYear || `Anno Accademico ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  doc.text(`${academicYear} - ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Divider line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // ============ STUDENT INFO BOX ============
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, contentWidth, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('Cognome e Nome: _______________________________________________', margin + 5, yPos + 7);
  doc.text('Matricola: _______________________', margin + 5, yPos + 15);
  doc.text(`Data: ${dateStr}`, pageWidth - margin - 50, yPos + 15);
  yPos += 28;

  // ============ INSTRUCTIONS ============
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, contentWidth, 30, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPos, contentWidth, 30);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ISTRUZIONI', margin + 5, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  const instructions = [
    `• Tempo a disposizione: ${data.durationMinutes > 0 ? `${data.durationMinutes} minuti` : 'Illimitato'}`,
    `• Punteggio: Risposta corretta +${data.correctPoints}, Risposta errata ${data.wrongPoints}, Non risposta ${data.blankPoints}`,
    `• Numero domande: ${data.questions.length}`,
    data.paperInstructions ? `• ${data.paperInstructions}` : '• Segnare con una X la risposta corretta. Non sono ammesse correzioni.',
  ];
  
  let instrY = yPos + 12;
  instructions.forEach((instr) => {
    if (instr) {
      const lines = doc.splitTextToSize(instr, contentWidth - 10);
      doc.text(lines, margin + 5, instrY);
      instrY += lines.length * 4;
    }
  });
  yPos += 38;

  // ============ QUESTIONS ============
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('DOMANDE A RISPOSTA MULTIPLA', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Render each question
  data.questions.forEach((question, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    const questionNumber = index + 1;
    const questionText = stripHtml(question.text);

    // Question number and text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    const questionLines = doc.splitTextToSize(`${questionNumber}. ${questionText}`, contentWidth - 5);
    
    // Check if question + answers fit on current page
    const estimatedHeight = questionLines.length * 5 + (question.answers?.length || 4) * 6 + 10;
    if (yPos + estimatedHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }

    doc.text(questionLines, margin, yPos);
    yPos += questionLines.length * 5 + 3;

    // Answers
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const answers = question.answers || [];
    
    // Sort answers by order (default to 0 if not provided)
    const sortedAnswers = [...answers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    sortedAnswers.forEach((answer, ansIndex) => {
      if (ansIndex >= letters.length) return;
      
      const answerText = stripHtml(answer.text);
      const answerLines = doc.splitTextToSize(`${letters[ansIndex]})  ${answerText}`, contentWidth - 15);
      
      // Check page break
      if (yPos + answerLines.length * 5 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
      
      doc.text(answerLines, margin + 8, yPos);
      yPos += answerLines.length * 5 + 1;
    });

    yPos += 6; // Space between questions
  });

  // ============ FOOTER ============
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pagina ${i} di ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc;
}

/**
 * Generate and open PDF in new tab for preview
 */
export function previewSimulationPdf(data: SimulationPdfData): void {
  const doc = generateSimulationPdf(data);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}

/**
 * Generate and download PDF
 */
export function downloadSimulationPdf(data: SimulationPdfData, filename?: string): void {
  const doc = generateSimulationPdf(data);
  doc.save(filename || `${data.title.replace(/\s+/g, '_')}.pdf`);
}
