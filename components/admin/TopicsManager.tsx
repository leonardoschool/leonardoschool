'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';
import { Portal } from '@/components/ui/Portal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import { X, Plus, Edit2, Trash2, BookOpen, Save } from 'lucide-react';

type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

interface TopicData {
  id: string;
  name: string;
  description: string | null;
  difficulty: DifficultyLevel;
  _count?: { materials?: number };
}

type TopicFormState = {
  name: string;
  description: string;
  difficulty: DifficultyLevel;
};

const difficultyLabels: Record<DifficultyLevel, string> = {
  EASY: 'Facile',
  MEDIUM: 'Medio',
  HARD: 'Difficile',
};

const difficultyColors: Record<DifficultyLevel, { bg: string; text: string }> = {
  EASY: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  MEDIUM: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  HARD: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

const difficultyOptions = [
  { value: 'EASY', label: 'Facile' },
  { value: 'MEDIUM', label: 'Medio' },
  { value: 'HARD', label: 'Difficile' },
];

interface TopicsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  subjectName: string;
  subjectColor?: string | null;
}

export default function TopicsManager({
  isOpen,
  onClose,
  subjectId,
  subjectName,
  subjectColor,
}: TopicsManagerProps) {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [topicForm, setTopicForm] = useState<TopicFormState>({
    name: '',
    description: '',
    difficulty: 'MEDIUM',
  });

  const { data: topics, isLoading } = trpc.materials.getTopics.useQuery(
    { subjectId, includeInactive: true },
    { enabled: isOpen },
  );

  const resetTopicForm = () => {
    setTopicForm({ name: '', description: '', difficulty: 'MEDIUM' });
  };

  const stopEditing = () => {
    setEditingTopicId(null);
    resetTopicForm();
  };

  const createTopicMutation = trpc.materials.createTopic.useMutation({
    onSuccess: () => {
      utils.materials.getTopics.invalidate({ subjectId });
      showSuccess('Argomento creato', 'L\'argomento è stato aggiunto con successo.');
      setShowAddTopic(false);
      resetTopicForm();
    },
    onError: handleMutationError,
  });

  const updateTopicMutation = trpc.materials.updateTopic.useMutation({
    onSuccess: () => {
      utils.materials.getTopics.invalidate({ subjectId });
      showSuccess('Argomento aggiornato', 'Le modifiche sono state salvate.');
      stopEditing();
    },
    onError: handleMutationError,
  });

  const deleteTopicMutation = trpc.materials.deleteTopic.useMutation({
    onSuccess: () => {
      utils.materials.getTopics.invalidate({ subjectId });
      showSuccess('Argomento eliminato', 'L\'argomento è stato rimosso.');
      setDeleteConfirm(null);
    },
    onError: handleMutationError,
  });

  const handleEditTopic = (topic: TopicData) => {
    setEditingTopicId(topic.id);
    setShowAddTopic(false);
    setTopicForm({
      name: topic.name,
      description: topic.description || '',
      difficulty: topic.difficulty,
    });
  };

  const handleSaveTopic = () => {
    const trimmedName = topicForm.name.trim();
    if (!trimmedName) return;

    if (editingTopicId) {
      updateTopicMutation.mutate({
        id: editingTopicId,
        name: trimmedName,
        description: topicForm.description || null,
        difficulty: topicForm.difficulty,
      });
      return;
    }

    createTopicMutation.mutate({
      subjectId,
      name: trimmedName,
      description: topicForm.description || undefined,
      difficulty: topicForm.difficulty,
    });
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className={`w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl ${colors.background.card} shadow-2xl`}>
          <div className={`p-5 border-b ${colors.border.primary} flex items-center justify-between`}>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${subjectColor ? '' : colors.primary.gradient}`}
                style={{ backgroundColor: subjectColor || undefined }}
              >
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className={`text-xl font-bold ${colors.text.primary}`}>Gestisci argomenti</h2>
                <p className={`text-sm ${colors.text.muted} truncate`}>{subjectName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${colors.text.muted}`}
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto max-h-[calc(90vh-150px)]">
            {!showAddTopic && !editingTopicId && (
              <button
                onClick={() => {
                  setShowAddTopic(true);
                  resetTopicForm();
                }}
                className={`w-full mb-4 p-4 rounded-xl border-2 border-dashed ${colors.border.primary} ${colors.text.muted} hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center gap-2`}
              >
                <Plus className="w-5 h-5" />
                Aggiungi argomento
              </button>
            )}

            {(showAddTopic || editingTopicId) && (
              <TopicForm
                form={topicForm}
                onChange={setTopicForm}
                onCancel={() => {
                  setShowAddTopic(false);
                  stopEditing();
                }}
                onSave={handleSaveTopic}
                isSaving={createTopicMutation.isPending || updateTopicMutation.isPending}
                submitLabel={editingTopicId ? 'Salva modifiche' : 'Crea argomento'}
              />
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="space-y-2">
                {topics?.map((topic) => (
                  <div key={topic.id} className={`rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${colors.text.primary}`}>{topic.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${difficultyColors[topic.difficulty as DifficultyLevel].bg} ${difficultyColors[topic.difficulty as DifficultyLevel].text}`}>
                            {difficultyLabels[topic.difficulty as DifficultyLevel]}
                          </span>
                          <span className={`text-xs ${colors.text.muted}`}>
                            {topic._count?.materials ?? 0} materiali
                          </span>
                        </div>
                        {topic.description && (
                          <p className={`text-sm ${colors.text.muted} mt-1 truncate`}>{topic.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditTopic(topic as TopicData)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Modifica"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: topic.id, name: topic.name })}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!topics?.length && !showAddTopic && (
                  <div className="text-center py-12">
                    <BookOpen className={`w-12 h-12 mx-auto mb-3 ${colors.text.muted}`} />
                    <p className={`${colors.text.secondary} font-medium`}>Nessun argomento</p>
                    <p className={`text-sm ${colors.text.muted} mt-1`}>
                      Inizia creando il primo argomento per questa materia
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`p-4 border-t ${colors.border.primary} flex justify-end`}>
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-xl ${colors.background.secondary} font-medium hover:opacity-80 transition-opacity ${colors.text.primary}`}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteTopicMutation.mutate({ id: deleteConfirm.id });
          }
        }}
        title="Elimina argomento"
        message={`Sei sicuro di voler eliminare l'argomento "${deleteConfirm?.name}"?\n\nQuesta azione non può essere annullata.`}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleteTopicMutation.isPending}
      />
    </Portal>
  );
}

interface TopicFormProps {
  form: TopicFormState;
  onChange: (form: TopicFormState) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  submitLabel: string;
}

function TopicForm({ form, onChange, onCancel, onSave, isSaving, submitLabel }: TopicFormProps) {
  return (
    <div className={`mb-4 p-4 rounded-xl ${colors.background.secondary} border ${colors.border.primary} space-y-4`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Nome argomento *"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          className={`px-4 py-3 rounded-xl border ${colors.border.primary} ${colors.background.input} ${colors.text.primary}`}
          autoFocus
        />
        <CustomSelect
          value={form.difficulty}
          onChange={(value) => onChange({ ...form, difficulty: value as DifficultyLevel })}
          options={difficultyOptions}
          placeholder="Difficoltà"
        />
      </div>
      <textarea
        placeholder="Descrizione (opzionale)"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
        className={`w-full px-4 py-3 rounded-xl border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} min-h-[90px]`}
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className={`px-4 py-2 rounded-lg ${colors.text.muted} hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          Annulla
        </button>
        <button
          onClick={onSave}
          disabled={!form.name.trim() || isSaving}
          className={`px-4 py-2 rounded-lg ${colors.primary.gradient} text-white disabled:opacity-50 flex items-center gap-2`}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvataggio...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
