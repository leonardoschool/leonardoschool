'use client';

/**
 * FillSectionModal — Bulk-fill a simulation section with random questions
 * matching the chosen filters (subject, topics, difficulty).
 *
 * Used in the simulation creation wizard to speed up the manual flow
 * (instead of assigning each question individually to a section).
 */

import { useEffect, useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import MultiSelect from '@/components/ui/MultiSelect';
import { ButtonLoader } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import type { DifficultyMix } from '@/lib/validations/simulationValidation';

export interface PickedQuestion {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  subject?: { id: string; name: string; color: string | null } | null;
  topic?: { id: string; name: string } | null;
}

interface FillSectionModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly sectionName: string;
  /** Default subject for the section (if any) */
  readonly defaultSubjectId?: string | null;
  /** IDs of questions already selected (to be excluded from the random pick) */
  readonly excludeQuestionIds: string[];
  /** Suggested count (e.g. existing section.questionCount or 10) */
  readonly defaultCount?: number;
  /** Called with the picked questions when the user confirms */
  readonly onPicked: (questions: PickedQuestion[]) => void;
}

// Stable reference to avoid creating a new [] on every render when query data is undefined
const EMPTY_TOPICS: { id: string; name: string }[] = [];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Tutte le difficoltà' },
  { value: 'EASY', label: 'Facile' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HARD', label: 'Difficile' },
];

const QUESTION_TYPE_OPTIONS = [
  { value: '', label: 'Tutte le tipologie' },
  { value: 'SINGLE_CHOICE', label: 'Risposta singola' },
  { value: 'MULTIPLE_CHOICE', label: 'Risposta multipla' },
  { value: 'OPEN_TEXT', label: 'Risposta aperta' },
];

const DIFFICULTY_MIX_OPTIONS = [
  { value: 'BALANCED', label: 'Bilanciata' },
  { value: 'EASY_FOCUS', label: 'Più facili' },
  { value: 'HARD_FOCUS', label: 'Più difficili' },
  { value: 'MEDIUM_ONLY', label: 'Solo medie' },
  { value: 'MIXED', label: 'Equa' },
];

