'use client';

import { use, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { PageLoader } from '@/components/ui/loaders';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { colors } from '@/lib/theme/colors';

// Import KaTeX CSS for print
import 'katex/dist/katex.min.css';

interface PrintPageProps {
  readonly params: Promise<{ id: string }>;
}

export default function SimulationPrintPage({ params }: PrintPageProps) {
  const { id } = use(params);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: simulation, isLoading } = trpc.simulations.getSimulation.useQuery(
    { id },
    { enabled: !!id }
  );

  // Handle print
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      globalThis.print();
      setIsPrinting(false);
    }, 100);
  };

  // Keyboard shortcut for print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!simulation) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Simulazione non trovata</p>
      </div>
    );
  }

  const questions = simulation?.questions || [];
  
  // Calculate academic year (starts in September)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const academicYearStart = currentMonth >= 8 ? currentYear : currentYear - 1;
  const academicYearEnd = academicYearStart + 1;
  const academicYearText = `Anno accademico ${academicYearStart}/${academicYearEnd}`;

  return (
    <>
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href={`/simulazioni/${id}`}
            className={`flex items-center gap-2 ${colors.text.secondary} hover:${colors.text.primary}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla simulazione
          </Link>
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              Usa Ctrl+P o il pulsante per stampare/salvare come PDF
            </p>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 disabled:opacity-50`}
            >
              {isPrinting ? (
                <Download className="w-4 h-4 animate-bounce" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              Stampa / Salva PDF
            </button>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div className="print-content pt-20 print:pt-0">
        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 25mm 25mm 20mm 25mm;
            }
            
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Hide print controls and navigation */
            .print\\:hidden,
            header,
            nav {
              display: none !important;
            }
            
            .print-content {
              padding: 0 !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
            }
            
            .no-break {
              page-break-inside: avoid;
            }
            
            /* Fixed header with logo on every page */
            .print-header-logo {
              position: fixed;
              top: 0;
              left: 0;
              width: 40px;
              height: auto;
              z-index: 1000;
            }
            
            .print-header-title {
              position: fixed;
              top: 5px;
              left: 50%;
              transform: translateX(-50%);
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              font-weight: bold;
              z-index: 1000;
              text-align: center;
            }
            
            /* Watermark on every page */
            .watermark {
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              opacity: 0.06 !important;
              z-index: -1 !important;
              width: 60% !important;
              max-width: 400px !important;
              pointer-events: none !important;
            }
            
            /* Content starts below fixed header */
            .print-body {
              margin-top: 30px;
            }
          }
          
          /* Screen preview styles */
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.06;
            z-index: -1;
            width: 60%;
            max-width: 400px;
            pointer-events: none;
          }
          
          /* KaTeX styling */
          .katex {
            font-size: 1em !important;
          }
          
          .katex-display {
            margin: 0.5em 0 !important;
            overflow-x: visible !important;
          }
        `}</style>

        {/* Fixed header elements - appear on every page */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/images/Emblem_of_Italy_(black_and_white).svg" 
          alt="Emblema Italia" 
          className="print-header-logo fixed top-0 left-8 w-10 h-auto z-50 print:left-0"
        />
        <div className="print-header-title fixed top-1 left-1/2 -translate-x-1/2 font-['Times_New_Roman',Times,serif] text-sm font-bold z-50">
          {simulation.title}
        </div>

        {/* Watermark logo - appears on every page */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/images/logo.png" 
          alt="" 
          className="watermark"
        />

        <div className="max-w-4xl mx-auto px-8 py-6 bg-white text-black print:px-0 print:py-0 font-['Arial',Helvetica,sans-serif]">
          {/* Space for fixed header */}
          <div className="h-12 print:h-6"></div>
          
          {/* Description (centered, bold, underlined) */}
          {simulation.description && (
            <div className="text-center font-['Times_New_Roman',Times,serif] text-base font-bold underline mb-2">
              {simulation.description}
            </div>
          )}
          
          {/* Academic year */}
          <div className="text-center font-['Times_New_Roman',Times,serif] text-sm mb-6">
            {academicYearText}
          </div>
          
          {/* Questions title - only once at the beginning */}
          <div className="text-center font-['Times_New_Roman',Times,serif] text-sm font-bold uppercase underline mb-5">
            DOMANDE A RISPOSTA MULTIPLA
          </div>

          {/* All questions without section headers */}
          <div className="space-y-1.5 print-body">
            {questions.map((sq, index) => (
              <div key={sq.id} className="no-break">
                {/* Question */}
                <div className="mb-1">
                  <span className="font-bold">{index + 1}. </span>
                  <span className="font-bold">
                    <RichTextRenderer text={sq.question.text} className="inline" />
                  </span>
                </div>

                {/* Image if present */}
                {sq.question.imageUrl && (
                  <div className="my-2 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sq.question.imageUrl}
                      alt={`Immagine domanda ${index + 1}`}
                      className="max-w-md max-h-48 mx-auto"
                    />
                  </div>
                )}

                {/* Answers */}
                {sq.question.type !== 'OPEN_TEXT' && sq.question.answers && (
                  <div className="ml-8 space-y-0.5">
                    {[...sq.question.answers]
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((answer, ansIndex) => (
                        <div key={answer.id} className="flex items-start gap-2">
                          <span className="font-bold w-5">
                            {String.fromCodePoint(65 + ansIndex)})
                          </span>
                          <div className="flex-1">
                            <RichTextRenderer text={answer.text} />
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Open text placeholder */}
                {sq.question.type === 'OPEN_TEXT' && (
                  <div className="ml-8 mt-2">
                    <div className="border border-gray-300 rounded p-4 min-h-[100px]">
                      <p className="text-gray-400 text-sm italic">Spazio per la risposta</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
