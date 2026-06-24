'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import ConfirmModal from '@/components/ui/ConfirmModal';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import { normalizeImageSrc } from '@/lib/utils/imageUrl';
import { renderLatexImagesForPrint } from '@/lib/utils/latex';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Archive,
  Send,
  Target,
  Award,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Printer,
  User,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { SimulationType, SimulationStatus } from '@/lib/validations/simulationValidation';

// Type labels
const typeLabels: Record<SimulationType, string> = {
  OFFICIAL: 'Ufficiale',
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

// Status labels
const statusLabels: Record<SimulationStatus, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicata',
  ARCHIVED: 'Archiviata',
};

// Status colors
const statusColors: Record<SimulationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ARCHIVED: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

interface DetailSection {
  id: string;
  name: string;
  durationMinutes: number;
  questionIds: string[];
  subjectId?: string | null;
  order: number;
}

function parseDetailSections(rawSections: unknown): DetailSection[] {
  if (!Array.isArray(rawSections)) return [];

  return rawSections.map((rawSection, index) => {
    const section = rawSection as Partial<DetailSection>;
    return {
      id: section.id || `section-${index}`,
      name: section.name || `Sezione ${index + 1}`,
      durationMinutes: section.durationMinutes || 0,
      questionIds: Array.isArray(section.questionIds) ? section.questionIds : [],
      subjectId: section.subjectId ?? null,
      order: section.order ?? index,
    };
  }).sort((a, b) => a.order - b.order);
}

interface StaffSimulationDetailContentProps {
  id: string;
  role: 'ADMIN' | 'COLLABORATOR';
}

