'use client';

import { colors } from '@/lib/theme/colors';
import { Award, Layers, Target, Clock, Shield, Maximize, Play } from 'lucide-react';
import type { PreviewSection } from '@/lib/hooks/useSimulationPreview';

interface PreviewStartScreenProps {
  title: string;
  description?: string;
  isOfficial: boolean;
  hasSections: boolean;
  effectiveSections: PreviewSection[];
  durationMinutes: number;
  totalQuestions: number;
  correctPoints: number;
  wrongPoints: number;
  blankPoints: number;
  enableAntiCheat: boolean;
  forceFullscreen: boolean;
}

export default function PreviewStartScreen({
  title,
  description,
  isOfficial,
  hasSections,
  effectiveSections,
  durationMinutes,
  totalQuestions,
  correctPoints,
  wrongPoints,
  blankPoints,
  enableAntiCheat,
  forceFullscreen,
}: PreviewStartScreenProps) {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-xl p-8 ${colors.background.card} border ${colors.border.light} text-center`}>
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {isOfficial && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium">
                <Award className="w-4 h-4" />
                Simulazione Ufficiale
              </div>
            )}
            {hasSections && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <Layers className="w-4 h-4" />
                {effectiveSections.length} Sezioni
              </div>
            )}
          </div>

          <h1 className={`text-2xl font-bold ${colors.text.primary} mb-2`}>{title || 'Titolo Simulazione'}</h1>
          {description && (
            <p className={`${colors.text.secondary} mb-6`}>{description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
              <Target className="w-6 h-6 mx-auto text-gray-500 mb-2" />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{totalQuestions}</p>
              <p className={`text-sm ${colors.text.muted}`}>Domande</p>
            </div>
            <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
              <Clock className="w-6 h-6 mx-auto text-gray-500 mb-2" />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>
                {durationMinutes > 0 ? `${durationMinutes} min` : '∞'}
              </p>
              <p className={`text-sm ${colors.text.muted}`}>Tempo</p>
            </div>
          </div>

          <div className={`mb-8 text-left p-4 rounded-lg ${colors.background.secondary}`}>
            <h3 className={`font-medium ${colors.text.primary} mb-3`}>Punteggio:</h3>
            <ul className={`space-y-1 text-sm ${colors.text.secondary}`}>
              <li>✓ Risposta corretta: <span className="font-medium text-green-600">+{correctPoints}</span></li>
              <li>✗ Risposta errata: <span className="font-medium text-red-600">{wrongPoints}</span></li>
              <li>○ Non risposta: <span className="font-medium">{blankPoints}</span></li>
            </ul>
          </div>

          {hasSections && effectiveSections.length > 0 && (
            <div className={`mb-6 text-left p-4 rounded-lg ${colors.background.secondary}`}>
              <h3 className={`font-medium ${colors.text.primary} mb-3 flex items-center gap-2`}>
                <Layers className="w-4 h-4" />
                Sezioni:
              </h3>
              <div className="space-y-2">
                {effectiveSections.map((section, idx) => (
                  <div key={section.id} className={`flex items-center justify-between text-sm p-2 rounded ${colors.background.card} border ${colors.border.light}`}>
                    <span className={colors.text.primary}>{idx + 1}. {section.name}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={colors.text.muted}>{section.questionIds.length} domande</span>
                      <span className={colors.text.muted}>{section.durationMinutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {enableAntiCheat && (
            <div className="mb-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-left">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-1">
                    Protezione Anti-Cheat Attiva
                  </h4>
                  <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
                    <li>• Cambio finestra/tab del browser</li>
                    <li>• Apertura strumenti sviluppatore</li>
                    <li>• Tentativi di copia/incolla</li>
                    {forceFullscreen && <li>• Uscita dalla modalità schermo intero</li>}
                  </ul>
                  {forceFullscreen && (
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mt-3 flex items-center gap-2">
                      <Maximize className="w-4 h-4" />
                      Sarà richiesta la modalità schermo intero
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            disabled
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white ${colors.primary.bg} opacity-75 cursor-not-allowed text-lg font-medium`}
          >
            <Play className="w-5 h-5" />
            Inizia Simulazione
          </button>
          <p className={`text-xs mt-2 ${colors.text.muted}`}>
            (Questa è un&apos;anteprima - il pulsante non è attivo)
          </p>
        </div>
      </div>
    </div>
  );
}
