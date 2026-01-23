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
  const date = new Date().toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const academicYear = `Anno Accademico ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

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
              margin: 15mm 20mm;
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
            
            .page-break {
              page-break-before: always;
            }
            
            .no-break {
              page-break-inside: avoid;
            }
          }
          
          /* KaTeX styling */
          .katex {
            font-size: 1.1em !important;
          }
          
          .katex-display {
            margin: 0.5em 0 !important;
            overflow-x: visible !important;
          }
          
          /* Preserve KaTeX inline structure */
          .katex-html {
            white-space: nowrap !important;
          }
          
          .katex .base {
            display: inline-block !important;
          }
          
          .katex .strut {
            display: inline-block !important;
          }
          
          .katex .mord,
          .katex .mbin,
          .katex .mrel,
          .katex .mopen,
          .katex .mclose,
          .katex .mpunct,
          .katex .minner {
            display: inline !important;
          }
        `}</style>

        <div className="max-w-4xl mx-auto px-8 py-6 bg-white text-black print:px-0 print:py-0">
          {/* Header */}
          <div className="text-center mb-6 border-b-2 border-[#a8012b] pb-4">
            <h1 className="text-lg font-bold text-[#a8012b] mb-1">
              LEONARDO SCHOOL
            </h1>
            <h2 className="text-2xl font-bold uppercase mb-2">
              {simulation.title}
            </h2>
            <p className="text-sm text-gray-600">
              {academicYear} - {date}
            </p>
          </div>

          {/* Student Info Box */}
          <div className="border border-gray-400 rounded-lg p-4 mb-6 no-break">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm">
                  Cognome e Nome: <span className="border-b border-gray-400 inline-block w-64">&nbsp;</span>
                </p>
                <p className="text-sm mt-2">
                  Matricola: <span className="border-b border-gray-400 inline-block w-40">&nbsp;</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">Data: {date}</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6 no-break">
            <h3 className="font-bold text-sm mb-2">ISTRUZIONI</h3>
            <ul className="text-sm space-y-1">
              <li>• Tempo a disposizione: {simulation.durationMinutes} minuti</li>
              <li>
                • Punteggio: Risposta corretta +{simulation.correctPoints}, 
                Risposta errata {simulation.wrongPoints}, 
                Non risposta {simulation.blankPoints}
              </li>
              <li>• Numero domande: {questions.length}</li>
              {simulation.paperInstructions && (
                <li>• {simulation.paperInstructions}</li>
              )}
            </ul>
          </div>

          {/* Questions Section */}
          <div className="mb-4">
            <h3 className="text-center font-bold uppercase mb-6">
              DOMANDE A RISPOSTA MULTIPLA
            </h3>

            <div className="space-y-6">
              {questions.map((sq, index) => (
                <div key={sq.id} className="no-break">
                  {/* Question */}
                  <div className="mb-2">
                    <span className="font-bold">{index + 1}. </span>
                    <span className="font-bold">
                      <RichTextRenderer text={sq.question.text} className="inline" />
                    </span>
                  </div>

                  {/* Image if present */}
                  {sq.question.imageUrl && (
                    <div className="my-3 text-center">
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
                    <div className="ml-6 space-y-1">
                      {[...sq.question.answers]
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((answer, ansIndex) => (
                          <div key={answer.id} className="flex items-start gap-2">
                            <span className="font-medium w-6">
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
                    <div className="ml-6 mt-2">
                      <div className="border border-gray-300 rounded p-4 min-h-[100px]">
                        <p className="text-gray-400 text-sm italic">Spazio per la risposta</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Answer Grid (optional, for quick grading) */}
          <div className="page-break"></div>
          <div className="mt-8 no-break">
            <h3 className="font-bold text-center mb-4">GRIGLIA RISPOSTE</h3>
            <div className="border border-gray-400 rounded-lg p-4">
              <div className="grid grid-cols-10 gap-2 text-center text-sm">
                {questions.map((q, index) => (
                  <div key={q.id || `answer-grid-${index}`} className="border border-gray-300 rounded p-2">
                    <p className="font-bold">{index + 1}</p>
                    <div className="flex justify-center gap-1 mt-1 text-xs">
                      <span>A</span>
                      <span>B</span>
                      <span>C</span>
                      <span>D</span>
                    </div>
                    <div className="flex justify-center gap-1 mt-1">
                      <span className="w-3 h-3 border border-gray-400 rounded-sm"></span>
                      <span className="w-3 h-3 border border-gray-400 rounded-sm"></span>
                      <span className="w-3 h-3 border border-gray-400 rounded-sm"></span>
                      <span className="w-3 h-3 border border-gray-400 rounded-sm"></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>Leonardo School - {simulation.title} - {date}</p>
          </div>
        </div>
      </div>
    </>
  );
}
