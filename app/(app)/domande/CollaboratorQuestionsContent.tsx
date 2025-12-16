'use client';

import { useState, useMemo } from 'react';
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
  Eye,
  Archive,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Star,
  Layers,
  User,
  Upload,
  Tag,
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

export default function CollaboratorQuestionsContent() {
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

  // Filter options
  const [showFilters, setShowFilters] = useState(false);

  // Action menus state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; text: string } | null>(null);

  // Get current user
  const { data: currentUser } = trpc.auth.me.useQuery();

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

  // Helpers
  const questions = questionsData?.questions ?? [];
  const pagination = questionsData?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

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
      ...(tagsData?.tags?.map((t) => ({ value: t.id, label: t.category ? `${t.category.name}: ${t.name}` : t.name })) ?? []),
    ],
    [tagsData?.tags]
  );

  // Check if user can edit/delete a question (only own questions)
  const canEditQuestion = (question: typeof questions[0]) => {
    return question.createdById === currentUser?.id;
  };

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
          <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.myQuestions ?? 0}</p>
                <p className={`text-sm ${colors.text.muted}`}>Le mie</p>
              </div>
            </div>
          </div>
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
                {[subjectId, topicId, type, status, difficulty].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

      {/* Questions Table */}
      <div className={`${colors.background.card} rounded-xl ${colors.effects.shadow.sm} overflow-visible`}>
        <div className="pb-16 overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className={`border-b ${colors.border.primary}`}>
                <th className={`px-4 py-3 text-left text-sm font-medium ${colors.text.secondary}`}>
                  Domanda
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${colors.text.secondary}`}>
                  Creatore
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden md:table-cell`}>
                  Materia
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden lg:table-cell`}>
                  Tipo
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden sm:table-cell`}>
                  Stato
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden xl:table-cell`}>
                  Difficoltà
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden lg:table-cell`}>
                  Tag
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${colors.text.secondary} hidden xl:table-cell`}>
                  Uso
                </th>
                <th className={`px-4 py-3 text-right text-sm font-medium ${colors.text.secondary}`}>
                  Azioni
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
                    <td className="px-4 py-3">
                      <div className="max-w-sm">
                        <p className={`font-medium ${colors.text.primary} line-clamp-2`}>
                          {question.text}
                        </p>
                        {question.legacyTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {question.legacyTags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-1.5 py-0.5 rounded ${colors.background.secondary} ${colors.text.muted}`}
                              >
                                {tag}
                              </span>
                            ))}
                            {question.legacyTags.length > 3 && (
                              <span className={`text-xs ${colors.text.muted}`}>
                                +{question.legacyTags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {question.createdBy ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            question.createdBy.role === 'ADMIN' 
                              ? colors.roles.admin.softBg
                              : colors.roles.collaborator.softBg
                          }`}>
                            <span className={`text-xs font-medium ${
                              question.createdBy.role === 'ADMIN'
                                ? colors.roles.admin.text
                                : colors.roles.collaborator.text
                            }`}>
                              {question.createdBy.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-sm ${
                              question.createdById === currentUser?.id 
                                ? 'font-medium ' + colors.roles.collaborator.text
                                : colors.text.secondary
                            }`}>
                              {question.createdById === currentUser?.id ? 'Tu' : question.createdBy.name}
                            </span>
                            <span className={`text-xs ${
                              question.createdBy.role === 'ADMIN'
                                ? colors.roles.admin.text
                                : colors.roles.collaborator.text
                            }`}>
                              {question.createdBy.role === 'ADMIN' ? 'Admin' : 'Collaboratore'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className={`text-sm ${colors.text.muted}`}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {question.subject ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: question.subject.color ?? '#6366f1' }}
                          />
                          <span className={`text-sm ${colors.text.primary}`}>
                            {question.subject.name}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-sm ${colors.text.muted}`}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full ${typeColors[question.type as QuestionType]}`}>
                        {questionTypeLabels[question.type as QuestionType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[question.status as QuestionStatus]}`}>
                        {questionStatusLabels[question.status as QuestionStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[question.difficulty as DifficultyLevel]}`}>
                        {difficultyLabels[question.difficulty as DifficultyLevel]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {question.questionTags && question.questionTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {question.questionTags.slice(0, 2).map((qt: { tag: { id: string; name: string; color: string | null; category: { id: string; name: string; color: string } | null } }) => (
                            <span
                              key={qt.tag.id}
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: qt.tag.color ? `${qt.tag.color}20` : (qt.tag.category?.color ? `${qt.tag.category.color}20` : '#6366f120'),
                                color: qt.tag.color || qt.tag.category?.color || '#6366f1',
                              }}
                              title={qt.tag.category ? `${qt.tag.category.name}: ${qt.tag.name}` : qt.tag.name}
                            >
                              {qt.tag.name}
                            </span>
                          ))}
                          {question.questionTags.length > 2 && (
                            <span className={`text-xs ${colors.text.muted}`}>
                              +{question.questionTags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={`text-xs ${colors.text.muted} flex items-center gap-1`}>
                          <Tag className="w-3 h-3" />
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400" title="Usata in simulazioni">
                          <Layers className="w-4 h-4" />
                          {question._count.simulationQuestions}
                        </span>
                        <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400" title="Preferiti">
                          <Star className="w-4 h-4" />
                          {question._count.favorites}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPosition({ top: rect.bottom + 4, left: rect.right - 192 });
                          setOpenMenuId(openMenuId === question.id ? null : question.id);
                        }}
                        className={`p-2 rounded-lg ${colors.background.tertiary} hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors`}
                      >
                        <MoreVertical className={`w-5 h-5 ${colors.text.secondary}`} />
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
              const isOwner = canEditQuestion(question);
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
                  {isOwner && (
                    <>
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
                  )}
                  {!isOwner && (
                    <button
                      onClick={() => {
                        duplicateMutation.mutate({ id: question.id });
                        setOpenMenuId(null);
                      }}
                      disabled={duplicateMutation.isPending}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    >
                      <Copy className="w-4 h-4" />
                      Duplica per me
                    </button>
                  )}
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
    </div>
  );
}
