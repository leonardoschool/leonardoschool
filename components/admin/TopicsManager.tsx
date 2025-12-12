'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';
import { Portal } from '@/components/ui/Portal';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  GripVertical,
  Save,
  AlertCircle,
} from 'lucide-react';

type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

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

  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingSubTopicId, setEditingSubTopicId] = useState<string | null>(null);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [addingSubTopicToId, setAddingSubTopicToId] = useState<string | null>(null);

  // Form states
  const [topicForm, setTopicForm] = useState({
    name: '',
    description: '',
    difficulty: 'MEDIUM' as DifficultyLevel,
  });

  const [subTopicForm, setSubTopicForm] = useState({
    name: '',
    description: '',
    difficulty: 'MEDIUM' as DifficultyLevel,
  });

  // Query topics with subtopics
  const { data: topics, isLoading } = trpc.materials.getTopics.useQuery(
    { subjectId, includeInactive: true },
    { enabled: isOpen }
  );

  // Mutations
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
      setEditingTopicId(null);
      resetTopicForm();
    },
    onError: handleMutationError,
  });

  const deleteTopicMutation = trpc.materials.deleteTopic.useMutation({
    onSuccess: () => {
      utils.materials.getTopics.invalidate({ subjectId });
      showSuccess('Argomento eliminato', 'L\'argomento è stato rimosso.');
    },
    onError: handleMutationError,
  });

  const createSubTopicMutation = trpc.materials.createSubTopic.useMutation({
    onSuccess: () => {
      utils.materials.getTopics.invalidate({ subjectId });
      showSuccess('Sotto-argomento creato', 'Il sotto-argomento è stato aggiunto.');
      setAddingSubTopicToId(null);
      resetSubTopicForm();
    },
    onError: handleMutationError,
  });

  const updateSubTopicMutation = trpc.materials.updateSubTopic.useMutation({
    onSuccess: () => {
      utils.materials.getTopics.invalidate({ subjectId });
      showSuccess('Sotto-argomento aggiornato', 'Le modifiche sono state salvate.');
      setEditingSubTopicId(null);
      resetSubTopicForm();
    },
    onError: handleMutationError,
  });

  const deleteSubTopicMutation = trpc.materials.deleteSubTopic.useMutation({
    onSuccess: () => {
      utils.materials.getTopics.invalidate({ subjectId });
      showSuccess('Sotto-argomento eliminato', 'Il sotto-argomento è stato rimosso.');
    },
    onError: handleMutationError,
  });

  const resetTopicForm = () => {
    setTopicForm({ name: '', description: '', difficulty: 'MEDIUM' });
  };

  const resetSubTopicForm = () => {
    setSubTopicForm({ name: '', description: '', difficulty: 'MEDIUM' });
  };

  const toggleExpand = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const handleEditTopic = (topic: any) => {
    setEditingTopicId(topic.id);
    setTopicForm({
      name: topic.name,
      description: topic.description || '',
      difficulty: topic.difficulty,
    });
  };

  const handleEditSubTopic = (subTopic: any) => {
    setEditingSubTopicId(subTopic.id);
    setSubTopicForm({
      name: subTopic.name,
      description: subTopic.description || '',
      difficulty: subTopic.difficulty,
    });
  };

  const handleSaveTopic = () => {
    if (!topicForm.name.trim()) return;

    if (editingTopicId) {
      updateTopicMutation.mutate({
        id: editingTopicId,
        name: topicForm.name,
        description: topicForm.description || null,
        difficulty: topicForm.difficulty,
      });
    } else {
      createTopicMutation.mutate({
        subjectId,
        name: topicForm.name,
        description: topicForm.description || undefined,
        difficulty: topicForm.difficulty,
      });
    }
  };

  const handleSaveSubTopic = (topicId: string) => {
    if (!subTopicForm.name.trim()) return;

    if (editingSubTopicId) {
      updateSubTopicMutation.mutate({
        id: editingSubTopicId,
        name: subTopicForm.name,
        description: subTopicForm.description || null,
        difficulty: subTopicForm.difficulty,
      });
    } else {
      createSubTopicMutation.mutate({
        topicId,
        name: subTopicForm.name,
        description: subTopicForm.description || undefined,
        difficulty: subTopicForm.difficulty,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className={`${colors.background.card} rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col`}>
          {/* Header */}
          <div 
            className="p-6 border-b rounded-t-2xl"
            style={{ 
              backgroundColor: subjectColor ? `${subjectColor}15` : undefined,
              borderColor: subjectColor || undefined,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: subjectColor || '#6366f1' }}
                >
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${colors.text.primary}`}>
                    Gestione Argomenti
                  </h3>
                  <p className={`${colors.text.secondary} text-sm`}>{subjectName}</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className={`p-2 rounded-lg hover:${colors.background.secondary} transition-colors text-gray-600 dark:text-gray-400`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Add Topic Button */}
                {!showAddTopic && (
                  <button
                    onClick={() => {
                      setShowAddTopic(true);
                      setEditingTopicId(null);
                      resetTopicForm();
                    }}
                    className={`w-full p-4 rounded-xl border-2 border-dashed ${colors.border.primary} ${colors.text.muted} hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center gap-2`}
                  >
                    <Plus className="w-5 h-5" />
                    Aggiungi Argomento
                  </button>
                )}

                {/* Add Topic Form */}
                {showAddTopic && (
                  <div className={`p-4 rounded-xl ${colors.background.secondary} space-y-4`}>
                    <h4 className={`font-medium ${colors.text.primary}`}>Nuovo Argomento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Nome argomento *"
                        value={topicForm.name}
                        onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                        className={`px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary}`}
                        autoFocus
                      />
                      <CustomSelect
                        value={topicForm.difficulty}
                        onChange={(value) => setTopicForm({ ...topicForm, difficulty: value as DifficultyLevel })}
                        options={difficultyOptions}
                        placeholder="Difficoltà"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Descrizione (opzionale)"
                      value={topicForm.description}
                      onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary}`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowAddTopic(false);
                          resetTopicForm();
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg ${colors.background.card} ${colors.text.secondary} border ${colors.border.primary}`}
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleSaveTopic}
                        disabled={!topicForm.name.trim() || createTopicMutation.isPending}
                        className={`flex-1 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white disabled:opacity-50 flex items-center justify-center gap-2`}
                      >
                        {createTopicMutation.isPending ? (
                          <Spinner size="xs" variant="white" />
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Salva
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Topics List */}
                {topics?.map((topic) => (
                  <div key={topic.id} className={`rounded-xl border ${colors.border.primary} overflow-hidden`}>
                    {/* Topic Header */}
                    {editingTopicId === topic.id ? (
                      <div className={`p-4 ${colors.background.secondary} space-y-3`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={topicForm.name}
                            onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                            className={`px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary}`}
                            autoFocus
                          />
                          <CustomSelect
                            value={topicForm.difficulty}
                            onChange={(value) => setTopicForm({ ...topicForm, difficulty: value as DifficultyLevel })}
                            options={difficultyOptions}
                            placeholder="Difficoltà"
                            size="sm"
                          />
                        </div>
                        <input
                          type="text"
                          value={topicForm.description}
                          onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                          placeholder="Descrizione"
                          className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary}`}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingTopicId(null);
                              resetTopicForm();
                            }}
                            className={`px-3 py-1.5 rounded-lg ${colors.background.card} ${colors.text.secondary} text-sm`}
                          >
                            Annulla
                          </button>
                          <button
                            onClick={handleSaveTopic}
                            disabled={!topicForm.name.trim() || updateTopicMutation.isPending}
                            className={`px-3 py-1.5 rounded-lg ${colors.primary.gradient} text-white text-sm disabled:opacity-50 flex items-center gap-1`}
                          >
                            {updateTopicMutation.isPending ? <Spinner size="xs" variant="white" /> : <Save className="w-3 h-3" />}
                            Salva
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                        onClick={() => toggleExpand(topic.id)}
                      >
                        <button className={`p-1 rounded ${colors.text.muted}`}>
                          {expandedTopics.has(topic.id) ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${colors.text.primary}`}>{topic.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${difficultyColors[topic.difficulty as DifficultyLevel].bg} ${difficultyColors[topic.difficulty as DifficultyLevel].text}`}>
                              {difficultyLabels[topic.difficulty as DifficultyLevel]}
                            </span>
                            <span className={`text-xs ${colors.text.muted}`}>
                              ({topic._count?.subTopics || 0} sotto-argomenti)
                            </span>
                          </div>
                          {topic.description && (
                            <p className={`text-sm ${colors.text.muted} truncate`}>{topic.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditTopic(topic)}
                            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700`}
                            title="Modifica"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Eliminare questo argomento e tutti i suoi sotto-argomenti?')) {
                                deleteTopicMutation.mutate({ id: topic.id });
                              }
                            }}
                            className={`p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20`}
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SubTopics (when expanded) */}
                    {expandedTopics.has(topic.id) && (
                      <div className={`border-t ${colors.border.primary} ${colors.background.secondary}`}>
                        <div className="p-3 space-y-2">
                          {/* Existing SubTopics */}
                          {topic.subTopics?.map((subTopic: any) => (
                            <div key={subTopic.id}>
                              {editingSubTopicId === subTopic.id ? (
                                <div className={`p-3 rounded-lg ${colors.background.card} border ${colors.border.primary} space-y-2`}>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={subTopicForm.name}
                                      onChange={(e) => setSubTopicForm({ ...subTopicForm, name: e.target.value })}
                                      className={`px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm`}
                                      autoFocus
                                    />
                                    <CustomSelect
                                      value={subTopicForm.difficulty}
                                      onChange={(value) => setSubTopicForm({ ...subTopicForm, difficulty: value as DifficultyLevel })}
                                      options={difficultyOptions}
                                      placeholder="Difficoltà"
                                      size="sm"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingSubTopicId(null);
                                        resetSubTopicForm();
                                      }}
                                      className={`px-3 py-1 rounded text-xs ${colors.text.muted}`}
                                    >
                                      Annulla
                                    </button>
                                    <button
                                      onClick={() => handleSaveSubTopic(topic.id)}
                                      disabled={!subTopicForm.name.trim() || updateSubTopicMutation.isPending}
                                      className={`px-3 py-1 rounded text-xs ${colors.primary.gradient} text-white disabled:opacity-50`}
                                    >
                                      {updateSubTopicMutation.isPending ? '...' : 'Salva'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className={`p-3 rounded-lg ${colors.background.card} border ${colors.border.primary} flex items-center justify-between`}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                    <span className={`${colors.text.primary}`}>{subTopic.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${difficultyColors[subTopic.difficulty as DifficultyLevel].bg} ${difficultyColors[subTopic.difficulty as DifficultyLevel].text}`}>
                                      {difficultyLabels[subTopic.difficulty as DifficultyLevel]}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleEditSubTopic(subTopic)}
                                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                    >
                                      <Edit2 className="w-3 h-3 text-gray-500" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('Eliminare questo sotto-argomento?')) {
                                          deleteSubTopicMutation.mutate({ id: subTopic.id });
                                        }
                                      }}
                                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Add SubTopic Form */}
                          {addingSubTopicToId === topic.id ? (
                            <div className={`p-3 rounded-lg ${colors.background.card} border ${colors.border.primary} space-y-2`}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Nome sotto-argomento *"
                                  value={subTopicForm.name}
                                  onChange={(e) => setSubTopicForm({ ...subTopicForm, name: e.target.value })}
                                  className={`px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm`}
                                  autoFocus
                                />
                                <CustomSelect
                                  value={subTopicForm.difficulty}
                                  onChange={(value) => setSubTopicForm({ ...subTopicForm, difficulty: value as DifficultyLevel })}
                                  options={difficultyOptions}
                                  placeholder="Difficoltà"
                                  size="sm"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setAddingSubTopicToId(null);
                                    resetSubTopicForm();
                                  }}
                                  className={`px-3 py-1 rounded text-xs ${colors.text.muted}`}
                                >
                                  Annulla
                                </button>
                                <button
                                  onClick={() => handleSaveSubTopic(topic.id)}
                                  disabled={!subTopicForm.name.trim() || createSubTopicMutation.isPending}
                                  className={`px-3 py-1 rounded text-xs ${colors.primary.gradient} text-white disabled:opacity-50`}
                                >
                                  {createSubTopicMutation.isPending ? '...' : 'Aggiungi'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAddingSubTopicToId(topic.id);
                                setEditingSubTopicId(null);
                                resetSubTopicForm();
                              }}
                              className={`w-full p-2 rounded-lg border border-dashed ${colors.border.primary} ${colors.text.muted} hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center gap-1 text-sm`}
                            >
                              <Plus className="w-4 h-4" />
                              Aggiungi sotto-argomento
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty State */}
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

          {/* Footer */}
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
    </Portal>
  );
}
