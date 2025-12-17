'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import Checkbox from '@/components/ui/Checkbox';
import { useAuth } from '@/lib/hooks/useAuth';
import { isStaff } from '@/lib/permissions';
import { ArrowLeft, Save, Target, Award, Clock, Settings, ShieldX } from 'lucide-react';

export default function EditSimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Check authorization
  const userRole = user?.role;
  const hasAccess = userRole && isStaff(userRole);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [correctPoints, setCorrectPoints] = useState(1.5);
  const [wrongPoints, setWrongPoints] = useState(-0.4);
  const [blankPoints, setBlankPoints] = useState(0);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [passingScore, setPassingScore] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [allowReview, setAllowReview] = useState(true);
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [randomizeAnswers, setRandomizeAnswers] = useState(false);
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch simulation
  const { data: simulation, isLoading } = trpc.simulations.getSimulation.useQuery(
    { id },
    { enabled: hasAccess }
  );

  // Load simulation data into form
  useEffect(() => {
    if (simulation) {
      setTitle(simulation.title);
      setDescription(simulation.description || '');
      setDurationMinutes(simulation.durationMinutes || 0);
      setCorrectPoints(simulation.correctPoints);
      setWrongPoints(simulation.wrongPoints);
      setBlankPoints(simulation.blankPoints);
      setMaxScore(simulation.maxScore);
      setPassingScore(simulation.passingScore);
      setShowResults(simulation.showResults);
      setShowCorrectAnswers(simulation.showCorrectAnswers);
      setAllowReview(simulation.allowReview);
      setRandomizeOrder(simulation.randomizeOrder);
      setRandomizeAnswers(simulation.randomizeAnswers);
      setIsRepeatable(simulation.isRepeatable);
      setMaxAttempts(simulation.maxAttempts);
    }
  }, [simulation]);

  // Update mutation
  const updateMutation = trpc.simulations.update.useMutation({
    onSuccess: () => {
      showSuccess('Salvato', 'Simulazione aggiornata con successo');
      utils.simulations.getSimulation.invalidate({ id });
      router.push(`/simulazioni/${id}`);
    },
    onError: handleMutationError,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateMutation.mutateAsync({
        id,
        title,
        description: description || undefined,
        startDate: undefined,
        endDate: undefined,
        durationMinutes,
        showResults,
        showCorrectAnswers,
        allowReview,
        randomizeOrder,
        randomizeAnswers,
        correctPoints,
        wrongPoints,
        blankPoints,
        maxScore,
        passingScore,
        isRepeatable,
        maxAttempts,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Authorization check
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldX className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>Accesso negato</h2>
          <p className={colors.text.muted}>Non hai i permessi per modificare questa simulazione.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className={`mt-4 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white`}
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoader />;
  }

  if (!simulation) {
    return (
      <div className="p-6">
        <div className={`text-center py-12 ${colors.text.muted}`}>Simulazione non trovata</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/simulazioni/${id}`}
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla simulazione
        </Link>
        <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Modifica Simulazione</h1>
        <p className={colors.text.muted}>Modifica le impostazioni della simulazione</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Informazioni base</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Titolo *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Descrizione
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
          </div>
        </div>

        {/* Timing */}
        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Clock className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Tempistiche</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Durata (minuti)
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                min={0}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
              <p className={`text-xs ${colors.text.muted} mt-1`}>0 = tempo illimitato</p>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Award className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Punteggi</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Risposta corretta
              </label>
              <input
                type="number"
                value={correctPoints}
                onChange={(e) => setCorrectPoints(parseFloat(e.target.value) || 0)}
                step={0.1}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Risposta errata
              </label>
              <input
                type="number"
                value={wrongPoints}
                onChange={(e) => setWrongPoints(parseFloat(e.target.value) || 0)}
                step={0.1}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Non risposta
              </label>
              <input
                type="number"
                value={blankPoints}
                onChange={(e) => setBlankPoints(parseFloat(e.target.value) || 0)}
                step={0.1}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Punteggio massimo (opzionale)
              </label>
              <input
                type="number"
                value={maxScore ?? ''}
                onChange={(e) => setMaxScore(e.target.value ? parseFloat(e.target.value) : null)}
                step={0.1}
                placeholder="Calcolato automaticamente"
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Punteggio minimo per passare
              </label>
              <input
                type="number"
                value={passingScore ?? ''}
                onChange={(e) => setPassingScore(e.target.value ? parseFloat(e.target.value) : null)}
                step={0.1}
                placeholder="Nessuna soglia"
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
          </div>
        </div>

        {/* Options */}
        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Target className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Opzioni</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Checkbox
              id="showResults"
              label="Mostra risultati"
              checked={showResults}
              onChange={(e) => setShowResults(e.target.checked)}
            />
            <Checkbox
              id="showCorrectAnswers"
              label="Mostra risposte corrette"
              checked={showCorrectAnswers}
              onChange={(e) => setShowCorrectAnswers(e.target.checked)}
            />
            <Checkbox
              id="allowReview"
              label="Permetti revisione"
              checked={allowReview}
              onChange={(e) => setAllowReview(e.target.checked)}
            />
            <Checkbox
              id="randomizeOrder"
              label="Ordine casuale domande"
              checked={randomizeOrder}
              onChange={(e) => setRandomizeOrder(e.target.checked)}
            />
            <Checkbox
              id="randomizeAnswers"
              label="Ordine casuale risposte"
              checked={randomizeAnswers}
              onChange={(e) => setRandomizeAnswers(e.target.checked)}
            />
            <Checkbox
              id="isRepeatable"
              label="Ripetibile"
              checked={isRepeatable}
              onChange={(e) => setIsRepeatable(e.target.checked)}
            />
          </div>

          {isRepeatable && (
            <div className="mt-4 max-w-xs">
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Numero massimo tentativi
              </label>
              <input
                type="number"
                value={maxAttempts ?? ''}
                onChange={(e) => setMaxAttempts(e.target.value ? parseInt(e.target.value) : null)}
                min={1}
                placeholder="Illimitati"
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/simulazioni/${id}`}
            className={`px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} hover:${colors.background.hover}`}
          >
            Annulla
          </Link>
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg ${colors.primary.gradient} text-white font-medium disabled:opacity-50`}
          >
            {isSaving ? (
              <>
                <Spinner size="sm" variant="white" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salva modifiche
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
