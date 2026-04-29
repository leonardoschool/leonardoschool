'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Portal } from '@/components/ui/Portal';
import Link from 'next/link';
import {
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Edit2,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  Target,
  Layers,
  User,
  Calendar,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  Archive,
  Globe,
} from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import type { SimulationStatus } from '@/lib/validations/simulationValidation';

// --- Types ---

interface TemplateSection {
  id: string;
  name: string;
  durationMinutes?: number;
  questionCount?: number;
  subjectId?: string | null;
  order?: number;
}

interface LinkedSimulation {
  id: string;
  title: string;
  status: string;
  type: string;
  createdAt: string | Date;
}

interface Template {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  createdById: string | null;
  creatorRole: string | null;
  durationMinutes: number;
  totalQuestions: number;
  showResults: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  randomizeOrder: boolean;
  randomizeAnswers: boolean;
  useQuestionPoints: boolean;
  correctPoints: number;
  wrongPoints: number;
  blankPoints: number;
  maxScore: number | null;
  passingScore: number | null;
  isRepeatable: boolean;
  maxAttempts: number | null;
  hasSections: boolean;
  sections: unknown;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: { id: string; name: string; role: string; email?: string } | null;
  _count?: { simulationsCreated: number };
  simulationsCreated?: LinkedSimulation[];
}

// --- Constants ---

const statusLabels: Record<string, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicato',
  ARCHIVED: 'Archiviato',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-200 text-gray-800 dark:bg-gray-400 dark:text-gray-900',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ARCHIVED: 'bg-slate-200 text-slate-800 dark:bg-slate-400 dark:text-slate-900',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Amministratore',
  COLLABORATOR: 'Collaboratore',
  STUDENT: 'Studente',
};

