'use client';

import { useState, useRef, useEffect } from 'react';
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
  Eye,
  Users,
  Clock,
  Target,
  Award,
  FileText,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';
import type { SimulationType, SimulationStatus } from '@/lib/validations/simulationValidation';

// Labels
const typeLabels: Record<SimulationType, string> = {
  OFFICIAL: 'Ufficiale',
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

const statusLabels: Record<SimulationStatus, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicata',
  CLOSED: 'Chiusa',
  ARCHIVED: 'Archiviata',
};

// Colors
const typeColors: Record<SimulationType, string> = {
  OFFICIAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PRACTICE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CUSTOM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  QUICK_QUIZ: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const statusColors: Record<SimulationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ARCHIVED: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export default function CollaboratorSimulationsPage() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Filters state
  const [search, setSearch] = useState('');
  const [type, setType] = useState<SimulationType | ''>('');
  const [status, setStatus] = useState<SimulationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Action menus state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch simulations
  const { data: simulationsData, isLoading } = trpc.simulations.getSimulations.useQuery({
    page,
    pageSize,
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
  });

  // Mutations
  const deleteMutation = trpc.simulations.delete.useMutation({
    onSuccess: () => {
      showSuccess('Eliminata', 'Simulazione eliminata con successo');
      utils.simulations.getSimulations.invalidate();
      setDeleteConfirm(null);
    },
    onError: handleMutationError,
  });

  const publishMutation = trpc.simulations.publish.useMutation({
    onSuccess: () => {
      showSuccess('Pubblicata', 'Simulazione pubblicata con successo');
      utils.simulations.getSimulations.invalidate();
    },
    onError: handleMutationError,
  });

  // Close menu on click outside
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
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX - 120,
    });
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const _formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return 'Illimitato';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const simulations = simulationsData?.simulations ?? [];
  const pagination = simulationsData?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Simulazioni</h1>
          <p className={`mt-1 text-sm ${colors.text.muted}`}>
            Crea e gestisci test ed esercitazioni ({pagination.total} totali)
          </p>
        </div>
        <Link
          href="/collaboratore/simulazioni/nuova"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 transition-opacity`}
        >
          <Plus className="w-4 h-4" />
          Nuova Simulazione
        </Link>
      </div>

      {/* Info banner */}
      <div className={`mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Nota:</strong> Puoi creare esercitazioni e test personalizzati. Solo gli admin possono creare simulazioni ufficiali.
        </p>
      </div>

      {/* Filters */}
      <div className={`rounded-xl p-4 mb-6 ${colors.background.card} border ${colors.border.light}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca simulazioni..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-red-500/30`}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.hover} ${colors.text.secondary}`}
          >
            <Filter className="w-4 h-4" />
            Filtri
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <CustomSelect
              label="Tipo"
              value={type}
              onChange={(v) => setType(v as SimulationType | '')}
              options={[
                { value: '', label: 'Tutti' },
                { value: 'PRACTICE', label: 'Esercitazione' },
                { value: 'CUSTOM', label: 'Personalizzata' },
              ]}
            />
            <CustomSelect
              label="Stato"
              value={status}
              onChange={(v) => setStatus(v as SimulationStatus | '')}
              options={[
                { value: '', label: 'Tutti' },
                ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
              ]}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-xl overflow-hidden ${colors.background.card} border ${colors.border.light}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${colors.background.secondary}`}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                  Simulazione
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden md:table-cell`}>
                  Tipo
                </th>
                <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                  Domande
                </th>
                <th className={`px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden sm:table-cell`}>
                  Partecipanti
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                  Stato
                </th>
                <th className={`px-4 py-3 text-right text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${colors.border.light}`}>
              {simulations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className={`text-sm ${colors.text.muted}`}>Nessuna simulazione trovata</p>
                    <Link
                      href="/collaboratore/simulazioni/nuova"
                      className={`inline-flex items-center gap-2 mt-4 text-sm ${colors.primary.text}`}
                    >
                      <Plus className="w-4 h-4" />
                      Crea la tua prima simulazione
                    </Link>
                  </td>
                </tr>
              ) : (
                simulations.map((simulation) => (
                  <tr
                    key={simulation.id}
                    className={`${colors.background.hover} transition-colors cursor-pointer`}
                    onClick={() => window.location.href = `/collaboratore/simulazioni/${simulation.id}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${simulation.isOfficial ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          {simulation.isOfficial ? (
                            <Award className="w-5 h-5 text-red-600 dark:text-red-400" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${colors.text.primary}`}>{simulation.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {simulation.durationMinutes > 0 && (
                              <span className={`text-xs ${colors.text.muted} flex items-center gap-1`}>
                                <Clock className="w-3 h-3" />
                                {formatDuration(simulation.durationMinutes)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[simulation.type as SimulationType]}`}>
                        {typeLabels[simulation.type as SimulationType]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-sm ${colors.text.primary}`}>
                        <Target className="w-4 h-4 text-gray-400" />
                        {simulation._count.questions}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 text-sm ${colors.text.primary}`}>
                        <Users className="w-4 h-4 text-gray-400" />
                        {simulation._count.results}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[simulation.status as SimulationStatus]}`}>
                        {statusLabels[simulation.status as SimulationStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={(e) => handleMenuOpen(simulation.id, e)}
                        className={`p-2 rounded-lg ${colors.background.hover} transition-colors`}
                      >
                        <MoreVertical className="w-4 h-4" />
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
          <div className={`px-4 py-3 border-t ${colors.border.light} flex items-center justify-between`}>
            <p className={`text-sm ${colors.text.muted}`}>
              Pagina {pagination.page} di {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={`p-2 rounded-lg ${colors.background.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className={`p-2 rounded-lg ${colors.background.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Menu Portal */}
      {openMenuId && menuPosition && (
        <Portal>
          <div
            ref={menuRef}
            className={`fixed z-50 w-48 rounded-lg shadow-lg ${colors.background.card} border ${colors.border.light} py-1`}
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <Link
              href={`/collaboratore/simulazioni/${openMenuId}`}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${colors.text.secondary} ${colors.background.hover}`}
              onClick={() => setOpenMenuId(null)}
            >
              <Eye className="w-4 h-4" />
              Visualizza
            </Link>
            <Link
              href={`/collaboratore/simulazioni/${openMenuId}/modifica`}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${colors.text.secondary} ${colors.background.hover}`}
              onClick={() => setOpenMenuId(null)}
            >
              <Edit2 className="w-4 h-4" />
              Modifica
            </Link>
            <button
              onClick={() => {
                const sim = simulations.find(s => s.id === openMenuId);
                if (sim?.status === 'DRAFT') {
                  publishMutation.mutate({ id: openMenuId });
                }
                setOpenMenuId(null);
              }}
              disabled={simulations.find(s => s.id === openMenuId)?.status !== 'DRAFT'}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.secondary} ${colors.background.hover} disabled:opacity-50`}
            >
              <Send className="w-4 h-4" />
              Pubblica
            </button>
            <hr className={`my-1 ${colors.border.light}`} />
            <button
              onClick={() => {
                const sim = simulations.find(s => s.id === openMenuId);
                if (sim) setDeleteConfirm({ id: sim.id, title: sim.title });
                setOpenMenuId(null);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 ${colors.background.hover}`}
            >
              <Trash2 className="w-4 h-4" />
              Elimina
            </button>
          </div>
        </Portal>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Elimina Simulazione"
          message={`Sei sicuro di voler eliminare "${deleteConfirm.title}"?`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id: deleteConfirm.id })}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