export default function FillSectionModal({
  isOpen,
  onClose,
  sectionName,
  defaultSubjectId,
  excludeQuestionIds,
  defaultCount = 10,
  onPicked,
}: FillSectionModalProps) {
  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();

  // Form state
  const [mode, setMode] = useState<'random' | 'smart'>('random');
  const [count, setCount] = useState<string>(String(defaultCount));
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(defaultSubjectId ? [defaultSubjectId] : []);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [difficultyMix, setDifficultyMix] = useState<DifficultyMix>('BALANCED');
  const [avoidRecentlyUsed, setAvoidRecentlyUsed] = useState(true);
  const [maximizeTopicCoverage, setMaximizeTopicCoverage] = useState(true);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setCount(String(defaultCount));
      setMode('random');
      setSelectedSubjectIds(defaultSubjectId ? [defaultSubjectId] : []);
      setSelectedTopicIds([]);
      setSelectedDifficulties([]);
      setSelectedTypes([]);
      setSelectedTagIds([]);
      setDifficultyMix('BALANCED');
      setAvoidRecentlyUsed(true);
      setMaximizeTopicCoverage(true);
    }
  }, [isOpen, defaultCount, defaultSubjectId]);

  // Topics are loaded only when exactly one subject is selected
  const primarySubjectId = selectedSubjectIds.length === 1 ? selectedSubjectIds[0] : '';

  // Data
  const { data: subjects = [] } = trpc.questions.getSubjects.useQuery(undefined, {
    enabled: isOpen,
  });

  const { data: tagCategories = [] } = trpc.questionTags.getCategories.useQuery(
    {},
    { enabled: isOpen }
  );

  const { data: topics = EMPTY_TOPICS } = trpc.materials.getTopics.useQuery(
    { subjectId: primarySubjectId },
    { enabled: isOpen && !!primarySubjectId }
  );

  // Mutation
  const pickMutation = trpc.questions.pickRandomForSection.useMutation({
    onError: handleMutationError,
  });

  const smartMutation = trpc.questions.generateSmartRandomQuestions.useMutation({
    onError: handleMutationError,
  });

  const isPending = pickMutation.isPending || smartMutation.isPending;

  const handleSubmit = async () => {
    const parsedCount = parseInt(count, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      showError('Errore', 'Inserisci un numero di domande valido (minimo 1).');
      return;
    }

    try {
      const questions = mode === 'smart'
        ? await (async () => {
            if (parsedCount < 5) {
              showError('Errore', 'La modalità smart richiede almeno 5 domande.');
              return null;
            }

            const result = await smartMutation.mutateAsync({
              totalQuestions: parsedCount,
              preset: selectedSubjectIds.length === 1 ? 'SINGLE_SUBJECT' : 'BALANCED',
              focusSubjectId: selectedSubjectIds.length === 1 ? selectedSubjectIds[0] : undefined,
              difficultyMix,
              avoidRecentlyUsed,
              maximizeTopicCoverage,
              tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
              types: selectedTypes.length > 0 ? selectedTypes as ('SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT')[] : undefined,
              subjectIds: selectedSubjectIds.length > 1 ? selectedSubjectIds : undefined,
              topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
              excludeQuestionIds,
            });

            return result.questions.map((item) => ({
              id: item.question.id,
              text: item.question.text,
              type: item.question.type,
              difficulty: item.question.difficulty,
              subject: item.question.subject,
              topic: item.question.topic,
            }));
          })()
        : await (async () => {
            const result = await pickMutation.mutateAsync({
              count: parsedCount,
              subjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
              types: selectedTypes.length > 0 ? selectedTypes as ('SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT')[] : undefined,
              topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
              difficulties: selectedDifficulties.length > 0 ? selectedDifficulties as ('EASY' | 'MEDIUM' | 'HARD')[] : undefined,
              tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
              excludeQuestionIds,
            });

            return result.questions;
          })();

      if (!questions) return;

      if (questions.length === 0) {
        showError(
          'Nessuna domanda trovata',
          'Nessuna domanda corrisponde ai filtri scelti (escluse quelle già selezionate).'
        );
        return;
      }

      onPicked(questions as PickedQuestion[]);

      const message =
        questions.length < parsedCount
          ? `Aggiunte ${questions.length} domande (richieste: ${parsedCount}).`
          : `Aggiunte ${questions.length} domande alla sezione.`;
      showSuccess('Sezione riempita', message);
      onClose();
    } catch {
      // handleMutationError already toasted
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Riempi sezione automaticamente"
      subtitle={`Pesca N domande casuali per "${sectionName}"`}
      icon={<Wand2 className="w-5 h-5" />}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            <ButtonLoader loading={isPending} loadingText="Pesco...">
              <Sparkles className="w-4 h-4 mr-1" />
              Riempi sezione
            </ButtonLoader>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
            Modalità
          </label>
          <div className={`grid grid-cols-2 gap-2 rounded-lg ${colors.background.secondary} p-1 border ${colors.border.light}`}>
            <button
              type="button"
              onClick={() => setMode('random')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'random' ? `${colors.primary.bg} text-white` : `${colors.text.secondary} hover:${colors.background.hover}`}`}
            >
              Casuale
            </button>
            <button
              type="button"
              onClick={() => setMode('smart')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'smart' ? `${colors.primary.bg} text-white` : `${colors.text.secondary} hover:${colors.background.hover}`}`}
            >
              Smart
            </button>
          </div>
        </div>

        {/* Count */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
            Numero domande *
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${colors.border.input} ${colors.background.input} ${colors.text.primary} text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
        </div>

        {/* Subject multi-select */}
        {subjects.length > 0 && (
          <MultiSelect
            label="Materia"
            values={selectedSubjectIds}
            options={subjects.map((s) => ({ value: s.id, label: s.name, color: s.color }))}
            onChange={(vals) => {
              setSelectedSubjectIds(vals);
              setSelectedTopicIds([]);
            }}
            placeholder="Tutte le materie"
          />
        )}

        {/* Question type multi-select */}
        <MultiSelect
          label="Tipologia domanda"
          values={selectedTypes}
          options={QUESTION_TYPE_OPTIONS.filter((o) => o.value !== '')}
          onChange={setSelectedTypes}
          placeholder="Tutte le tipologie"
        />

        {/* Topics multi-select — only when a single subject is selected */}
        {primarySubjectId && topics.length > 0 && (
          <MultiSelect
            label="Argomenti"
            values={selectedTopicIds}
            options={topics.map((t) => ({ value: t.id, label: t.name }))}
            onChange={setSelectedTopicIds}
            placeholder="Tutti gli argomenti"
          />
        )}

        {mode === 'random' ? (
          <MultiSelect
            label="Difficoltà"
            values={selectedDifficulties}
            options={DIFFICULTY_OPTIONS.filter((o) => o.value !== '')}
            onChange={setSelectedDifficulties}
            placeholder="Tutte le difficoltà"
          />
        ) : (
          <div className="space-y-3">
            <CustomSelect
              label="Mix difficoltà"
              value={difficultyMix}
              onChange={(value) => setDifficultyMix(value as DifficultyMix)}
              options={DIFFICULTY_MIX_OPTIONS}
              placeholder="Bilanciata"
            />
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border ${colors.border.light} ${colors.background.secondary} p-3`}>
              <Checkbox
                checked={avoidRecentlyUsed}
                onChange={(e) => setAvoidRecentlyUsed(e.target.checked)}
                label="Evita già usate"
              />
              <Checkbox
                checked={maximizeTopicCoverage}
                onChange={(e) => setMaximizeTopicCoverage(e.target.checked)}
                label="Copri più argomenti"
              />
            </div>
          </div>
        )}

        {/* Tags */}
        {tagCategories.length > 0 && (
          <MultiSelect
            label="Tag"
            values={selectedTagIds}
            options={tagCategories.flatMap((cat) =>
              cat.tags.map((tag) => {
                const tagLabel = tagCategories.length > 1 ? `${tag.name} (${cat.name})` : tag.name;
                return {
                  value: tag.id,
                  label: tagLabel,
                  color: tag.color ?? undefined,
                };
              })
            )}
            onChange={setSelectedTagIds}
            placeholder="Tutti i tag"
          />
        )}

        {/* Info */}
        <div
          className={`text-xs ${colors.text.muted} p-2 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}
        >
          Le domande verranno pescate {mode === 'smart' ? 'in modo smart' : 'casualmente'} tra quelle{' '}
          <strong>pubblicate</strong> che corrispondono ai filtri, escludendo quelle{' '}
          <strong>già selezionate</strong> nella simulazione.
        </div>
      </div>
    </Modal>
  );
}
