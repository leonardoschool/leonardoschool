'use client';

import { useState } from 'react';
import { Zap, Target, Award, Info, Sparkles, BookOpen, PenTool } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import { ButtonLoader, Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import type { SmartRandomPreset, DifficultyMix } from '@/lib/validations/simulationValidation';

interface SelfPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SelfPracticeModal({ isOpen, onClose }: SelfPracticeModalProps) {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();

  // Modalità quiz o lettura
  const [quizMode, setQuizMode] = useState<'quiz' | 'reading'>('quiz');

  // Numero domande
  const [questionCount, setQuestionCount] = useState<string>('20');

  // Durata quiz (in minuti, 0 = illimitato)
  const [durationMinutes, setDurationMinutes] = useState<string>('0');

  // Distribuzione materie
  const [preset, setPreset] = useState<SmartRandomPreset>('PROPORTIONAL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Difficoltà
  const [difficultyMix, setDifficultyMix] = useState<DifficultyMix>('BALANCED');

  // Opzioni avanzate
  const [maximizeCoverage, setMaximizeCoverage] = useState(true);
  const [avoidRecent, setAvoidRecent] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Gestione domande aperte (solo per modalità quiz)
  const [openQuestionCorrection, setOpenQuestionCorrection] = useState<'self' | 'staff'>('self');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Query
  const { data: subjectsData } = trpc.questions.getSubjects.useQuery();
  const { data: staff = [] } = trpc.users.getStaff.useQuery();

  const subjects = subjectsData || [];

  // Mutations
  const generateSmartQuestions = trpc.questions.generateSmartRandomQuestions.useMutation({
    onError: handleMutationError,
  });

  const createSelfPractice = trpc.simulations.createSelfPractice.useMutation({
    onSuccess: (data) => {
      showSuccess('Quiz creato!', 'Inizia ora il tuo quiz!');
      onClose();
      router.push(`/simulazioni/${data.id}`);
    },
    onError: handleMutationError,
  });

  const handleGenerate = async () => {
    try {
      const count = parseInt(questionCount, 10);
      if (isNaN(count) || count < 5) {
        showError('Errore', 'Inserisci un numero minimo di 5 domande.');
        return;
      }

      if (preset === 'SINGLE_SUBJECT' && !selectedSubjectId) {
        showError('Errore', 'Seleziona una materia.');
        return;
      }

      if (quizMode === 'quiz' && openQuestionCorrection === 'staff' && !selectedStaffId) {
        showError('Errore', 'Seleziona un collaboratore per la correzione.');
        return;
      }

      const result = await generateSmartQuestions.mutateAsync({
        totalQuestions: count,
        preset,
        difficultyMix,
        maximizeTopicCoverage: maximizeCoverage,
        avoidRecentlyUsed: avoidRecent,
        focusSubjectId: preset === 'SINGLE_SUBJECT' ? selectedSubjectId : undefined,
      });

      if (!result || result.questions.length === 0) {
        showError('Nessuna domanda', 'Non ci sono domande disponibili con i criteri selezionati.');
        return;
      }

      // Modalità lettura: naviga direttamente alla pagina di studio
      if (quizMode === 'reading') {
        const questionIds = result.questions.map((q) => q.questionId).join(',');
        showSuccess('Pronto!', 'Studia le domande e le risposte corrette.');
        onClose();
        router.push(`/simulazioni/studio?ids=${questionIds}`);
        return;
      }

      // Modalità quiz: crea una simulazione
      const duration = parseInt(durationMinutes, 10);
      await createSelfPractice.mutateAsync({
        questionIds: result.questions.map((q) => q.questionId),
        durationMinutes: isNaN(duration) || duration < 0 ? 0 : duration,
        includeOpenQuestions: true,
        openQuestionCorrection: openQuestionCorrection,
        requestCorrectionFromId: openQuestionCorrection === 'staff' ? selectedStaffId : undefined,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const isCreating = createSelfPractice.isPending || generateSmartQuestions.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Autoesercitazione"
      subtitle="Crea un quiz o studia le domande"
      icon={<Zap className="w-5 h-5 sm:w-6 sm:h-6" />}
      variant="info"
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isCreating}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isCreating}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            <ButtonLoader loading={isCreating} loadingText="Creazione...">
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                {quizMode === 'reading' ? 'Inizia a Studiare' : 'Inizia Quiz'}
              </span>
            </ButtonLoader>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Selezione modalità: Quiz vs Lettura */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Come vuoi esercitarti?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setQuizMode('quiz')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                quizMode === 'quiz'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <PenTool className={`w-6 h-6 mx-auto mb-2 ${
                quizMode === 'quiz' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
              <span className={`block text-sm font-medium ${
                quizMode === 'quiz' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Quiz
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Rispondi e verifica
              </span>
            </button>

            <button
              onClick={() => setQuizMode('reading')}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                quizMode === 'reading'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <BookOpen className={`w-6 h-6 mx-auto mb-2 ${
                quizMode === 'reading' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
              <span className={`block text-sm font-medium ${
                quizMode === 'reading' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Lettura
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Studia domande e risposte
              </span>
            </button>
          </div>
        </div>

        {/* Numero domande - semplice input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Numero di domande
          </label>
          <input
            type="number"
            min="5"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            className="w-full px-4 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="Minimo 5 domande"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimo 5 domande
          </p>
        </div>

        {/* Durata quiz (solo per modalità quiz) */}
        {quizMode === 'quiz' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Durata quiz (minuti)
            </label>
            <input
              type="number"
              min="0"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-4 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="0 = tempo illimitato"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              0 minuti = tempo illimitato. Es: 60 per 1 ora
            </p>
          </div>
        )}

        {/* Distribuzione materie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Materie
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setPreset('PROPORTIONAL');
                setSelectedSubjectId('');
              }}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                preset === 'PROPORTIONAL'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="text-lg block mb-1">📊</span>
              <span className={`block text-xs font-medium ${
                preset === 'PROPORTIONAL' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Tutte
              </span>
            </button>

            <button
              onClick={() => {
                setPreset('BALANCED');
                setSelectedSubjectId('');
              }}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                preset === 'BALANCED'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="text-lg block mb-1">⚖️</span>
              <span className={`block text-xs font-medium ${
                preset === 'BALANCED' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Equo
              </span>
            </button>

            <button
              onClick={() => setPreset('SINGLE_SUBJECT')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                preset === 'SINGLE_SUBJECT'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="text-lg block mb-1">🎯</span>
              <span className={`block text-xs font-medium ${
                preset === 'SINGLE_SUBJECT' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Una sola
              </span>
            </button>
          </div>

          {/* Descrizione preset selezionato */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {preset === 'PROPORTIONAL' && '📊 Mix di tutte le materie in base alla quantità di domande disponibili'}
            {preset === 'BALANCED' && '⚖️ Stesso numero di domande per ogni materia'}
            {preset === 'SINGLE_SUBJECT' && '🎯 Seleziona una materia specifica su cui concentrarti'}
          </p>

          {/* Selezione materia se SINGLE_SUBJECT */}
          {preset === 'SINGLE_SUBJECT' && (
            <div className="mt-3">
              <CustomSelect
                value={selectedSubjectId}
                onChange={(value) => setSelectedSubjectId(value)}
                options={[
                  { value: '', label: 'Seleziona materia...' },
                  ...subjects.map((subject) => ({
                    value: subject.id,
                    label: subject.name,
                  })),
                ]}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Difficoltà */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Difficoltà
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setDifficultyMix('EASY_FOCUS')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                difficultyMix === 'EASY_FOCUS'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="text-lg block mb-1">🟢</span>
              <span className={`block text-xs font-medium ${
                difficultyMix === 'EASY_FOCUS' ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Facili
              </span>
            </button>

            <button
              onClick={() => setDifficultyMix('MEDIUM_ONLY')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                difficultyMix === 'MEDIUM_ONLY'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="text-lg block mb-1">🔵</span>
              <span className={`block text-xs font-medium ${
                difficultyMix === 'MEDIUM_ONLY' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Medie
              </span>
            </button>

            <button
              onClick={() => setDifficultyMix('HARD_FOCUS')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                difficultyMix === 'HARD_FOCUS'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="text-lg block mb-1">🔴</span>
              <span className={`block text-xs font-medium ${
                difficultyMix === 'HARD_FOCUS' ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Difficili
              </span>
            </button>

                        <button
              onClick={() => setDifficultyMix('BALANCED')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                difficultyMix === 'BALANCED'
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="text-lg block mb-1">⚖️</span>
              <span className={`block text-xs font-medium ${
                difficultyMix === 'BALANCED' ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Mix
              </span>
            </button>
          </div>
        </div>

        {/* Opzioni avanzate (collassabili) */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Opzioni avanzate
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
              {/* Checkbox opzioni */}
              <div className="space-y-3">
                <Checkbox
                  id="maximize-coverage"
                  checked={maximizeCoverage}
                  onChange={(e) => setMaximizeCoverage(e.target.checked)}
                  label="Varia gli argomenti"
                />
                <Checkbox
                  id="avoid-recent"
                  checked={avoidRecent}
                  onChange={(e) => setAvoidRecent(e.target.checked)}
                  label="Evita domande già viste"
                />
              </div>

              {/* Gestione domande aperte - solo per quiz */}
              {quizMode === 'quiz' && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Correzione domande aperte
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOpenQuestionCorrection('self')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        openQuestionCorrection === 'self'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Target className="w-4 h-4" />
                      Auto
                    </button>
                    <button
                      onClick={() => setOpenQuestionCorrection('staff')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        openQuestionCorrection === 'staff'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                      Docente
                    </button>
                  </div>

                  {openQuestionCorrection === 'staff' && (
                    <div className="mt-3">
                      <CustomSelect
                        value={selectedStaffId}
                        onChange={(value) => setSelectedStaffId(value)}
                        options={[
                          { value: '', label: 'Seleziona collaboratore...' },
                          ...staff.map((member) => ({
                            value: member.id,
                            label: member.name,
                          })),
                        ]}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info box - diverso per modalità */}
        <div className={`rounded-xl p-3 ${
          quizMode === 'reading' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex gap-3">
            <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              quizMode === 'reading' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-blue-600 dark:text-blue-400'
            }`} />
            <p className={`text-sm ${
              quizMode === 'reading' 
                ? 'text-green-900 dark:text-green-100' 
                : 'text-blue-900 dark:text-blue-100'
            }`}>
              {quizMode === 'reading' 
                ? 'Vedrai le domande con le risposte corrette evidenziate. Perfetto per ripassare!'
                : 'Rispondi alle domande e verifica le tue conoscenze. Vedrai il punteggio alla fine.'
              }
            </p>
          </div>
        </div>

        {/* Loading */}
        {isCreating && (
          <div className="flex items-center justify-center gap-3 py-2">
            <Spinner size="sm" variant="primary" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Preparo le domande...
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
