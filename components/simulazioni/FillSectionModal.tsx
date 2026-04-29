'use client';

/**
 * FillSectionModal — Bulk-fill a simulation section with random questions
 * matching the chosen filters (subject, topics, sub-topics, difficulty).
 *
 * Used in the simulation creation wizard to speed up the manual flow
 * (instead of assigning each question individually to a section).
 */

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import { ButtonLoader } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';

export interface PickedQuestion {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  subject?: { id: string; name: string; color: string | null } | null;
  topic?: { id: string; name: string } | null;
  subTopic?: { id: string; name: string } | null;
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
const EMPTY_TOPICS: { id: string; name: string; subTopics?: { id: string; name: string }[] }[] = [];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Tutte le difficoltà' },
  { value: 'EASY', label: 'Facile' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HARD', label: 'Difficile' },
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
  const [count, setCount] = useState<string>(String(defaultCount));
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId ?? '');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedSubTopicIds, setSelectedSubTopicIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>('');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setCount(String(defaultCount));
      setSubjectId(defaultSubjectId ?? '');
      setSelectedTopicIds([]);
      setSelectedSubTopicIds([]);
      setDifficulty('');
    }
  }, [isOpen, defaultCount, defaultSubjectId]);

  // Data
  const { data: subjects = [] } = trpc.questions.getSubjects.useQuery(undefined, {
    enabled: isOpen,
  });

  const { data: topics = EMPTY_TOPICS } = trpc.materials.getTopics.useQuery(
    { subjectId },
    { enabled: isOpen && !!subjectId }
  );

  // Derived sub-topics from selected topics
  const availableSubTopics = useMemo(() => {
    if (selectedTopicIds.length === 0) return [];
    return topics
      .filter((t) => selectedTopicIds.includes(t.id))
      .flatMap((t) =>
        (t.subTopics || []).map((st) => ({
          id: st.id,
          name: st.name,
          topicName: t.name,
        }))
      );
  }, [topics, selectedTopicIds]);

  // Reset sub-topic selection when topics change to keep selection valid.
  // Return prev unchanged when nothing is filtered out so React bails out
  // of re-rendering and avoids an infinite update loop.
  useEffect(() => {
    const validIds = new Set(availableSubTopics.map((st) => st.id));
    setSelectedSubTopicIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [availableSubTopics]);

  // Subject options
  const subjectOptions = useMemo(
    () => [
      { value: '', label: 'Tutte le materie' },
      ...subjects.map((s) => ({ value: s.id, label: s.name })),
    ],
    [subjects]
  );

  // Mutation
  const pickMutation = trpc.questions.pickRandomForSection.useMutation({
    onError: handleMutationError,
  });

  const toggleTopic = (id: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSubTopic = (id: string) => {
    setSelectedSubTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    const parsedCount = parseInt(count, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      showError('Errore', 'Inserisci un numero di domande valido (minimo 1).');
      return;
    }

    try {
      const result = await pickMutation.mutateAsync({
        count: parsedCount,
        subjectId: subjectId || undefined,
        topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
        subTopicIds: selectedSubTopicIds.length > 0 ? selectedSubTopicIds : undefined,
        difficulty: (difficulty || undefined) as 'EASY' | 'MEDIUM' | 'HARD' | undefined,
        excludeQuestionIds,
      });

      if (result.questions.length === 0) {
        showError(
          'Nessuna domanda trovata',
          'Nessuna domanda corrisponde ai filtri scelti (escluse quelle già selezionate).'
        );
        return;
      }

      onPicked(result.questions as PickedQuestion[]);

      const message =
        result.found < result.requested
          ? `Aggiunte ${result.found} domande (richieste: ${result.requested}).`
          : `Aggiunte ${result.found} domande alla sezione.`;
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
          <Button onClick={handleSubmit} disabled={pickMutation.isPending}>
            <ButtonLoader loading={pickMutation.isPending} loadingText="Pesco...">
              <Sparkles className="w-4 h-4 mr-1" />
              Riempi sezione
            </ButtonLoader>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
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

        {/* Subject */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
            Materia
          </label>
          <CustomSelect
            value={subjectId}
            onChange={(val) => {
              setSubjectId(val);
              setSelectedTopicIds([]);
              setSelectedSubTopicIds([]);
            }}
            options={subjectOptions}
            placeholder="Tutte le materie"
          />
        </div>

        {/* Topics multi-select */}
        {subjectId && topics.length > 0 && (
          <div>
            <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
              Argomenti
              <span className={`ml-2 text-xs font-normal ${colors.text.muted}`}>
                ({selectedTopicIds.length} selezionati)
              </span>
            </label>
            <div
              className={`max-h-40 overflow-y-auto rounded-lg border ${colors.border.input} ${colors.background.input} p-2 space-y-1`}
            >
              {topics.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-2 px-2 py-1 rounded hover:${colors.background.secondary} cursor-pointer text-sm ${colors.text.primary}`}
                >
                  <Checkbox
                    checked={selectedTopicIds.includes(t.id)}
                    onChange={() => toggleTopic(t.id)}
                  />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Sub-topics multi-select */}
        {availableSubTopics.length > 0 && (
          <div>
            <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
              Sotto-argomenti
              <span className={`ml-2 text-xs font-normal ${colors.text.muted}`}>
                ({selectedSubTopicIds.length} selezionati)
              </span>
            </label>
            <div
              className={`max-h-40 overflow-y-auto rounded-lg border ${colors.border.input} ${colors.background.input} p-2 space-y-1`}
            >
              {availableSubTopics.map((st) => (
                <label
                  key={st.id}
                  className={`flex items-center gap-2 px-2 py-1 rounded hover:${colors.background.secondary} cursor-pointer text-sm ${colors.text.primary}`}
                >
                  <Checkbox
                    checked={selectedSubTopicIds.includes(st.id)}
                    onChange={() => toggleSubTopic(st.id)}
                  />
                  <span>
                    {st.name}{' '}
                    <span className={`text-xs ${colors.text.muted}`}>({st.topicName})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
            Difficoltà
          </label>
          <CustomSelect
            value={difficulty}
            onChange={setDifficulty}
            options={DIFFICULTY_OPTIONS}
            placeholder="Tutte le difficoltà"
          />
        </div>

        {/* Info */}
        <div
          className={`text-xs ${colors.text.muted} p-2 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}
        >
          Le domande verranno pescate casualmente tra quelle{' '}
          <strong>pubblicate</strong> che corrispondono ai filtri, escludendo quelle{' '}
          <strong>già selezionate</strong> nella simulazione.
        </div>
      </div>
    </Modal>
  );
}
