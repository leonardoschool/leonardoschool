'use client';

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Portal } from '@/components/ui/Portal';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Archive,
  Check,
  X,
  Upload,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  BookOpen,
  FileText,
  Eye,
  Tag,
  Download,
} from 'lucide-react';
import {
  questionTypeLabels,
  questionStatusLabels,
  difficultyLabels,
  type QuestionType,
  type QuestionStatus,
  type DifficultyLevel,
} from '@/lib/validations/questionValidation';

// Question type colors
const typeColors: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  MULTIPLE_CHOICE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  OPEN_TEXT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// Status colors
const statusColors: Record<QuestionStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ARCHIVED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// Difficulty colors
const difficultyColors: Record<DifficultyLevel, string> = {
  EASY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  HARD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function AdminQuestionsContent() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Filters state
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [topicId, setTopicId] = useState<string>('');
  const [type, setType] = useState<QuestionType | ''>('');
  const [status, setStatus] = useState<QuestionStatus | ''>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | ''>('');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkSubjectSelect, setShowBulkSubjectSelect] = useState(false);
  const [showBulkTagSelect, setShowBulkTagSelect] = useState(false);
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'remove'>('add');
  const [selectedBulkTagIds, setSelectedBulkTagIds] = useState<Set<string>>(new Set());

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Action menus state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; text: string } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Close menu on scroll
  useEffect(() => {
    if (!openMenuId) return;
    
    const handleScroll = () => {
      setOpenMenuId(null);
      setMenuPosition(null);
    };
    
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [openMenuId]);

  // Close bulk subject dropdown on click outside
  useEffect(() => {
    if (!showBulkSubjectSelect) return;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-bulk-subject-dropdown]')) {
        setShowBulkSubjectSelect(false);
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showBulkSubjectSelect]);

  // Close bulk tag dropdown on click outside
  useEffect(() => {
    if (!showBulkTagSelect) return;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-bulk-tag-dropdown]')) {
        setShowBulkTagSelect(false);
        setSelectedBulkTagIds(new Set());
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showBulkTagSelect]);

  // Fetch questions
  const { data: questionsData, isLoading } = trpc.questions.getQuestions.useQuery({
    page,
    pageSize,
    search: search || undefined,
    subjectId: subjectId || undefined,
    topicId: topicId || undefined,
    type: type || undefined,
    status: status || undefined,
    difficulty: difficulty || undefined,
    tagIds: selectedTagId ? [selectedTagId] : undefined,
    includeAnswers: false,
    includeDrafts: true,
    includeArchived: true,
  });

  // Fetch subjects for filter
  const { data: subjects } = trpc.materials.getAllSubjects.useQuery();

  // Fetch topics for filter (when subject is selected)
  const { data: topics } = trpc.materials.getTopics.useQuery(
    { subjectId: subjectId, includeInactive: true },
    { enabled: !!subjectId }
  );

  // Fetch tags for filter
  const { data: tagsData } = trpc.questionTags.getTags.useQuery({
    includeInactive: false,
    pageSize: 200,
  });

  // Fetch stats
  const { data: stats } = trpc.questions.getQuestionStats.useQuery();

  // Mutations
  const deleteMutation = trpc.questions.deleteQuestion.useMutation({
    onSuccess: () => {
      showSuccess('Domanda eliminata', 'La domanda è stata eliminata con successo.');
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
      setDeleteConfirm(null);
    },
    onError: handleMutationError,
  });

  const archiveMutation = trpc.questions.archiveQuestion.useMutation({
    onSuccess: () => {
      showSuccess('Azione completata', 'Lo stato della domanda è stato aggiornato.');
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
    },
    onError: handleMutationError,
  });

  const publishMutation = trpc.questions.publishQuestion.useMutation({
    onSuccess: () => {
      showSuccess('Azione completata', 'Lo stato di pubblicazione è stato aggiornato.');
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
    },
    onError: handleMutationError,
  });

  const duplicateMutation = trpc.questions.duplicateQuestion.useMutation({
    onSuccess: () => {
      showSuccess('Domanda duplicata', 'È stata creata una copia della domanda.');
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
    },
    onError: handleMutationError,
  });

  const bulkDeleteMutation = trpc.questions.bulkDelete.useMutation({
    onSuccess: (result) => {
      showSuccess(
        'Eliminazione completata',
        `${result.deleted} domande eliminate${result.skipped > 0 ? `, ${result.skipped} saltate (in uso)` : ''}.`
      );
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
    },
    onError: handleMutationError,
  });

  const bulkStatusMutation = trpc.questions.bulkUpdateStatus.useMutation({
    onSuccess: (result) => {
      showSuccess('Stato aggiornato', `${result.updated} domande aggiornate.`);
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
      setSelectedIds(new Set());
    },
    onError: handleMutationError,
  });

  const bulkSubjectMutation = trpc.questions.bulkUpdateSubject.useMutation({
    onSuccess: (result) => {
      showSuccess('Materia aggiornata', `${result.updated} domande spostate in "${result.subjectName}".`);
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
      setSelectedIds(new Set());
      setShowBulkSubjectSelect(false);
    },
    onError: handleMutationError,
  });

  const bulkTagMutation = trpc.questions.bulkAddTags.useMutation({
    onSuccess: (result) => {
      const modeText = bulkTagMode === 'add' ? 'aggiunti a' : 'rimossi da';
      showSuccess('Tag aggiornati', `Tag ${modeText} ${result.updated} domande: ${result.tags}.`);
      utils.questions.getQuestions.invalidate();
      setSelectedIds(new Set());
      setShowBulkTagSelect(false);
      setSelectedBulkTagIds(new Set());
    },
    onError: handleMutationError,
  });

  // Export function
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const result = await utils.questions.exportQuestionsCSV.fetch({
        ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
        subjectId: subjectId || undefined,
        status: status || undefined,
        type: type || undefined,
        difficulty: difficulty || undefined,
      });

      // Create and download the CSV file
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);

      showSuccess(
        'Esportazione completata',
        `${result.count} domande esportate in ${result.filename}`
      );
    } catch {
      handleMutationError(new Error('Errore durante l\'esportazione'));
    } finally {
      setIsExporting(false);
    }
  };

  // Helpers
  const questions = useMemo(() => questionsData?.questions ?? [], [questionsData?.questions]);
  const pagination = questionsData?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  const allSelected = useMemo(
    () => questions.length > 0 && questions.every((q) => selectedIds.has(q.id)),
    [questions, selectedIds]
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearFilters = () => {
    setSearch('');
    setSubjectId('');
    setTopicId('');
    setType('');
    setStatus('');
    setDifficulty('');
    setSelectedTagId('');
    setPage(1);
  };

  const hasActiveFilters = search || subjectId || topicId || type || status || difficulty || selectedTagId;

  // Get unique tags from selected questions for replace mode
  const selectedQuestionsTags = useMemo(() => {
    if (selectedIds.size === 0) return [];
    
    const tagsMap = new Map<string, { id: string; name: string; color: string | null; categoryName: string | null; categoryColor: string | null }>();
    
    questions
      .filter(q => selectedIds.has(q.id))
      .forEach(q => {
        q.questionTags?.forEach((qt: { tag: { id: string; name: string; color: string | null; category: { id: string; name: string; color: string } | null } }) => {
          if (!tagsMap.has(qt.tag.id)) {
            tagsMap.set(qt.tag.id, {
              id: qt.tag.id,
              name: qt.tag.name,
              color: qt.tag.color,
              categoryName: qt.tag.category?.name || null,
              categoryColor: qt.tag.category?.color || null,
            });
          }
        });
      });
    
    return Array.from(tagsMap.values());
  }, [questions, selectedIds]);

  // Subject options for select
  const subjectOptions = useMemo(
    () => [
      { value: '', label: 'Tutte le materie' },
      ...(subjects?.map((s) => ({ value: s.id, label: s.name })) ?? []),
    ],
    [subjects]
  );

  // Topic options for select
  const topicOptions = useMemo(
    () => [
      { value: '', label: 'Tutti gli argomenti' },
      ...(topics?.map((t) => ({ value: t.id, label: t.name })) ?? []),
    ],
    [topics]
  );

  // Tag options for select
  const tagOptions = useMemo(
    () => [
      { value: '', label: 'Tutti i tag' },
      ...(tagsData?.tags?.map((t) => ({
        value: t.id || '',
        label: t.category?.name ? `${t.category.name} > ${t.name}` : t.name || '',
      })) ?? []),
    ],
    [tagsData]
  );

  if (isLoading && !questionsData) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Gestione Domande</h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Crea e gestisci le domande per simulazioni e quiz
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors disabled:opacity-50`}
            title={selectedIds.size > 0 ? `Esporta ${selectedIds.size} selezionate` : 'Esporta tutte (filtrate)'}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isExporting ? 'Esportando...' : selectedIds.size > 0 ? `Esporta (${selectedIds.size})` : 'Esporta'}
            </span>
          </button>
          <Link
            href="/domande/importa"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors`}
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importa</span>
          </Link>
          <Link
            href="/domande/nuova"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity`}
          >
            <Plus className="w-4 h-4" />
            Nuova Domanda
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${colors.primary.softBg} flex items-center justify-center`}>
                <FileText className={`w-5 h-5 ${colors.primary.text}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.total}</p>
                <p className={`text-sm ${colors.text.muted}`}>Totale</p>
              </div>
            </div>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.published}</p>
                <p className={`text-sm ${colors.text.muted}`}>Pubblicate</p>
              </div>
            </div>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.draft}</p>
                <p className={`text-sm ${colors.text.muted}`}>Bozze</p>
              </div>
            </div>
          </div>
          <Link
            href="/domande/segnalazioni"
            className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm} hover:ring-2 hover:ring-amber-400 transition-shadow`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.pendingFeedbacks}</p>
                <p className={`text-sm ${colors.text.muted}`}>Segnalazioni</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Search and Filters */}
      <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
            <input
              type="text"
              placeholder="Cerca domande..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
              hasActiveFilters
                ? `${colors.primary.border} ${colors.primary.text}`
                : `${colors.border.primary} ${colors.text.secondary}`
            } hover:${colors.background.secondary} transition-colors`}
          >
            <Filter className="w-4 h-4" />
            Filtri
            {hasActiveFilters && (
              <span className={`w-5 h-5 rounded-full ${colors.primary.bg} text-white text-xs flex items-center justify-center`}>
                {[subjectId, topicId, type, status, difficulty, selectedTagId].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <CustomSelect
                label="Materia"
                options={subjectOptions}
                value={subjectId}
                onChange={(val) => {
                  setSubjectId(val);
                  setTopicId('');
                  setPage(1);
                }}
              />
              <CustomSelect
                label="Argomento"
                options={topicOptions}
                value={topicId}
                onChange={(val) => {
                  setTopicId(val);
                  setPage(1);
                }}
                disabled={!subjectId}
              />
              <CustomSelect
                label="Tipo"
                options={[
                  { value: '', label: 'Tutti i tipi' },
                  { value: 'SINGLE_CHOICE', label: questionTypeLabels.SINGLE_CHOICE },
                  { value: 'MULTIPLE_CHOICE', label: questionTypeLabels.MULTIPLE_CHOICE },
                  { value: 'OPEN_TEXT', label: questionTypeLabels.OPEN_TEXT },
                ]}
                value={type}
                onChange={(val) => {
                  setType(val as QuestionType | '');
                  setPage(1);
                }}
              />
              <CustomSelect
                label="Stato"
                options={[
                  { value: '', label: 'Tutti gli stati' },
                  { value: 'DRAFT', label: questionStatusLabels.DRAFT },
                  { value: 'PUBLISHED', label: questionStatusLabels.PUBLISHED },
                  { value: 'ARCHIVED', label: questionStatusLabels.ARCHIVED },
                ]}
                value={status}
                onChange={(val) => {
                  setStatus(val as QuestionStatus | '');
                  setPage(1);
                }}
              />
              <CustomSelect
                label="Difficoltà"
                options={[
                  { value: '', label: 'Tutte' },
                  { value: 'EASY', label: difficultyLabels.EASY },
                  { value: 'MEDIUM', label: difficultyLabels.MEDIUM },
                  { value: 'HARD', label: difficultyLabels.HARD },
                ]}
                value={difficulty}
                onChange={(val) => {
                  setDifficulty(val as DifficultyLevel | '');
                  setPage(1);
                }}
              />
              <CustomSelect
                label="Tag"
                options={tagOptions}
                value={selectedTagId}
                onChange={(val) => {
                  setSelectedTagId(val);
                  setPage(1);
                }}
              />
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className={`text-sm ${colors.primary.text} hover:underline`}
                >
                  Rimuovi tutti i filtri
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
          <span className={colors.text.secondary}>
            {selectedIds.size} domand{selectedIds.size === 1 ? 'a' : 'e'} selezionat{selectedIds.size === 1 ? 'a' : 'e'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* Change Subject Dropdown */}
            <div className="relative" data-bulk-subject-dropdown>
              <button
                onClick={() => setShowBulkSubjectSelect(!showBulkSubjectSelect)}
                disabled={bulkSubjectMutation.isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm"
              >
                <BookOpen className="w-4 h-4" />
                Cambia Materia
              </button>
              {showBulkSubjectSelect && (
                <div className={`absolute top-full left-0 mt-1 z-50 min-w-[200px] ${colors.background.card} ${colors.effects.shadow.lg} rounded-lg border ${colors.border.primary} py-1`}>
                  {subjects?.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => {
                        bulkSubjectMutation.mutate({
                          ids: [...selectedIds],
                          subjectId: subject.id,
                        });
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:${colors.background.secondary} ${colors.text.primary} flex items-center gap-2 transition-colors`}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: subject.color || '#6b7280' }}
                      />
                      {subject.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Change Tag Dropdown */}
            <div className="relative" data-bulk-tag-dropdown>
              <button
                onClick={() => setShowBulkTagSelect(!showBulkTagSelect)}
                disabled={bulkTagMutation.isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-sm"
              >
                <Tag className="w-4 h-4" />
                Cambia Tag
              </button>
              {showBulkTagSelect && (
                <div className={`absolute top-full left-0 mt-1 z-50 min-w-[280px] max-h-[400px] overflow-y-auto ${colors.background.card} ${colors.effects.shadow.lg} rounded-lg border ${colors.border.primary} py-2`}>
                  {/* Mode toggle */}
                  <div className="px-4 pb-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                    <label className={`text-xs font-medium ${colors.text.muted} block mb-1.5`}>
                      Modalità
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setBulkTagMode('add'); }}
                        className={`flex-1 text-xs px-2 py-1.5 rounded transition-colors ${
                          bulkTagMode === 'add'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                            : `${colors.background.secondary} ${colors.text.muted}`
                        }`}
                      >
                        Aggiungi
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setBulkTagMode('remove'); }}
                        className={`flex-1 text-xs px-2 py-1.5 rounded transition-colors ${
                          bulkTagMode === 'remove'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            : `${colors.background.secondary} ${colors.text.muted}`
                        }`}
                      >
                        Rimuovi
                      </button>
                    </div>
                    <p className={`text-xs ${colors.text.muted} mt-1`}>
                      {bulkTagMode === 'add' ? 'I tag selezionati verranno aggiunti' : 'I tag selezionati verranno rimossi'}
                    </p>
                  </div>
                  
                  {/* Tags list - show all tags in add mode, only selected questions' tags in remove mode */}
                  <div className="px-2">
                    {bulkTagMode === 'remove' && selectedQuestionsTags.length === 0 ? (
                      <p className={`text-xs ${colors.text.muted} text-center py-4`}>
                        Le domande selezionate non hanno tag
                      </p>
                    ) : (
                      (bulkTagMode === 'remove' ? selectedQuestionsTags : tagsData?.tags || []).map((tag) => {
                        const tagId = tag.id;
                        const tagName = tag.name;
                        const tagColor = tag.color || ('categoryColor' in tag ? tag.categoryColor : tag.category?.color) || '#6366f1';
                        const categoryName = 'categoryName' in tag ? tag.categoryName : tag.category?.name;
                        
                        return (
                          <button
                            key={tagId}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newSet = new Set(selectedBulkTagIds);
                              if (newSet.has(tagId!)) {
                                newSet.delete(tagId!);
                              } else {
                                newSet.add(tagId!);
                              }
                              setSelectedBulkTagIds(newSet);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg mb-1 flex items-center gap-2 transition-colors ${
                              selectedBulkTagIds.has(tagId!)
                                ? 'bg-purple-100 dark:bg-purple-900/40'
                                : `hover:${colors.background.secondary}`
                            } ${colors.text.primary}`}
                          >
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tagColor }}
                            />
                            <span className="flex-1 truncate">
                              {categoryName ? `${categoryName} > ${tagName}` : tagName}
                            </span>
                            {selectedBulkTagIds.has(tagId!) && (
                              <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  
                  {/* Apply button */}
                  {selectedBulkTagIds.size > 0 && (
                    <div className="px-4 pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => {
                          bulkTagMutation.mutate({
                            ids: [...selectedIds],
                            tagIds: [...selectedBulkTagIds],
                            mode: bulkTagMode,
                          });
                        }}
                        className={`w-full py-2 rounded-lg ${bulkTagMode === 'remove' ? 'bg-red-600' : colors.primary.bg} text-white text-sm font-medium hover:opacity-90 transition-opacity`}
                      >
                        {bulkTagMode === 'add' ? 'Aggiungi' : 'Rimuovi'} {selectedBulkTagIds.size} tag {bulkTagMode === 'add' ? 'a' : 'da'} {selectedIds.size} domande
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => bulkStatusMutation.mutate({ ids: [...selectedIds], status: 'PUBLISHED' })}
              disabled={bulkStatusMutation.isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm"
            >
              <Check className="w-4 h-4" />
              Pubblica
            </button>
            <button
              onClick={() => bulkStatusMutation.mutate({ ids: [...selectedIds], status: 'ARCHIVED' })}
              disabled={bulkStatusMutation.isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              <Archive className="w-4 h-4" />
              Archivia
            </button>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              disabled={bulkDeleteMutation.isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Elimina
            </button>
          </div>
        </div>
      )}

      {/* Questions Table */}
      <div className={`${colors.background.card} rounded-xl ${colors.effects.shadow.sm} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${colors.border.primary}`}>
                <th className="px-3 py-3 text-left w-12">
                  <button onClick={toggleSelectAll} className="p-1">
                    {allSelected ? (
                      <CheckSquare className={`w-5 h-5 ${colors.primary.text}`} />
                    ) : (
                      <Square className={`w-5 h-5 ${colors.text.muted}`} />
                    )}
                  </button>
                </th>
                <th className={`px-3 py-3 text-left text-sm font-medium ${colors.text.secondary} min-w-[200px]`}>
                  Domanda
                </th>
                <th className={`px-3 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden lg:table-cell min-w-[120px]`}>
                  Creatore
                </th>
                <th className={`px-3 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden md:table-cell min-w-[140px]`}>
                  Materia
                </th>
                <th className={`px-3 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden xl:table-cell`}>
                  Tipo
                </th>
                <th className={`px-3 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden sm:table-cell`}>
                  Stato
                </th>
                <th className={`px-3 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden xl:table-cell`}>
                  Difficoltà
                </th>
                <th className={`px-3 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden lg:table-cell min-w-[100px]`}>
                  Tag
                </th>
                <th className={`px-3 py-3 text-right text-sm font-medium ${colors.text.secondary} w-14`}>
                  
                </th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className={`w-12 h-12 ${colors.text.muted} mb-3`} />
                      <p className={`font-medium ${colors.text.primary}`}>Nessuna domanda trovata</p>
                      <p className={`text-sm ${colors.text.muted} mt-1`}>
                        {hasActiveFilters
                          ? 'Prova a modificare i filtri di ricerca'
                          : 'Inizia creando la tua prima domanda'}
                      </p>
                      {!hasActiveFilters && (
                        <Link
                          href="/domande/nuova"
                          className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity`}
                        >
                          <Plus className="w-4 h-4" />
                          Crea domanda
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                questions.map((question) => (
                  <tr
                    key={question.id}
                    className={`border-b ${colors.border.primary} hover:${colors.background.secondary} transition-colors`}
                  >
                    <td className="px-3 py-3">
                      <button onClick={() => toggleSelect(question.id)} className="p-1">
                        {selectedIds.has(question.id) ? (
                          <CheckSquare className={`w-5 h-5 ${colors.primary.text}`} />
                        ) : (
                          <Square className={`w-5 h-5 ${colors.text.muted}`} />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-[300px]">
                        <p 
                          className={`font-medium ${colors.text.primary} truncate`}
                          title={question.text}
                        >
                          {question.text}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {question.createdBy ? (
                        <span 
                          className={`text-sm ${colors.text.primary} truncate block max-w-[100px]`}
                          title={question.createdBy.name}
                        >
                          {question.createdBy.name}
                        </span>
                      ) : question.source ? (
                        <span 
                          className={`text-sm ${colors.text.muted} truncate block max-w-[100px] italic`}
                          title={`Importata: ${question.source}`}
                        >
                          {question.source}
                        </span>
                      ) : (
                        <span className={`text-sm ${colors.text.muted}`}>-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      {question.subject ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: question.subject.color ?? '#6366f1' }}
                          />
                          <span 
                            className={`text-sm ${colors.text.primary} truncate max-w-[120px]`}
                            title={question.subject.name}
                          >
                            {question.subject.name}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-sm ${colors.text.muted}`}>-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${typeColors[question.type as QuestionType]}`}>
                        {questionTypeLabels[question.type as QuestionType]}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusColors[question.status as QuestionStatus]}`}>
                        {questionStatusLabels[question.status as QuestionStatus]}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${difficultyColors[question.difficulty as DifficultyLevel]}`}>
                        {difficultyLabels[question.difficulty as DifficultyLevel]}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {question.questionTags && question.questionTags.length > 0 ? (
                        <span
                          className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap"
                          style={{
                            backgroundColor: question.questionTags[0].tag.color 
                              ? `${question.questionTags[0].tag.color}20` 
                              : (question.questionTags[0].tag.category?.color 
                                  ? `${question.questionTags[0].tag.category.color}20` 
                                  : '#6366f120'),
                            color: question.questionTags[0].tag.color 
                              || question.questionTags[0].tag.category?.color 
                              || '#6366f1',
                          }}
                          title={question.questionTags.map((qt: { tag: { name: string } }) => qt.tag.name).join(', ')}
                        >
                          {question.questionTags[0].tag.name}
                          {question.questionTags.length > 1 && ` +${question.questionTags.length - 1}`}
                        </span>
                      ) : (
                        <span className={`text-xs ${colors.text.muted}`}>-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const menuHeight = 260; // Approximate menu height
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const spaceAbove = rect.top;
                          
                          // Position above if not enough space below, otherwise below
                          const top = spaceBelow < menuHeight && spaceAbove > menuHeight
                            ? rect.top - menuHeight
                            : rect.bottom + 4;
                          
                          setMenuPosition({ top, left: rect.right - 192 });
                          setOpenMenuId(openMenuId === question.id ? null : question.id);
                        }}
                        className={`p-1.5 rounded-lg ${colors.background.tertiary} hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors`}
                      >
                        <MoreVertical className={`w-4 h-4 ${colors.text.secondary}`} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className={`px-4 py-3 border-t ${colors.border.primary} flex items-center justify-between`}>
            <p className={`text-sm ${colors.text.muted}`}>
              Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, pagination.total)} di{' '}
              {pagination.total} domande
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className={`p-2 rounded-lg border ${colors.border.primary} ${
                  page === 1 ? 'opacity-50 cursor-not-allowed' : `hover:${colors.background.secondary}`
                } transition-colors`}
              >
                <ChevronLeft className={`w-5 h-5 ${colors.text.muted}`} />
              </button>
              <span className={`text-sm ${colors.text.primary}`}>
                Pagina {page} di {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className={`p-2 rounded-lg border ${colors.border.primary} ${
                  page === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : `hover:${colors.background.secondary}`
                } transition-colors`}
              >
                <ChevronRight className={`w-5 h-5 ${colors.text.muted}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions Dropdown Portal */}
      {openMenuId && menuPosition && (
        <Portal>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setOpenMenuId(null)}
          />
          <div
            className={`fixed w-48 rounded-lg ${colors.background.card} shadow-xl border ${colors.border.primary} z-[101] py-1`}
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {(() => {
              const question = questions.find(q => q.id === openMenuId);
              if (!question) return null;
              return (
                <>
                  <Link
                    href={`/domande/${question.id}`}
                    className={`flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    onClick={() => setOpenMenuId(null)}
                  >
                    <Eye className="w-4 h-4" />
                    Visualizza
                  </Link>
                  <Link
                    href={`/domande/${question.id}/modifica`}
                    className={`flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    onClick={() => setOpenMenuId(null)}
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifica
                  </Link>
                  <button
                    onClick={() => {
                      duplicateMutation.mutate({ id: question.id });
                      setOpenMenuId(null);
                    }}
                    disabled={duplicateMutation.isPending}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <Copy className="w-4 h-4" />
                    Duplica
                  </button>
                  <hr className={`my-1 ${colors.border.primary}`} />
                  {question.status !== 'PUBLISHED' && (
                    <button
                      onClick={() => {
                        publishMutation.mutate({ id: question.id, publish: true });
                        setOpenMenuId(null);
                      }}
                      disabled={publishMutation.isPending}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Pubblica
                    </button>
                  )}
                  {question.status === 'PUBLISHED' && (
                    <button
                      onClick={() => {
                        publishMutation.mutate({ id: question.id, publish: false });
                        setOpenMenuId(null);
                      }}
                      disabled={publishMutation.isPending}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    >
                      <X className="w-4 h-4" />
                      Ritira
                    </button>
                  )}
                  {question.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => {
                        archiveMutation.mutate({ id: question.id, archive: true });
                        setOpenMenuId(null);
                      }}
                      disabled={archiveMutation.isPending}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    >
                      <Archive className="w-4 h-4" />
                      Archivia
                    </button>
                  )}
                  {question.status === 'ARCHIVED' && (
                    <button
                      onClick={() => {
                        archiveMutation.mutate({ id: question.id, archive: false });
                        setOpenMenuId(null);
                      }}
                      disabled={archiveMutation.isPending}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    >
                      <Check className="w-4 h-4" />
                      Ripristina
                    </button>
                  )}
                  <hr className={`my-1 ${colors.border.primary}`} />
                  <button
                    onClick={() => {
                      setDeleteConfirm({
                        id: question.id,
                        text: question.text.substring(0, 50) + (question.text.length > 50 ? '...' : ''),
                      });
                      setOpenMenuId(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Elimina
                  </button>
                </>
              );
            })()}
          </div>
        </Portal>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm.id })}
        title="Elimina domanda"
        message={`Sei sicuro di voler eliminare questa domanda?\n\n"${deleteConfirm?.text}"\n\nQuesta azione non può essere annullata.`}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={() => bulkDeleteMutation.mutate({ ids: [...selectedIds] })}
        title="Elimina domande selezionate"
        message={`Sei sicuro di voler eliminare ${selectedIds.size} domand${selectedIds.size === 1 ? 'a' : 'e'}?\n\nLe domande in uso in simulazioni verranno saltate.\nQuesta azione non può essere annullata.`}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