export default function StaffSimulationDetailContent({ id, role }: StaffSimulationDetailContentProps) {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const isAdmin = role === 'ADMIN';

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [forceDeleteConfirm, setForceDeleteConfirm] = useState<{ resultsCount: number } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());

  const togglePreview = (questionId: string) => {
    setExpandedPreviews((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Fetch simulation
  const { data: simulation, isLoading } = trpc.simulations.getSimulation.useQuery({ id });

  // Mutations
  const deleteMutation = trpc.simulations.delete.useMutation({
    onSuccess: () => {
      showSuccess('Eliminata', 'Simulazione eliminata con successo');
      router.push('/simulazioni');
    },
    onError: (error) => {
      // Check if error is about having results - offer force delete
      if (error.message.includes('risultati salvati') || error.message.includes('Usa l\'eliminazione forzata')) {
        // Extract results count from message if possible
        const match = error.message.match(/ha (\d+) risultati/);
        const resultsCount = match ? parseInt(match[1], 10) : 0;
        
        // Close normal delete dialog and show force delete dialog
        setDeleteConfirm(false);
        setForceDeleteConfirm({ resultsCount });
      } else {
        handleMutationError(error);
      }
    },
  });

  const publishMutation = trpc.simulations.publish.useMutation({
    onSuccess: () => {
      showSuccess('Pubblicata', 'Simulazione pubblicata con successo');
      utils.simulations.getSimulation.invalidate({ id });
    },
    onError: handleMutationError,
  });

  const archiveMutation = trpc.simulations.archive.useMutation({
    onSuccess: () => {
      showSuccess('Archiviata', 'Simulazione archiviata con successo');
      utils.simulations.getSimulation.invalidate({ id });
      setArchiveConfirm(false);
    },
    onError: handleMutationError,
  });

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes === 0) return 'Illimitato';
    if (minutes < 60) return `${minutes} minuti`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} ore`;
  };

  // Print handler - opens print dialog directly
  const handlePrint = () => {
    if (!simulation) return;
    
    // Calculate academic year (current year → next year)
    const currentYear = new Date().getFullYear();
    const academicYearText = `Anno accademico ${currentYear}/${currentYear + 1}`;
    
    // Check if simulation has sections
    const hasSections = simulation.hasSections;
    const showSectionsInPaper = simulation.showSectionsInPaper !== false;
    const sections = simulation.sections as Array<{
      id: string;
      name: string;
      durationMinutes: number;
      questionIds?: string[];
      subjectId?: string | null;
      order: number;
    }> | null;
    
    // Type for simulation question
    type SimQuestion = typeof simulation.questions[0];

    const escapeHtmlAttribute = (value: string) => value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

    // Render inline \includegraphics images into the print HTML (instead of stripping them),
    // so images placed inside the text appear in the printed/PDF simulation too.
    const removeLatexImageReferences = (text: string) => renderLatexImagesForPrint(text);

    const toPrintableImageSrc = (imageUrl?: string | null): string =>
      normalizeImageSrc(imageUrl) ?? '';

    const renderImage = (imageUrl?: string | null, className = 'question-image') => {
      const imageSrc = toPrintableImageSrc(imageUrl);
      if (!imageSrc) return '';

      return `<div class="${className}"><img src="${escapeHtmlAttribute(imageSrc)}" alt="Immagine" loading="eager" decoding="sync"></div>`;
    };
    
    // Helper to render questions grouped by type
    const renderQuestionsByType = (
      questionsToRender: SimQuestion[],
      startNumber: number,
      showTypeHeaders: boolean = true
    ): { html: string; nextNumber: number } => {
      let html = '';
      let questionNumber = startNumber;
      
      // Group by type
      const choiceQuestions = questionsToRender.filter(sq => sq.question.type !== 'OPEN_TEXT');
      const openText = questionsToRender.filter(sq => sq.question.type === 'OPEN_TEXT');
      
      // Render choice questions
      if (choiceQuestions.length > 0) {
        if (showTypeHeaders) html += `<div class="question-type-header">DOMANDE A RISPOSTA MULTIPLA</div>`;
        for (const sq of choiceQuestions) {
          const imageHtml = renderImage(sq.question.imageUrl);
          const answersHtml = sq.question.answers 
            ? `<div class="answers">
                ${[...sq.question.answers]
                  .sort((firstAnswer, secondAnswer) => (firstAnswer.order ?? 0) - (secondAnswer.order ?? 0))
                  .map((answer, ansIndex) => `
                    <div class="answer"><span class="answer-letter">${String.fromCharCode(65 + ansIndex)})</span><div class="answer-content">${removeLatexImageReferences(answer.text)}${renderImage(answer.imageUrl, 'answer-image')}</div></div>
                  `).join('')}
              </div>`
            : '';
          html += `
            <div class="question">
              <div class="question-text"><strong>${questionNumber}.</strong> ${removeLatexImageReferences(sq.question.text)}</div>
              ${imageHtml}
              ${answersHtml}
            </div>
          `;
          questionNumber++;
        }
      }
      
      // Render OPEN_TEXT
      if (openText.length > 0) {
        if (showTypeHeaders) html += `<div class="question-type-header">DOMANDE A RISPOSTA CON MODALITÀ A COMPLETAMENTO</div>`;
        for (const sq of openText) {
          const imageHtml = renderImage(sq.question.imageUrl);
          html += `
            <div class="question">
              <div class="question-text"><strong>${questionNumber}.</strong> ${removeLatexImageReferences(sq.question.text)}</div>
              ${imageHtml}
              <div class="open-answer-space"></div>
            </div>
          `;
          questionNumber++;
        }
      }
      
      return { html, nextNumber: questionNumber };
    };
    
    // Generate questions HTML - with or without sections
    let questionsHtml = '';

    // Determine globally if multiple question types exist
    const hasMultipleTypes =
      simulation.questions.some(sq => sq.question.type !== 'OPEN_TEXT') &&
      simulation.questions.some(sq => sq.question.type === 'OPEN_TEXT');

    if (hasSections && showSectionsInPaper && sections && sections.length > 0) {
      // Group questions by section, then by type within each section
      const sortedSections = [...sections].sort((a, b) => a.order - b.order);

      // Count sections that actually have questions
      const sectionsWithQuestions = sortedSections.filter(section =>
        (section.questionIds || []).some(id => simulation.questions.some(sq => sq.question.id === id))
      );
      const showSectionHeaders = sectionsWithQuestions.length > 1;

      let globalQuestionNumber = 1;
      
      for (const section of sortedSections) {
        const sectionQuestionIds = section.questionIds || [];
        const sectionQuestions = sectionQuestionIds
          .map(id => simulation.questions.find(sq => sq.question.id === id))
          .filter((sq): sq is SimQuestion => sq !== undefined);

        if (sectionQuestions.length === 0) continue;

        if (showSectionHeaders) questionsHtml += `<div class="section-header">${section.name}</div>`;
        const result = renderQuestionsByType(sectionQuestions, globalQuestionNumber, hasMultipleTypes);
        questionsHtml += result.html;
        globalQuestionNumber = result.nextNumber;
      }

      // Questions not assigned to any section would otherwise be dropped from the print.
      const assignedIds = new Set(sortedSections.flatMap(section => section.questionIds || []));
      const unassignedQuestions = simulation.questions.filter(sq => !assignedIds.has(sq.question.id));
      if (unassignedQuestions.length > 0) {
        if (showSectionHeaders) questionsHtml += `<div class="section-header">Senza sezione</div>`;
        // Last group rendered: nextNumber isn't needed afterwards, so we don't reassign.
        const result = renderQuestionsByType(unassignedQuestions, globalQuestionNumber, hasMultipleTypes);
        questionsHtml += result.html;
      }
    } else {
      // No sections - just group by type
      const result = renderQuestionsByType(simulation.questions, 1, hasMultipleTypes);
      questionsHtml = result.html;
    }
    
    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${simulation.title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    /* Page margins and page number footer */
    @page { 
      size: A4; 
      margin: 10mm 15mm 20mm 15mm;

      @bottom-center {
        content: counter(page);
        font-family: 'Times New Roman', Times, serif;
        font-size: 10pt;
      }
    }
    
    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important;
      }
      
      /* Hide the instruction message when printing */
      .print-instruction { display: none !important; }
    }
    
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      font-size: 11pt; 
      line-height: 1.4; 
      color: #000;
      background: #fff;
      padding: 0;
      margin: 0;
      position: relative;
    }
    
    /* Instruction for user - hidden when printing */
    .print-instruction {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 10px 15px;
      margin-bottom: 15px;
      border-radius: 5px;
      font-size: 12px;
      color: #856404;
    }
    
    /* Page header - centered logo (first page only) */
    .page-header {
      text-align: center;
      margin-bottom: 15px;
    }
    .page-header-logo {
      width: 100px;
      height: auto;
      display: inline-block;
    }
    
    /* Watermark background logo */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.06;
      z-index: 0;
      width: 50%;
      max-width: 350px;
      pointer-events: none;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .container { 
      max-width: 100%; 
      padding: 0; 
      position: relative; 
      z-index: 1;
      margin-top: 0;
      margin-bottom: 25px;
    }
    
    /* Description (centered, bold, underlined) */
    .description {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      text-align: center;
      text-decoration: underline;
      font-weight: bold;
      margin: 5px 0;
    }
    
    /* Academic year */
    .academic-year {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 10px;
    }
    
    /* Section header (e.g., Fisica e Matematica) */
    .section-header {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      font-weight: bold;
      text-align: center;
      text-decoration: underline;
      margin: 25px 0 10px 0;
    }
    
    /* Question type header (e.g., DOMANDE A RISPOSTA MULTIPLA) */
    .question-type-header {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      font-weight: bold;
      text-align: center;
      text-decoration: underline;
      margin: 15px 0 12px 0;
      text-transform: uppercase;
    }
    
    /* Questions */
    .question { 
      margin-bottom: 14px; 
    }
    
    /* Open answer space for OPEN_TEXT questions */
    .open-answer-space {
      display: none;
    }
    .question-text { 
      margin-bottom: 4px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      font-weight: bold;
    }
    .question-text strong {
      font-weight: bold;
    }
    .question-image {
      margin: 6px 0;
      text-align: center;
    }
    .question-image img,
    .answer-image img {
      max-width: 300px;
      max-height: 200px;
      height: auto;
    }
    .answer-image {
      margin: 4px 0 4px 25px;
    }
    .answers { 
      margin-left: 25px; 
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .answer { 
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin: 0; 
      font-size: 11pt;
      line-height: 1.55;
    }
    .answer-letter {
      display: inline-block;
      flex: 0 0 28px;
      width: 28px;
      font-family: Arial, Helvetica, sans-serif !important;
      font-size: 11pt !important;
      font-style: normal !important;
      font-synthesis: none !important;
      font-variation-settings: 'wght' 400 !important;
      font-weight: 400 !important;
      line-height: 1.55 !important;
    }
    .answer-content {
      flex: 1 1 auto;
      min-width: 0;
    }
    .answer-content p {
      margin: 0;
    }
    
    /* Subscript and superscript */
    sub { font-size: 0.92em; vertical-align: sub; }
    sup { font-size: 0.92em; vertical-align: super; }
    
    /* KaTeX */
    .katex { font-size: 1.2em !important; line-height: 1.18 !important; }
    .katex-display { margin: 9px 0; }
    
    /* End of questions */
    .end-of-questions {
      text-align: center;
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      margin-top: 30px;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <!-- Instruction message - hidden when printing -->
  <div class="print-instruction">
    I numeri di pagina vengono inseriti automaticamente in basso al centro nel PDF.
  </div>

  <!-- Header - centered logo (first page only) -->
  <div class="page-header">
    <img src="/images/Logo_testata_doc.png" alt="" class="page-header-logo">
  </div>
  
  <!-- Watermark logo -->
  <img src="/images/logo.png" alt="" class="watermark">
  
  <div class="container">
    <!-- Description -->
    ${simulation.description ? `<div class="description">${simulation.description}</div>` : ''}
    
    <div class="academic-year">${academicYearText}</div>
    
    ${questionsHtml}
    <div class="end-of-questions">********** FINE DELLE DOMANDE **********</div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"><\/script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\\\[', right: '\\\\]', display: true},
          {left: '\\\\(', right: '\\\\)', display: false}
        ],
        throwOnError: false
      });
      const imageLoaders = Array.from(document.images).map(function(image) {
        if (image.complete) {
          if (image.naturalWidth === 0) {
            const imageWrapper = image.closest('.question-image, .answer-image');
            if (imageWrapper) imageWrapper.remove();
          }
          return Promise.resolve();
        }

        return new Promise(function(resolve) {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', function() {
            const imageWrapper = image.closest('.question-image, .answer-image');
            if (imageWrapper) imageWrapper.remove();
            resolve(undefined);
          }, { once: true });
        });
      });
      const imageTimeout = new Promise(function(resolve) {
        setTimeout(resolve, 3000);
      });

      Promise.race([Promise.all(imageLoaders), imageTimeout]).then(function() {
        setTimeout(function() { window.print(); }, 100);
      });
    });
  <\/script>
</body>
</html>
      `);
      printWindow.document.close();
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!simulation) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className={`text-center py-12 ${colors.background.card} rounded-xl`}>
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className={colors.text.muted}>Simulazione non trovata</p>
          <Link
            href="/simulazioni"
            className={`inline-flex items-center gap-2 mt-4 ${colors.primary.text}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alle simulazioni
          </Link>
        </div>
      </div>
    );
  }

  type DetailQuestion = typeof simulation.questions[number];
  const detailSections = parseDetailSections(simulation.sections);
  const shouldGroupQuestions = simulation.hasSections && detailSections.length > 0;
  const questionEntries = simulation.questions.map((question, index) => ({ question, index }));
  const questionsById = new Map<string, { question: DetailQuestion; index: number }>(
    questionEntries.map((entry) => [entry.question.questionId, entry])
  );
  // Display each section's questions in their actual simulation order (the `order` field,
  // reflected by `entry.index`), not the raw `questionIds` membership order — otherwise the
  // progressive number badges look scrambled/non-sequential after questions are reordered or deleted.
  const sectionGroups = detailSections.map((section) => ({
    section,
    entries: section.questionIds
      .map((questionId) => questionsById.get(questionId))
      .filter((entry): entry is { question: DetailQuestion; index: number } => Boolean(entry))
      .sort((a, b) => a.index - b.index),
  }));
  const groupedQuestionIds = new Set(
    sectionGroups.flatMap((group) => group.entries.map((entry) => entry.question.questionId))
  );
  const ungroupedEntries = shouldGroupQuestions
    ? questionEntries.filter((entry) => !groupedQuestionIds.has(entry.question.questionId))
    : [];

  const renderQuestionRow = ({ question: sq, index }: { question: DetailQuestion; index: number }) => {
    const isExpanded = expandedPreviews.has(sq.questionId);
    const isChoiceType = sq.question.type === 'SINGLE_CHOICE' || sq.question.type === 'MULTIPLE_CHOICE';
    const correctAnswers = isChoiceType ? sq.question.answers.filter((a) => a.isCorrect) : [];
    const hasPreview = isChoiceType ? correctAnswers.length > 0 : sq.question.keywords.length > 0;

    return (
      <div
        key={sq.id}
        className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${colors.border.light} last:border-b-0 ${colors.background.hover}`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <span className={`w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs sm:text-sm font-medium ${colors.text.primary}`}>
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <RichTextRenderer
              text={sq.question.text}
              className={`text-sm ${colors.text.primary} line-clamp-2 leading-relaxed`}
            />
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
              {sq.question.subject && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                  style={{ backgroundColor: sq.question.subject.color + '20', color: sq.question.subject.color }}
                >
                  {sq.question.subject.name}
                </span>
              )}
              {sq.question.topic && (
                <span className={`text-xs ${colors.text.muted} truncate`}>{sq.question.topic.name}</span>
              )}
            </div>
            {/* Answer/keyword preview */}
            {isExpanded && hasPreview && (
              <div className={`mt-2 p-2 rounded-lg ${
                isChoiceType
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : `${colors.background.secondary} border ${colors.border.light}`
              }`}>
                {isChoiceType ? (
                  <>
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                      {sq.question.type === 'MULTIPLE_CHOICE' ? 'Risposte corrette:' : 'Risposta corretta:'}
                    </p>
                    <div className="space-y-0.5">
                      {correctAnswers.map((a) => (
                        <RichTextRenderer key={a.id} text={a.text} className="text-xs text-green-700 dark:text-green-300" />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className={`text-xs font-medium ${colors.text.muted} mb-1`}>Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {sq.question.keywords.map((kw, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${colors.background.tertiary} ${colors.text.tertiary}`}>
                          {kw.keyword}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {hasPreview && (
            <button
              onClick={() => togglePreview(sq.questionId)}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 mt-0.5 ${
                isExpanded
                  ? `${colors.primary.bg} text-white`
                  : `${colors.background.secondary} ${colors.text.muted} hover:${colors.text.secondary}`
              }`}
              title={isExpanded ? 'Nascondi risposta' : 'Mostra risposta'}
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/simulazioni"
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Torna alle simulazioni</span>
          <span className="sm:hidden">Indietro</span>
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              {simulation.isOfficial && (
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                  <Award className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className={`text-xl sm:text-2xl font-bold ${colors.text.primary} break-words`}>{simulation.title}</h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[simulation.status as SimulationStatus]}`}>
                    {statusLabels[simulation.status as SimulationStatus]}
                  </span>
                  <span className={`text-xs sm:text-sm ${colors.text.muted}`}>
                    {typeLabels[simulation.type as SimulationType]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
            {simulation.status === 'DRAFT' && (
              <button
                onClick={() => publishMutation.mutate({ id })}
                disabled={publishMutation.isPending}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50`}
              >
                {publishMutation.isPending ? <Spinner size="sm" variant="white" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Pubblica</span>
              </button>
            )}
            <Link
              href={`/simulazioni/${id}/modifica`}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border ${colors.border.light} ${colors.text.secondary} ${colors.background.hover}`}
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Modifica</span>
            </Link>
            {/* Show statistics only if there are results */}
            {simulation.results.filter(r => r.completedAt !== null).length > 0 && (
              <Link
                href={`/simulazioni/${id}/statistiche`}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-sm`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden lg:inline">Statistiche</span>
              </Link>
            )}
            <button
              onClick={handlePrint}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
              title="Stampa simulazione"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden xl:inline">Stampa</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setArchiveConfirm(true)}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20`}
              >
                <Archive className="w-4 h-4" />
                <span className="hidden xl:inline">Archivia</span>
              </button>
            )}
            <button
              onClick={() => setDeleteConfirm(true)}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden xl:inline">Elimina</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main content - Wider on desktop */}
        <div className="xl:col-span-3 space-y-6">
          {/* Description */}
          {simulation.description && (
            <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary} mb-3`}>Descrizione</h2>
              <p className={colors.text.secondary}>{simulation.description}</p>
            </div>
          )}

          {/* Questions */}
          <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
            <div className={`px-4 sm:px-6 py-4 border-b ${colors.border.light} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                Domande ({simulation.questions.length})
              </h2>
              <Link
                href={`/simulazioni/${id}/domande`}
                className={`text-sm ${colors.primary.text} hover:underline self-start sm:self-auto`}
              >
                Modifica domande
              </Link>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              {shouldGroupQuestions ? (
                <div>
                  {sectionGroups.map(({ section, entries }) => (
                    <div key={section.id}>
                      <div className={`sticky top-0 z-10 px-4 sm:px-6 py-3 ${colors.background.secondary} border-b ${colors.border.light}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-1.5 h-8 rounded-full ${colors.primary.bg} flex-shrink-0`} />
                            <div className="min-w-0">
                              <h3 className={`font-semibold ${colors.text.primary} truncate`}>{section.name}</h3>
                              <p className={`text-xs ${colors.text.muted}`}>
                                {entries.length} {entries.length === 1 ? 'domanda' : 'domande'}
                              </p>
                            </div>
                          </div>
                          {section.durationMinutes > 0 && (
                            <span className={`text-xs px-2 py-1 rounded-full ${colors.background.card} ${colors.text.muted} border ${colors.border.light} whitespace-nowrap`}>
                              {section.durationMinutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      {entries.length > 0 ? (
                        entries.map(renderQuestionRow)
                      ) : (
                        <div className={`px-4 sm:px-6 py-4 border-b ${colors.border.light}`}>
                          <p className={`text-sm ${colors.text.muted}`}>Nessuna domanda in questa sezione</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {ungroupedEntries.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-8 rounded-full bg-amber-500 flex-shrink-0" />
                          <div>
                            <h3 className="font-semibold text-amber-700 dark:text-amber-300">Senza sezione</h3>
                            <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                              {ungroupedEntries.length} {ungroupedEntries.length === 1 ? 'domanda' : 'domande'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {ungroupedEntries.map(renderQuestionRow)}
                    </div>
                  )}
                </div>
              ) : (
                simulation.questions.map((question, index) => renderQuestionRow({ question, index }))
              )}
            </div>
          </div>

          {/* Results preview - only show if there are completed results */}
          {simulation.results.filter(r => r.completedAt !== null).length > 0 && (
            <div className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${colors.border.light} flex items-center justify-between`}>
                <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                  Ultimi risultati ({simulation.results.filter(r => r.completedAt !== null).length})
                </h2>
                <Link
                  href={`/simulazioni/${id}/statistiche`}
                  className={`text-sm ${colors.primary.text} hover:underline`}
                >
                  Vedi tutti
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={colors.background.secondary}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase`}>Studente</th>
                      <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Punteggio</th>
                      <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase`}>Risposte</th>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase`}>Data</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${colors.border.light}`}>
                    {simulation.results.filter(r => r.completedAt !== null).slice(0, 10).map((result) => (
                      <tr key={result.id} className={colors.background.hover}>
                        <td className={`px-4 py-3 ${colors.text.primary}`}>
                          {result.student?.user?.name || 'Studente'}
                        </td>
                        <td className={`px-4 py-3 text-center font-medium ${colors.text.primary}`}>
                          {result.totalScore?.toFixed(1) ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <span className="text-green-600">{result.correctAnswers ?? 0}</span>
                            <span className={colors.text.muted}>/</span>
                            <span className="text-red-600">{result.wrongAnswers ?? 0}</span>
                            <span className={colors.text.muted}>/</span>
                            <span className="text-gray-500">{result.blankAnswers ?? 0}</span>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm ${colors.text.muted}`}>
                          {result.completedAt ? formatDate(result.completedAt) : 'In corso'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Statistiche</h2>
            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className={`flex items-center gap-2 ${colors.text.muted}`}>
                  <Target className="w-4 h-4" />
                  Domande
                </dt>
                <dd className={`font-semibold ${colors.text.primary}`}>{simulation.totalQuestions}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={`flex items-center gap-2 ${colors.text.muted}`}>
                  <Clock className="w-4 h-4" />
                  Durata
                </dt>
                <dd className={`font-semibold ${colors.text.primary}`}>{formatDuration(simulation.durationMinutes)}</dd>
              </div>
            </dl>
          </div>

          {/* Source Template */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Template</h2>
            {simulation.sourceTemplate ? (
              <div className="space-y-3">
                <div>
                  <p className={`font-medium ${colors.text.primary}`}>{simulation.sourceTemplate.title}</p>
                  <p className={`text-sm ${colors.text.muted}`}>
                    {simulation.sourceTemplate.totalQuestions} domande • {formatDuration(simulation.sourceTemplate.durationMinutes)}
                  </p>
                </div>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[simulation.sourceTemplate.status as SimulationStatus] || statusColors.DRAFT}`}>
                  {statusLabels[simulation.sourceTemplate.status as SimulationStatus] || simulation.sourceTemplate.status}
                </span>
              </div>
            ) : (
              <p className={`text-sm ${colors.text.muted}`}>Nessun template associato</p>
            )}
          </div>

          {/* Configuration */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Configurazione</h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Mostra risultati</dt>
                <dd>{simulation.showResults ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-400" />}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Mostra risposte</dt>
                <dd>{simulation.showCorrectAnswers ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-400" />}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Ripetibile</dt>
                <dd>{simulation.isRepeatable ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-400" />}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Ordine casuale</dt>
                <dd>{simulation.randomizeOrder ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-400" />}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Sistema anticheat</dt>
                <dd>
                  {simulation.enableAntiCheat ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Scoring */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Punteggi</h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Corretta</dt>
                <dd className="font-medium text-green-600">+{simulation.correctPoints}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Errata</dt>
                <dd className="font-medium text-red-600">{simulation.wrongPoints}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={colors.text.muted}>Non data</dt>
                <dd className={`font-medium ${colors.text.primary}`}>{simulation.blankPoints}</dd>
              </div>
              {simulation.passingScore && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <dt className={colors.text.muted}>Soglia superamento</dt>
                  <dd className={`font-medium ${colors.text.primary}`}>{simulation.passingScore}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Dates */}
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>Date</h2>
            <dl className="space-y-3">
              <div>
                <dt className={`text-xs ${colors.text.muted} uppercase`}>Creata il</dt>
                <dd className={`font-medium ${colors.text.primary}`}>{formatDate(simulation.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Assignments */}
          {simulation.assignments.length > 0 && (
            <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>
                Assegnazioni ({simulation.assignments.length})
              </h2>
              {/* Group assignments by type */}
              {(() => {
                const groupAssignments = simulation.assignments.filter(a => a.group);
                const studentAssignments = simulation.assignments.filter(a => a.student);

                return (
                  <div className="space-y-4">
                    {/* Students */}
                    {studentAssignments.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-medium ${colors.text.muted} uppercase mb-2 flex items-center gap-1.5`}>
                          <User className="w-3.5 h-3.5" />
                          Studenti ({studentAssignments.length})
                        </h4>
                        <div className="space-y-2">
                          {studentAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className={`p-3 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}
                            >
                              <p className={`text-sm font-medium ${colors.text.primary}`}>
                                {assignment.student?.user?.name || assignment.student?.user?.email || 'Studente'}
                              </p>
                              {assignment.student?.user?.email && (
                                <p className={`text-xs ${colors.text.muted}`}>{assignment.student.user.email}</p>
                              )}
                              <div className={`mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs ${colors.text.muted}`}>
                                {assignment.assignedBy?.name && <span>Assegnata da {assignment.assignedBy.name}</span>}
                                {assignment.dueDate && <span>Scadenza {formatDate(assignment.dueDate)}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Groups */}
                    {groupAssignments.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-medium ${colors.text.muted} uppercase mb-2 flex items-center gap-1.5`}>
                          <Users className="w-3.5 h-3.5" />
                          Gruppi ({groupAssignments.length})
                        </h4>
                        <div className="space-y-2">
                          {groupAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className={`p-3 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}
                            >
                              <span
                                className={['inline-flex px-2 py-1 rounded-full text-xs font-medium', assignment.group?.color ? '' : `${colors.background.tertiary} ${colors.text.secondary}`].join(' ')}
                                style={assignment.group?.color ? {
                                  backgroundColor: `${assignment.group.color}20`,
                                  color: assignment.group.color,
                                } : undefined}
                              >
                                {assignment.group?.name || 'Gruppo'}
                              </span>
                              <div className={`mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs ${colors.text.muted}`}>
                                {assignment.assignedBy?.name && <span>Assegnata da {assignment.assignedBy.name}</span>}
                                {assignment.dueDate && <span>Scadenza {formatDate(assignment.dueDate)}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Elimina Simulazione"
          message={`Sei sicuro di voler eliminare "${simulation.title}"? Questa azione non può essere annullata.`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id })}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}

      {/* Force Delete Confirmation Modal - shown when simulation has results */}
      {forceDeleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="⚠️ Eliminazione Forzata"
          message={`ATTENZIONE: Stai per eliminare definitivamente "${simulation.title}".\n\n🗑️ Verranno eliminati:\n• ${forceDeleteConfirm.resultsCount} risultati degli studenti\n• Tutte le statistiche e analisi\n• Tutte le assegnazioni e sessioni\n• Gli eventi calendario correlati\n\n❌ Questa operazione è IRREVERSIBILE.\n\nSei assolutamente sicuro di voler procedere?`}
          confirmText="Elimina Definitivamente"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id, force: true })}
          onCancel={() => setForceDeleteConfirm(null)}
        />
      )}

      {/* Archive Confirmation Modal */}
      {archiveConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Archivia Simulazione"
          message={`Sei sicuro di voler archiviare "${simulation.title}"? La simulazione non sarà più accessibile agli studenti.`}
          confirmText="Archivia"
          cancelText="Annulla"
          variant="warning"
          isLoading={archiveMutation.isPending}
          onConfirm={() => archiveMutation.mutate({ id })}
          onCancel={() => setArchiveConfirm(false)}
        />
      )}
    </div>
  );
}