const simulationTypeLabels: Record<string, string> = {
  OFFICIAL: 'Ufficiale',
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

// --- Component ---

export default function TemplatesContent() {
  const { data: me } = trpc.auth.me.useQuery();
  const userRole = (me?.role as 'ADMIN' | 'COLLABORATOR') ?? 'COLLABORATOR';
  const userId = me?.id ?? '';

  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SimulationStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // UI state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; title: string } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch templates list
  const { data, isLoading, refetch } = trpc.simulationTemplates.list.useQuery({
    page,
    pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Fetch expanded template detail (with linked simulations)
  const { data: detailData, isLoading: detailLoading } = trpc.simulationTemplates.get.useQuery(
    { id: expandedId! },
    { enabled: !!expandedId }
  );

  // Mutations
  const deleteMutation = trpc.simulationTemplates.delete.useMutation({
    onSuccess: () => {
      showSuccess('Eliminato', 'Template eliminato con successo');
      utils.simulationTemplates.list.invalidate();
      setDeleteConfirm(null);
      if (expandedId === deleteConfirm?.id) setExpandedId(null);
    },
    onError: handleMutationError,
  });

  const updateStatusMutation = trpc.simulationTemplates.update.useMutation({
    onSuccess: (_, variables) => {
      const vars = variables as { status?: string } | undefined;
      const label = vars?.status === 'ARCHIVED' ? 'archiviato' : 'ripristinato';
      showSuccess('Aggiornato', `Template ${label} con successo`);
      utils.simulationTemplates.list.invalidate();
      if (expandedId) utils.simulationTemplates.get.invalidate({ id: expandedId });
      setArchiveConfirm(null);
    },
    onError: handleMutationError,
  });

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuOpen = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      return;
    }
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuHeight = 200;
    const menuWidth = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;
    const top = openUpward
      ? rect.top + window.scrollY - menuHeight - 4
      : rect.bottom + window.scrollY + 4;
    const left = spaceRight < menuWidth + 16
      ? rect.right + window.scrollX - menuWidth
      : rect.right + window.scrollX - menuWidth;
    setMenuPosition({ top, left });
    setOpenMenuId(id);
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const canEditOrDelete = (template: Template) => {
    if (userRole === 'ADMIN') return true;
    return template.createdById === userId;
  };

  const templates = data?.templates ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      {/* Filters */}
      <div className={`rounded-xl p-4 mb-6 ${colors.background.card} border ${colors.border.light}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca template..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-red-500/30`}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.hover} ${colors.text.secondary}`}
          >
            <Filter className="w-4 h-4" />
            Filtri
            {statusFilter && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${colors.text.secondary}`}>Stato</label>
              <CustomSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v as SimulationStatus | ''); setPage(1); }}
                options={[
                  { value: '', label: 'Tutti gli stati' },
                  { value: 'DRAFT', label: 'Bozza' },
                  { value: 'PUBLISHED', label: 'Pubblicato' },
                  { value: 'ARCHIVED', label: 'Archiviato' },
                ]}
              />
            </div>
            {(statusFilter) && (
              <div className="flex items-end">
                <button
                  onClick={() => { setStatusFilter(''); setPage(1); }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm ${colors.text.secondary} border ${colors.border.light} hover:bg-gray-100 dark:hover:bg-slate-700`}
                >
                  <X className="w-3 h-3" /> Azzera filtri
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : templates.length === 0 ? (
        <div className={`rounded-xl p-12 text-center ${colors.background.card} border ${colors.border.light}`}>
          <FileText className={`w-12 h-12 mx-auto mb-4 ${colors.text.muted}`} />
          <p className={`font-medium mb-1 ${colors.text.primary}`}>Nessun template trovato</p>
          <p className={`text-sm ${colors.text.secondary}`}>
            {search || statusFilter ? 'Prova a modificare i filtri di ricerca.' : 'Crea il tuo primo template con il pulsante "Nuovo Template".'}
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border ${colors.border.light} overflow-hidden ${colors.background.card}`}>
          {/* Table header */}
          <div className={`hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide ${colors.text.muted} border-b ${colors.border.light} ${colors.background.secondary}`}>
            <span>Template</span>
            <span className="text-center">Domande</span>
            <span className="text-center">Sezioni</span>
            <span className="text-center">Durata</span>
            <span className="text-center">Stato</span>
            <span className="text-center">Azioni</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {templates.map((template) => {
              const sections = Array.isArray(template.sections) ? (template.sections as unknown as TemplateSection[]) : [];
              const isExpanded = expandedId === template.id;
              const detail = isExpanded ? detailData : undefined;

              return (
                <div key={template.id}>
                  {/* Main row */}
                  <div
                    className={`grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 items-center transition-colors cursor-pointer ${isExpanded ? `${colors.background.secondary}` : `hover:${colors.background.secondary}`}`}
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                    role="button"
                    aria-expanded={isExpanded}
                  >
                    {/* Title + creator */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.primary.softBg}`}>
                        <FileText className={`w-4 h-4 ${colors.primary.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${colors.text.primary}`}>{template.title}</p>
                        {template.description && (
                          <p className={`text-xs truncate mt-0.5 ${colors.text.secondary}`}>{template.description}</p>
                        )}
                        <div className={`flex items-center gap-2 mt-1 text-xs ${colors.text.muted}`}>
                          <User className="w-3 h-3" />
                          <span>{template.createdBy?.name ?? '—'}</span>
                          {template.createdBy?.role && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors.background.tertiary} ${colors.text.secondary}`}>
                              {roleLabels[template.createdBy.role] ?? template.createdBy.role}
                            </span>
                          )}
                          <span>·</span>
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(template.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Question count */}
                    <div className="flex md:justify-center items-center gap-1.5">
                      <Target className={`w-4 h-4 ${colors.text.muted}`} />
                      <span className={`text-sm font-medium ${colors.text.primary}`}>{template.totalQuestions}</span>
                    </div>

                    {/* Section count */}
                    <div className="flex md:justify-center items-center gap-1.5">
                      <Layers className={`w-4 h-4 ${colors.text.muted}`} />
                      <span className={`text-sm font-medium ${colors.text.primary}`}>{sections.length}</span>
                    </div>

                    {/* Duration */}
                    <div className="flex md:justify-center items-center gap-1.5">
                      <Clock className={`w-4 h-4 ${colors.text.muted}`} />
                      <span className={`text-sm ${colors.text.primary}`}>{formatDuration(template.durationMinutes)}</span>
                    </div>

                    {/* Status */}
                    <div className="flex md:justify-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[template.status] ?? ''}`}>
                        {statusLabels[template.status] ?? template.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex md:justify-center items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : template.id)}
                        className={`p-1.5 rounded-lg ${colors.text.secondary} hover:${colors.background.secondary} transition-colors`}
                        aria-label={isExpanded ? 'Chiudi dettaglio' : 'Apri dettaglio'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => handleMenuOpen(template.id, e)}
                        className={`p-1.5 rounded-lg ${colors.text.secondary} hover:${colors.background.secondary} transition-colors`}
                        aria-label="Azioni"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className={`px-6 pb-6 border-t ${colors.border.light} ${colors.background.secondary}`}>
                      {detailLoading ? (
                        <div className="flex justify-center py-8">
                          <Spinner size="md" />
                        </div>
                      ) : detail ? (
                        <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left: settings + sections */}
                          <div className="space-y-4">
                            {/* Settings grid */}
                            <div>
                              <h3 className={`text-sm font-semibold mb-3 ${colors.text.primary}`}>Impostazioni</h3>
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                {[
                                  { label: 'Mostra risultati', value: detail.showResults },
                                  { label: 'Mostra risposte corrette', value: detail.showCorrectAnswers },
                                  { label: 'Revisione permessa', value: detail.allowReview },
                                  { label: 'Ordine casuale', value: detail.randomizeOrder },
                                  { label: 'Risposte casuali', value: detail.randomizeAnswers },
                                  { label: 'Punti per domanda', value: detail.useQuestionPoints },
                                  { label: 'Ripetibile', value: detail.isRepeatable },
                                ].map(({ label, value }) => (
                                  <div key={label} className="flex items-center justify-between">
                                    <span className={colors.text.secondary}>{label}</span>
                                    {value ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <X className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                ))}
                                <div className="flex items-center justify-between">
                                  <span className={colors.text.secondary}>Punti corretti</span>
                                  <span className={`font-medium ${colors.text.primary}`}>{detail.correctPoints}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={colors.text.secondary}>Punti errati</span>
                                  <span className={`font-medium ${colors.text.primary}`}>{detail.wrongPoints}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={colors.text.secondary}>Punti bianchi</span>
                                  <span className={`font-medium ${colors.text.primary}`}>{detail.blankPoints}</span>
                                </div>
                                {detail.maxScore != null && (
                                  <div className="flex items-center justify-between">
                                    <span className={colors.text.secondary}>Punteggio max</span>
                                    <span className={`font-medium ${colors.text.primary}`}>{detail.maxScore}</span>
                                  </div>
                                )}
                                {detail.passingScore != null && (
                                  <div className="flex items-center justify-between">
                                    <span className={colors.text.secondary}>Punteggio minimo</span>
                                    <span className={`font-medium ${colors.text.primary}`}>{detail.passingScore}</span>
                                  </div>
                                )}
                                {detail.maxAttempts != null && (
                                  <div className="flex items-center justify-between">
                                    <span className={colors.text.secondary}>Max tentativi</span>
                                    <span className={`font-medium ${colors.text.primary}`}>{detail.maxAttempts}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Sections */}
                            {Array.isArray(detail.sections) && (detail.sections as unknown as TemplateSection[]).length > 0 && (
                              <div>
                                <h3 className={`text-sm font-semibold mb-3 ${colors.text.primary}`}>
                                  Sezioni ({(detail.sections as unknown as TemplateSection[]).length})
                                </h3>
                                <div className="space-y-2">
                                  {(detail.sections as unknown as TemplateSection[]).map((section, idx) => (
                                    <div
                                      key={section.id ?? idx}
                                      className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colors.border.light} ${colors.background.card}`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${colors.primary.softBg} ${colors.primary.text}`}>
                                          {idx + 1}
                                        </span>
                                        <span className={`text-sm font-medium truncate ${colors.text.primary}`}>{section.name}</span>
                                      </div>
                                      <div className={`flex items-center gap-3 text-xs ${colors.text.muted} flex-shrink-0`}>
                                        <span className="flex items-center gap-1">
                                          <Target className="w-3 h-3" />
                                          {section.questionCount ?? 0}
                                        </span>
                                        {section.durationMinutes ? (
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(section.durationMinutes)}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: linked simulations + creator */}
                          <div className="space-y-4">
                            {/* Creator info */}
                            <div>
                              <h3 className={`text-sm font-semibold mb-3 ${colors.text.primary}`}>Creatore</h3>
                              <div className={`flex items-center gap-3 p-3 rounded-lg border ${colors.border.light} ${colors.background.card}`}>
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${colors.background.tertiary}`}>
                                  <User className={`w-4 h-4 ${colors.text.secondary}`} />
                                </div>
                                <div>
                                  <p className={`font-medium text-sm ${colors.text.primary}`}>{detail.createdBy?.name ?? '—'}</p>
                                  {detail.createdBy?.email && (
                                    <p className={`text-xs ${colors.text.secondary}`}>{detail.createdBy.email}</p>
                                  )}
                                  {detail.createdBy?.role && (
                                    <p className={`text-xs ${colors.text.muted}`}>{roleLabels[detail.createdBy.role] ?? detail.createdBy.role}</p>
                                  )}
                                </div>
                                <div className="ml-auto text-right">
                                  <p className={`text-xs ${colors.text.muted}`}>Creato il</p>
                                  <p className={`text-xs font-medium ${colors.text.secondary}`}>{formatDate(detail.createdAt)}</p>
                                  <p className={`text-xs ${colors.text.muted}`}>Aggiornato il</p>
                                  <p className={`text-xs font-medium ${colors.text.secondary}`}>{formatDate(detail.updatedAt)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Linked simulations */}
                            <div>
                              <h3 className={`text-sm font-semibold mb-3 ${colors.text.primary}`}>
                                Simulazioni create da questo template
                                {detail.simulationsCreated && detail.simulationsCreated.length > 0 && (
                                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${colors.primary.softBg} ${colors.primary.text}`}>
                                    {detail.simulationsCreated.length}
                                  </span>
                                )}
                              </h3>
                              {!detail.simulationsCreated || detail.simulationsCreated.length === 0 ? (
                                <div className={`text-sm text-center py-6 rounded-lg border ${colors.border.light} ${colors.background.card} ${colors.text.muted}`}>
                                  <Globe className="w-6 h-6 mx-auto mb-2 opacity-40" />
                                  Nessuna simulazione creata da questo template
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                  {detail.simulationsCreated.map((sim) => (
                                    <Link
                                      key={sim.id}
                                      href={`/simulazioni/${sim.id}`}
                                      className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colors.border.light} ${colors.background.card} hover:${colors.background.secondary} transition-colors group`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className={`w-4 h-4 flex-shrink-0 ${colors.text.muted}`} />
                                        <span className={`text-sm truncate ${colors.text.primary} group-hover:${colors.primary.text}`}>
                                          {sim.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-xs ${colors.text.muted}`}>{simulationTypeLabels[sim.type] ?? sim.type}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColors[sim.status] ?? ''}`}>
                                          {statusLabels[sim.status] ?? sim.status}
                                        </span>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className={`text-sm ${colors.text.secondary}`}>
            {pagination.total} template totali
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`p-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-40 hover:${colors.background.hover}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm ${colors.text.primary}`}>
              Pagina {page} di {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className={`p-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-40 hover:${colors.background.hover}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Context menu */}
      {openMenuId && menuPosition && (
        <Portal>
          <div
            ref={menuRef}
            style={{ position: 'absolute', top: menuPosition.top, left: menuPosition.left, zIndex: 9999 }}
            className={`w-52 rounded-xl shadow-xl border ${colors.border.light} ${colors.background.card} overflow-hidden`}
          >
            {(() => {
              const template = templates.find(t => t.id === openMenuId);
              if (!template) return null;
              const canAct = canEditOrDelete(template as unknown as Template);
              return (
                <div className="py-1">
                  {/* View detail */}
                  <button
                    onClick={() => {
                      setExpandedId(expandedId === openMenuId ? null : openMenuId);
                      setOpenMenuId(null);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${colors.text.secondary} hover:${colors.background.hover} transition-colors`}
                  >
                    <Eye className="w-4 h-4" />
                    {expandedId === openMenuId ? 'Chiudi dettaglio' : 'Visualizza dettaglio'}
                  </button>

                  {/* Edit */}
                  {canAct && (
                    <Link
                      href={`/simulazioni/nuova?mode=template&editId=${openMenuId}`}
                      onClick={() => setOpenMenuId(null)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${colors.text.secondary} hover:${colors.background.hover} transition-colors`}
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifica
                    </Link>
                  )}

                  {/* Archive / Restore */}
                  {canAct && (
                    <>
                      {template.status !== 'ARCHIVED' ? (
                        <button
                          onClick={() => {
                            setArchiveConfirm({ id: template.id, title: template.title });
                            setOpenMenuId(null);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${colors.text.secondary} hover:${colors.background.hover} transition-colors`}
                        >
                          <Archive className="w-4 h-4" />
                          Archivia
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            updateStatusMutation.mutate({ id: template.id, status: 'PUBLISHED' });
                            setOpenMenuId(null);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${colors.text.secondary} hover:${colors.background.hover} transition-colors`}
                        >
                          <Globe className="w-4 h-4" />
                          Ripristina
                        </button>
                      )}
                    </>
                  )}

                  {/* Delete */}
                  {canAct && (
                    <>
                      <div className={`my-1 border-t ${colors.border.light}`} />
                      <button
                        onClick={() => {
                          setDeleteConfirm({ id: template.id, title: template.title });
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Elimina
                      </button>
                    </>
                  )}

                  {!canAct && (
                    <p className={`px-4 py-2 text-xs ${colors.text.muted}`}>Solo il creatore o un admin può modificare questo template.</p>
                  )}
                </div>
              );
            })()}
          </div>
        </Portal>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Elimina template"
          message={`Sei sicuro di voler eliminare il template "${deleteConfirm.title}"? Questa azione non può essere annullata.`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id: deleteConfirm.id })}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Archive confirmation */}
      {archiveConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Archivia template"
          message={`Archiviare il template "${archiveConfirm.title}"? I collaboratori non potranno più usarlo per creare simulazioni.`}
          confirmText="Archivia"
          cancelText="Annulla"
          variant="warning"
          isLoading={updateStatusMutation.isPending}
          onConfirm={() => updateStatusMutation.mutate({ id: archiveConfirm.id, status: 'ARCHIVED' })}
          onCancel={() => setArchiveConfirm(null)}
        />
      )}
    </div>
  );
}
