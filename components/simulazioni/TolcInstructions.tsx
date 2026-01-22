'use client';

import { useState } from 'react';
import { colors } from '@/lib/theme/colors';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import {
  Clock,
  BookOpen,
  Shield,
  AlertTriangle,
  CheckCircle,
  Layers,
  Lock,
  Eye,
  MonitorOff,
  Copy,
  ArrowRight,
  Info,
  Target,
  XCircle,
  Minus,
} from 'lucide-react';

interface TolcInstructionsProps {
  simulationTitle: string;
  durationMinutes: number;
  totalQuestions: number;
  sectionsCount: number;
  onContinue: () => void;
  isLoading?: boolean;
}

/**
 * Pagina istruzioni completa per simulazioni TOLC-style
 * Mostra tutte le regole e informazioni prima di entrare nella waiting room
 */
export default function TolcInstructions({
  simulationTitle: _simulationTitle,
  durationMinutes,
  totalQuestions,
  sectionsCount,
  onContinue,
  isLoading = false,
}: TolcInstructionsProps) {
  const [hasReadAll, setHasReadAll] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const canContinue = hasReadAll && acceptedRules;

  return (
    <div className={`min-h-screen ${colors.background.primary}`}>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intro Card */}
        <div className={`${colors.background.card} rounded-2xl border ${colors.border.primary} p-6 sm:p-8 mb-6`}>
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl ${colors.status.info.bgLight} flex items-center justify-center flex-shrink-0`}>
              <Info className={`w-6 h-6 ${colors.status.info.text}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${colors.text.primary} mb-2`}>
                Benvenuto nella Simulazione Ufficiale
              </h2>
              <p className={`${colors.text.secondary}`}>
                Stai per iniziare una simulazione che replica fedelmente il test ufficiale TOLC. 
                Leggi attentamente tutte le istruzioni prima di procedere.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl ${colors.background.secondary} text-center`}>
              <Clock className={`w-6 h-6 mx-auto mb-2 ${colors.text.muted}`} />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{durationMinutes}</p>
              <p className={`text-xs ${colors.text.muted}`}>minuti totali</p>
            </div>
            <div className={`p-4 rounded-xl ${colors.background.secondary} text-center`}>
              <Target className={`w-6 h-6 mx-auto mb-2 ${colors.text.muted}`} />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{totalQuestions}</p>
              <p className={`text-xs ${colors.text.muted}`}>domande</p>
            </div>
            <div className={`p-4 rounded-xl ${colors.background.secondary} text-center`}>
              <Layers className={`w-6 h-6 mx-auto mb-2 ${colors.text.muted}`} />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{sectionsCount}</p>
              <p className={`text-xs ${colors.text.muted}`}>sezioni</p>
            </div>
            <div className={`p-4 rounded-xl ${colors.background.secondary} text-center`}>
              <Shield className={`w-6 h-6 mx-auto mb-2 ${colors.text.muted}`} />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>Sì</p>
              <p className={`text-xs ${colors.text.muted}`}>anti-cheat</p>
            </div>
          </div>
        </div>

        {/* Sections Info */}
        <div className={`${colors.background.card} rounded-2xl border ${colors.border.primary} p-6 sm:p-8 mb-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center`}>
              <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className={`text-lg font-bold ${colors.text.primary}`}>
              Struttura a Sezioni
            </h3>
          </div>

          <div className="space-y-4">
            <div className={`flex items-start gap-3 p-4 rounded-xl ${colors.status.warning.bgLight} border ${colors.status.warning.border}`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.status.warning.text}`} />
              <div>
                <p className={`font-semibold ${colors.status.warning.text}`}>Importante: Sezioni non reversibili</p>
                <p className={`text-sm ${colors.text.secondary} mt-1`}>
                  Una volta conclusa una sezione, <strong>non potrai tornare indietro</strong>. 
                  Assicurati di aver risposto a tutte le domande prima di passare alla sezione successiva.
                </p>
              </div>
            </div>

            <ul className={`space-y-3 ${colors.text.secondary}`}>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Ogni sezione ha un <strong>tempo dedicato</strong> che non può essere trasferito ad altre sezioni</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>All&apos;interno di una sezione puoi <strong>navigare liberamente</strong> tra le domande</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Puoi <strong>segnalare domande</strong> con la bandierina per rivederle prima di concludere la sezione</span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>Il tempo non utilizzato in una sezione <strong>verrà perso</strong></span>
              </li>
            </ul>
          </div>
        </div>

        {/* Scoring */}
        <div className={`${colors.background.card} rounded-2xl border ${colors.border.primary} p-6 sm:p-8 mb-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center`}>
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className={`text-lg font-bold ${colors.text.primary}`}>
              Sistema di Punteggio
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center`}>
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className={`text-2xl font-bold text-green-600 dark:text-green-400`}>+1.5</p>
              <p className={`text-sm text-green-700 dark:text-green-300`}>Risposta corretta</p>
            </div>
            <div className={`p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center`}>
              <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className={`text-2xl font-bold text-red-600 dark:text-red-400`}>-0.4</p>
              <p className={`text-sm text-red-700 dark:text-red-300`}>Risposta errata</p>
            </div>
            <div className={`p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center`}>
              <Minus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className={`text-2xl font-bold ${colors.text.muted}`}>0</p>
              <p className={`text-sm ${colors.text.muted}`}>Risposta non data</p>
            </div>
          </div>

          <p className={`mt-4 text-sm ${colors.text.muted} text-center`}>
            Il punteggio finale è calcolato automaticamente al termine della simulazione
          </p>
        </div>

        {/* Anti-cheat */}
        <div className={`${colors.background.card} rounded-2xl border ${colors.border.primary} p-6 sm:p-8 mb-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center`}>
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className={`text-lg font-bold ${colors.text.primary}`}>
              Sistema Anti-Cheat
            </h3>
          </div>

          <p className={`${colors.text.secondary} mb-4`}>
            Per garantire l&apos;integrità del test, sono attive le seguenti misure di sicurezza:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`flex items-start gap-3 p-4 rounded-xl ${colors.background.secondary}`}>
              <Eye className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.primary.text}`} />
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Monitoraggio Scheda</p>
                <p className={`text-sm ${colors.text.muted}`}>
                  Il cambio di scheda o finestra viene registrato
                </p>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-4 rounded-xl ${colors.background.secondary}`}>
              <MonitorOff className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.primary.text}`} />
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Modalità Fullscreen</p>
                <p className={`text-sm ${colors.text.muted}`}>
                  Il test richiede la visualizzazione a schermo intero
                </p>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-4 rounded-xl ${colors.background.secondary}`}>
              <Copy className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.primary.text}`} />
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Blocco Copia/Incolla</p>
                <p className={`text-sm ${colors.text.muted}`}>
                  Non è possibile copiare o incollare testo
                </p>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-4 rounded-xl ${colors.background.secondary}`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.primary.text}`} />
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Registrazione Eventi</p>
                <p className={`text-sm ${colors.text.muted}`}>
                  Tutti i comportamenti sospetti vengono registrati
                </p>
              </div>
            </div>
          </div>

          <div className={`mt-4 p-4 rounded-xl ${colors.status.error.bgLight} border ${colors.status.error.border}`}>
            <p className={`text-sm ${colors.status.error.text}`}>
              <strong>Attenzione:</strong> Comportamenti sospetti potrebbero invalidare il tuo tentativo 
              e saranno visibili al docente nel report finale.
            </p>
          </div>
        </div>

        {/* General Rules */}
        <div className={`${colors.background.card} rounded-2xl border ${colors.border.primary} p-6 sm:p-8 mb-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center`}>
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`text-lg font-bold ${colors.text.primary}`}>
              Regole Generali
            </h3>
          </div>

          <ul className={`space-y-3 ${colors.text.secondary}`}>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">1</span>
              <span>Il timer partirà <strong>contemporaneamente</strong> per tutti i partecipanti quando l&apos;esaminatore avvierà la sessione</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">2</span>
              <span><strong>Non chiudere</strong> la finestra o la scheda del browser durante il test</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">3</span>
              <span>Non è consentito l&apos;uso di <strong>materiale di supporto</strong>, calcolatrici o altri strumenti esterni</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">4</span>
              <span>Una volta <strong>inviata la simulazione</strong>, non sarà possibile ripeterla</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">5</span>
              <span>Assicurati di avere una <strong>connessione internet stabile</strong> prima di iniziare</span>
            </li>
          </ul>
        </div>

        {/* Confirmation */}
        <div className={`${colors.background.card} rounded-2xl border ${colors.border.primary} p-6 sm:p-8 mb-6`}>
          <div className="space-y-4">
            {/* Checkbox: Ho letto le istruzioni */}
            <div className={`p-4 rounded-xl transition-colors ${
              hasReadAll 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : `${colors.background.secondary} border border-transparent`
            }`}>
              <Checkbox
                checked={hasReadAll}
                onChange={(e) => setHasReadAll(e.target.checked)}
                label="Ho letto e compreso tutte le istruzioni"
                description="Confermo di aver letto attentamente tutte le regole del test"
              />
            </div>

            {/* Checkbox: Accetto le regole */}
            <div className={`p-4 rounded-xl transition-colors ${
              acceptedRules 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : `${colors.background.secondary} border border-transparent`
            }`}>
              <Checkbox
                checked={acceptedRules}
                onChange={(e) => setAcceptedRules(e.target.checked)}
                label="Accetto le regole e le misure anti-cheat"
                description="Sono consapevole che comportamenti scorretti verranno registrati"
              />
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            onClick={onContinue}
            disabled={!canContinue || isLoading}
            className={`
              px-8 py-4 rounded-xl text-lg font-semibold transition-all
              ${canContinue
                ? `${colors.primary.bg} hover:opacity-90 text-white shadow-lg`
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Caricamento...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continua alla Waiting Room
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </Button>
        </div>

        {!canContinue && (
          <p className={`text-center mt-4 text-sm ${colors.text.muted}`}>
            Devi accettare entrambe le condizioni per continuare
          </p>
        )}
      </main>
    </div>
  );
}
