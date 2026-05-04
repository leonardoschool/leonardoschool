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
import type { LocationType, SimulationType } from '@/lib/validations/simulationValidation';
import {
  ArrowLeft,
  Save,
  Target,
  Award,
  Clock,
  Settings,
  ShieldX,
  Shield,
  Printer,
  Users,
  MapPin,
} from 'lucide-react';

type EditableSimulationMode = Extract<SimulationType, 'OFFICIAL' | 'PRACTICE'>;

const modeOptions: Array<{
  value: EditableSimulationMode;
  title: string;
  description: string;
}> = [
  {
    value: 'OFFICIAL',
    title: 'Simulazione ufficiale',
    description: 'Usa stanza virtuale, controlli anti-cheat e impostazioni adatte a prove valutative.',
  },
  {
    value: 'PRACTICE',
    title: 'Esercitazione',
    description: 'Consente revisione, ripetizione e accesso più flessibile per allenarsi sulle stesse domande.',
  },
];

const locationOptions: Array<{ value: LocationType; label: string }> = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'IN_PERSON', label: 'In presenza' },
  { value: 'HYBRID', label: 'Ibrida' },
];

export default function EditSimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const userRole = user?.role;
  const hasAccess = userRole && isStaff(userRole);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [simulationType, setSimulationType] = useState<SimulationType>('PRACTICE');
  const [isOfficial, setIsOfficial] = useState(false);
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
  const [isPaperBased, setIsPaperBased] = useState(false);
  const [paperInstructions, setPaperInstructions] = useState('');
  const [trackAttendance, setTrackAttendance] = useState(false);
  const [locationType, setLocationType] = useState<LocationType | ''>('');
  const [locationDetails, setLocationDetails] = useState('');
  const [enableAntiCheat, setEnableAntiCheat] = useState(false);
  const [forceFullscreen, setForceFullscreen] = useState(false);
  const [blockTabChange, setBlockTabChange] = useState(false);
  const [blockCopyPaste, setBlockCopyPaste] = useState(false);
  const [logSuspiciousEvents, setLogSuspiciousEvents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: simulation, isLoading } = trpc.simulations.getSimulation.useQuery(
    { id },
    { enabled: Boolean(hasAccess) }
  );

  useEffect(() => {
    if (!simulation) return;

    setTitle(simulation.title);
    setDescription(simulation.description || '');
    setSimulationType(simulation.type);
    setIsOfficial(simulation.isOfficial);
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
    setIsPaperBased(simulation.isPaperBased);
    setPaperInstructions(simulation.paperInstructions || '');
    setTrackAttendance(simulation.trackAttendance);
    setLocationType((simulation.locationType as LocationType | null) || '');
    setLocationDetails(simulation.locationDetails || '');
    setEnableAntiCheat(simulation.enableAntiCheat);
    setForceFullscreen(simulation.forceFullscreen);
    setBlockTabChange(simulation.blockTabChange);
    setBlockCopyPaste(simulation.blockCopyPaste);
    setLogSuspiciousEvents(simulation.logSuspiciousEvents);
  }, [simulation]);

  const updateMutation = trpc.simulations.update.useMutation({
    onSuccess: () => {
      showSuccess('Salvato', 'Simulazione aggiornata con successo');
      utils.simulations.getSimulation.invalidate({ id });
      utils.simulations.getSimulations.invalidate();
      router.push(`/simulazioni/${id}`);
    },
    onError: handleMutationError,
  });

  const applySimulationMode = (nextType: EditableSimulationMode) => {
    const nextIsOfficial = nextType === 'OFFICIAL';
    setSimulationType(nextType);
    setIsOfficial(nextIsOfficial);

    if (nextIsOfficial) {
      setDurationMinutes((value) => (value > 0 ? value : 110));
      setCorrectPoints(1.5);
      setWrongPoints(-0.4);
      setBlankPoints(0);
      setShowResults(false);
      setShowCorrectAnswers(false);
      setAllowReview(false);
      setRandomizeOrder(true);
      setRandomizeAnswers(true);
      setIsRepeatable(false);
      setMaxAttempts(null);
      if (!isPaperBased) {
        setEnableAntiCheat(true);
        setForceFullscreen(true);
        setBlockTabChange(true);
        setBlockCopyPaste(true);
        setLogSuspiciousEvents(true);
      }
      return;
    }

    setShowResults(true);
    setShowCorrectAnswers(true);
    setAllowReview(true);
    setIsRepeatable(true);
    setEnableAntiCheat(false);
    setForceFullscreen(false);
    setBlockTabChange(false);
    setBlockCopyPaste(false);
    setLogSuspiciousEvents(false);
  };

  const handlePaperBasedChange = (checked: boolean) => {
    setIsPaperBased(checked);
    if (checked) {
      setEnableAntiCheat(false);
      setForceFullscreen(false);
      setBlockTabChange(false);
      setBlockCopyPaste(false);
      setLogSuspiciousEvents(false);
      setTrackAttendance(true);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await updateMutation.mutateAsync({
        id,
        title,
        description: description || undefined,
        type: simulationType,
        isOfficial,
        accessType: isOfficial ? 'ROOM' : 'OPEN',
        startDate: undefined,
        endDate: undefined,
        durationMinutes: isOfficial ? Math.max(1, durationMinutes) : durationMinutes,
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
        maxAttempts: isRepeatable ? maxAttempts : null,
        isPaperBased,
        paperInstructions: isPaperBased ? paperInstructions || null : null,
        trackAttendance,
        locationType: trackAttendance ? locationType || null : null,
        locationDetails: trackAttendance ? locationDetails || null : null,
        enableAntiCheat: isPaperBased ? false : enableAntiCheat,
        forceFullscreen: isPaperBased ? false : forceFullscreen,
        blockTabChange: isPaperBased ? false : blockTabChange,
        blockCopyPaste: isPaperBased ? false : blockCopyPaste,
        logSuspiciousEvents: isPaperBased ? false : logSuspiciousEvents,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldX className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>Accesso negato</h2>
          <p className={colors.text.muted}>Non hai i permessi per modificare questa simulazione.</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className={`mt-4 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white`}
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) return <PageLoader />;

  if (!simulation) {
    return (
      <div className="p-6">
        <div className={`text-center py-12 ${colors.text.muted}`}>Simulazione non trovata</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Target className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Modalità</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modeOptions.map((option) => {
              const selected = simulationType === option.value;
              const Icon = option.value === 'OFFICIAL' ? Award : Target;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applySimulationMode(option.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    selected
                      ? `${colors.primary.border} ${colors.primary.softBg}`
                      : `${colors.border.light} ${colors.effects.hover.bgSubtle}`
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${selected ? colors.primary.text : colors.text.muted}`} />
                    <div>
                      <h3 className={`font-semibold ${colors.text.primary}`}>{option.title}</h3>
                      <p className={`text-sm ${colors.text.muted} mt-1`}>{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className={`mt-4 p-3 rounded-lg ${colors.background.secondary} ${colors.text.secondary} text-sm flex items-start gap-2`}>
            <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {isOfficial
              ? 'Accesso impostato su stanza virtuale. Le assegnazioni ufficiali partiranno con sessione sincronizzata.'
              : 'Accesso impostato come esercitazione aperta. Puoi duplicare una prova ufficiale e convertirla qui per l’allenamento.'}
          </div>
        </div>

        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Informazioni base</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Titolo *</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Descrizione</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Clock className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Tempistiche</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Durata (minuti)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(parseInt(event.target.value, 10) || 0)}
                min={isOfficial ? 1 : 0}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
              <p className={`text-xs ${colors.text.muted} mt-1`}>
                {isOfficial ? 'Minimo 1 minuto per prove ufficiali' : '0 = tempo illimitato'}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Award className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Punteggi</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Risposta corretta</label>
              <input
                type="number"
                value={correctPoints}
                onChange={(event) => setCorrectPoints(parseFloat(event.target.value) || 0)}
                step={0.1}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Risposta errata</label>
              <input
                type="number"
                value={wrongPoints}
                onChange={(event) => setWrongPoints(parseFloat(event.target.value) || 0)}
                step={0.1}
                max={0}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Non risposta</label>
              <input
                type="number"
                value={blankPoints}
                onChange={(event) => setBlankPoints(parseFloat(event.target.value) || 0)}
                step={0.1}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Punteggio massimo (opzionale)</label>
              <input
                type="number"
                value={maxScore ?? ''}
                onChange={(event) => setMaxScore(event.target.value ? parseFloat(event.target.value) : null)}
                step={0.1}
                placeholder="Calcolato automaticamente"
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Punteggio minimo per passare</label>
              <input
                type="number"
                value={passingScore ?? ''}
                onChange={(event) => setPassingScore(event.target.value ? parseFloat(event.target.value) : null)}
                step={0.1}
                placeholder="Nessuna soglia"
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Target className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Opzioni</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Checkbox id="showResults" label="Mostra risultati" checked={showResults} onChange={(event) => setShowResults(event.target.checked)} />
            <Checkbox id="showCorrectAnswers" label="Mostra risposte corrette" checked={showCorrectAnswers} onChange={(event) => setShowCorrectAnswers(event.target.checked)} />
            <Checkbox id="allowReview" label="Permetti revisione" checked={allowReview} onChange={(event) => setAllowReview(event.target.checked)} />
            <Checkbox id="randomizeOrder" label="Ordine casuale domande" checked={randomizeOrder} onChange={(event) => setRandomizeOrder(event.target.checked)} />
            <Checkbox id="randomizeAnswers" label="Ordine casuale risposte" checked={randomizeAnswers} onChange={(event) => setRandomizeAnswers(event.target.checked)} />
            <Checkbox id="isRepeatable" label="Ripetibile" checked={isRepeatable} onChange={(event) => setIsRepeatable(event.target.checked)} />
          </div>

          {isRepeatable && (
            <div className="mt-4 max-w-xs">
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Numero massimo tentativi</label>
              <input
                type="number"
                value={maxAttempts ?? ''}
                onChange={(event) => setMaxAttempts(event.target.value ? parseInt(event.target.value, 10) : null)}
                min={1}
                placeholder="Illimitati"
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
              />
            </div>
          )}
        </div>

        <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3 mb-4">
            <Printer className={`w-5 h-5 ${colors.text.muted}`} />
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Svolgimento</h2>
          </div>

          <div className="space-y-5">
            <div>
              <Checkbox
                id="isPaperBased"
                label="Modalità cartacea"
                checked={isPaperBased}
                onChange={(event) => handlePaperBasedChange(event.target.checked)}
              />
              {isPaperBased && (
                <div className="mt-3 space-y-3">
                  <textarea
                    value={paperInstructions}
                    onChange={(event) => setPaperInstructions(event.target.value)}
                    rows={3}
                    placeholder="Istruzioni per la somministrazione cartacea"
                    className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>
              )}
            </div>

            <div className={`pt-5 border-t ${colors.border.light}`}>
              <Checkbox
                id="trackAttendance"
                label="Registra presenze"
                checked={trackAttendance}
                onChange={(event) => setTrackAttendance(event.target.checked)}
              />
              {trackAttendance && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Tipo luogo</label>
                    <select
                      value={locationType}
                      onChange={(event) => setLocationType(event.target.value as LocationType | '')}
                      className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                    >
                      <option value="">Seleziona</option>
                      {locationOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>Dettagli luogo</label>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-2.5 w-4 h-4 ${colors.text.muted}`} />
                      <input
                        type="text"
                        value={locationDetails}
                        onChange={(event) => setLocationDetails(event.target.value)}
                        placeholder="Aula, sede o link"
                        className={`w-full pl-9 pr-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {!isPaperBased && (
          <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
            <div className="flex items-center gap-3 mb-4">
              <Shield className={`w-5 h-5 ${colors.text.muted}`} />
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Protezione Anti-Cheat</h2>
            </div>

            <Checkbox
              id="enableAntiCheat"
              label="Abilita protezione anti-cheat"
              checked={enableAntiCheat}
              onChange={(event) => setEnableAntiCheat(event.target.checked)}
            />

            {enableAntiCheat && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Checkbox id="forceFullscreen" label="Forza modalità fullscreen" checked={forceFullscreen} onChange={(event) => setForceFullscreen(event.target.checked)} />
                <Checkbox id="blockTabChange" label="Blocca cambio scheda" checked={blockTabChange} onChange={(event) => setBlockTabChange(event.target.checked)} />
                <Checkbox id="blockCopyPaste" label="Blocca copia/incolla" checked={blockCopyPaste} onChange={(event) => setBlockCopyPaste(event.target.checked)} />
                <Checkbox id="logSuspiciousEvents" label="Registra eventi sospetti" checked={logSuspiciousEvents} onChange={(event) => setLogSuspiciousEvents(event.target.checked)} />
              </div>
            )}
          </div>
        )}

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