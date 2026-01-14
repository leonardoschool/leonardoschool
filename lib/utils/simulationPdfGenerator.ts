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

interface PdfSection {
  id: string;
  name: string;
  durationMinutes: number;
  questionIds?: string[];
  subjectId?: string | null;
  order: number;
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
  // Sections support
  hasSections?: boolean;
  showSectionsInPaper?: boolean;
  sections?: PdfSection[];
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
 * Clean text for PDF output - removes HTML and simplifies LaTeX
 * Note: LaTeX formulas cannot be rendered in jsPDF, so we convert them to readable text
 */
function cleanTextForPdf(text: string): string {
  let cleaned = text;
  
  // First, handle LaTeX environments (convert to readable format)
  // \begin{cases}...\end{cases} -> simplified system notation
  cleaned = cleaned.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, content) => {
    // Convert cases content to readable format
    const equations = content
      .split('\\\\')
      .map((eq: string) => eq.trim())
      .filter((eq: string) => eq.length > 0)
      .join('; ');
    return `{ ${equations} }`;
  });
  
  // Handle other common LaTeX environments
  cleaned = cleaned.replace(/\\begin\{(\w+)\}([\s\S]*?)\\end\{\1\}/g, (_, _env, content) => {
    return content.replace(/\\\\/g, '; ').trim();
  });
  
  // Handle display math delimiters: $$ ... $$ or \[ ... \]
  cleaned = cleaned.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => simplifyLatex(latex));
  cleaned = cleaned.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex) => simplifyLatex(latex));
  
  // Handle inline math: $ ... $ or \( ... \)
  cleaned = cleaned.replace(/(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, (_, latex) => simplifyLatex(latex));
  cleaned = cleaned.replace(/\\\(([\s\S]*?)\\\)/g, (_, latex) => simplifyLatex(latex));
  
  // Now strip HTML
  return stripHtml(cleaned);
}

/**
 * Simplify LaTeX formula to readable text
 */
function simplifyLatex(latex: string): string {
  let simplified = latex.trim();
  
  // Common LaTeX to text conversions
  simplified = simplified
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)') // fractions
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)') // square root
    .replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '$1√($2)') // nth root
    .replace(/\^(\d)/g, '^$1') // simple exponents
    .replace(/\^\{([^}]+)\}/g, '^($1)') // complex exponents
    .replace(/_(\d)/g, '₍$1₎') // simple subscripts (approximate)
    .replace(/_\{([^}]+)\}/g, '_($1)') // complex subscripts
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞')
    .replace(/\\pi/g, 'π')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\prod/g, 'Π')
    .replace(/\\int/g, '∫')
    .replace(/\\partial/g, '∂')
    .replace(/\\nabla/g, '∇')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\Leftarrow/g, '⇐')
    .replace(/\\[a-zA-Z]+/g, '') // remove remaining LaTeX commands
    .replace(/\{|\}/g, '') // remove braces
    .replace(/\s+/g, ' ') // normalize spaces
    .trim();
  
  return simplified;
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

  // Description (if present)
  if (data.description) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const descLines = doc.splitTextToSize(data.description, contentWidth);
    doc.text(descLines, pageWidth / 2, yPos, { align: 'center' });
    yPos += descLines.length * 5 + 3;
  }

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

  // Helper function to render a section header
  const renderSectionHeader = (sectionName: string, sectionDuration: number, sectionQuestionCount: number) => {
    // Check if we need a new page for section header
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    // Section divider line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Section header box
    doc.setFillColor(245, 245, 250);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, contentWidth, 12, 'FD');
    
    // Section name
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(sectionName.toUpperCase(), margin + 5, yPos + 8);
    
    // Section info (duration and question count)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const sectionInfo = `${sectionDuration} min · ${sectionQuestionCount} domande`;
    doc.text(sectionInfo, pageWidth - margin - 5, yPos + 8, { align: 'right' });
    
    yPos += 18;
    doc.setTextColor(0, 0, 0);
  };

  // Helper function to render a question
  const renderQuestion = (question: Question, questionNumber: number) => {
    // Check if we need a new page
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    const questionText = cleanTextForPdf(question.text);

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
      
      const answerText = cleanTextForPdf(answer.text);
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
  };

  // Check if we should render with sections
  const shouldShowSections = data.hasSections && data.showSectionsInPaper && data.sections && data.sections.length > 0;

  if (shouldShowSections) {
    // Render questions grouped by sections
    const sortedSections = [...data.sections!].sort((a, b) => a.order - b.order);
    let globalQuestionNumber = 1;

    for (const section of sortedSections) {
      // Get questions for this section
      const sectionQuestionIds = section.questionIds || [];
      const sectionQuestions = sectionQuestionIds
        .map(id => data.questions.find(q => q.id === id))
        .filter((q): q is Question => q !== undefined);

      if (sectionQuestions.length === 0) continue;

      // Render section header
      renderSectionHeader(section.name, section.durationMinutes, sectionQuestions.length);

      // Render questions in this section
      for (const question of sectionQuestions) {
        renderQuestion(question, globalQuestionNumber);
        globalQuestionNumber++;
      }

      yPos += 4; // Extra space after section
    }

    // Render any questions not assigned to sections
    const assignedQuestionIds = sortedSections.flatMap(s => s.questionIds || []);
    const unassignedQuestions = data.questions.filter(q => !assignedQuestionIds.includes(q.id));
    
    if (unassignedQuestions.length > 0) {
      renderSectionHeader('Altre domande', 0, unassignedQuestions.length);
      for (const question of unassignedQuestions) {
        renderQuestion(question, globalQuestionNumber);
        globalQuestionNumber++;
      }
    }
  } else {
    // Render questions without sections (original behavior)
    data.questions.forEach((question, index) => {
      renderQuestion(question, index + 1);
    });
  }

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
