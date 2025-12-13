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
  Archive,
  Users,
  Clock,
  Target,
  Award,
  FileText,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Send,
} from 'lucide-react';
import type { SimulationType, SimulationStatus, SimulationVisibility } from '@/lib/validations/simulationValidation';

// Type labels
const typeLabels: Record<SimulationType, string> = {
  OFFICIAL: 'Ufficiale',
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

// Status labels
const statusLabels: Record<SimulationStatus, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicata',
  CLOSED: 'Chiusa',
  ARCHIVED: 'Archiviata',
};

// Visibility labels
const visibilityLabels: Record<SimulationVisibility, string> = {
  PRIVATE: 'Privata',
  CLASS: 'Classe',
  GROUP: 'Gruppo',
  PUBLIC: 'Pubblica',
};

// Type colors
const typeColors: Record<SimulationType, string> = {
  OFFICIAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PRACTICE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CUSTOM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  QUICK_QUIZ: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// Status colors
const statusColors: Record<SimulationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ARCHIVED: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export default function SimulationsPage() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Filters state
  const [search, setSearch] = useState('');
  const [type, setType] = useState<SimulationType | ''>('');
  const [status, setStatus] = useState<SimulationStatus | ''>('');
  const [visibility, setVisibility] = useState<SimulationVisibility | ''>('');
  const [isOfficial, setIsOfficial] = useState<boolean | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Action menus state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; title: string } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch simulations
  const { data: simulationsData, isLoading } = trpc.simulations.getSimulations.useQuery({
    page,
    pageSize,
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
    visibility: visibility || undefined,
    isOfficial: isOfficial === '' ? undefined : isOfficial,
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

  const archiveMutation = trpc.simulations.archive.useMutation({
    onSuccess: () => {
      showSuccess('Archiviata', 'Simulazione archiviata con successo');
      utils.simulations.getSimulations.invalidate();
      setArchiveConfirm(null);
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

  // Handle menu open
  const handleMenuOpen = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX - 120,
    });
    setOpenMenuId(openMenuId === id ? null : id);
  };

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format duration
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
            Gestisci test, esercitazioni e quiz ({pagination.total} totali)
          </p>
        </div>
        <Link
          href="/admin/simulazioni/nuova"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 transition-opacity`}
        >
          <Plus className="w-4 h-4" />
          Nuova Simulazione
        </Link>
      </div>

      {/* Filters */}
      <div className={`rounded-xl p-4 mb-6 ${colors.background.card} border ${colors.border.light}`}>
        {/* Search bar */}
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
            {(type || status || visibility || isOfficial !== '') && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {[type, status, visibility, isOfficial !== ''].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <CustomSelect
              label="Tipo"
              value={type}
              onChange={(v) => setType(v as SimulationType | '')}
              options={[
                { value: '', label: 'Tutti' },
                ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
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
            <CustomSelect
              label="Visibilità"
              value={visibility}
              onChange={(v) => setVisibility(v as SimulationVisibility | '')}
              options={[
                { value: '', label: 'Tutte' },
                ...Object.entries(visibilityLabels).map(([value, label]) => ({ value, label })),
              ]}
            />
            <CustomSelect
              label="Ufficiale"
              value={isOfficial === '' ? '' : isOfficial ? 'true' : 'false'}
              onChange={(v) => setIsOfficial(v === '' ? '' : v === 'true')}
              options={[
                { value: '', label: 'Tutti' },
                { value: 'true', label: 'Solo Ufficiali' },
                { value: 'false', label: 'Non Ufficiali' },
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
                <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden lg:table-cell`}>
                  Date
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
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className={`text-sm ${colors.text.muted}`}>Nessuna simulazione trovata</p>
                  </td>
                </tr>
              ) : (
                simulations.map((simulation) => (
                  <tr
                    key={simulation.id}
                    className={`${colors.background.hover} transition-colors cursor-pointer`}
                    onClick={() => window.location.href = `/admin/simulazioni/${simulation.id}`}
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
                            {simulation.class && (
                              <span className={`text-xs ${colors.text.muted}`}>
                                📚 {simulation.class.name}
                              </span>
                            )}
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
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="text-sm">
                        <p className={colors.text.secondary}>
                          <span className="text-gray-500">Inizio:</span> {formatDate(simulation.startDate)}
                        </p>
                        <p className={colors.text.secondary}>
                          <span className="text-gray-500">Fine:</span> {formatDate(simulation.endDate)}
                        </p>
                      </div>
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
                className={`p-2 rounded-lg ${colors.background.hover} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className={`p-2 rounded-lg ${colors.background.hover} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
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
              href={`/admin/simulazioni/${openMenuId}`}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${colors.text.secondary} ${colors.background.hover}`}
              onClick={() => setOpenMenuId(null)}
            >
              <Eye className="w-4 h-4" />
              Visualizza
            </Link>
            <Link
              href={`/admin/simulazioni/${openMenuId}/modifica`}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${colors.text.secondary} ${colors.background.hover}`}
              onClick={() => setOpenMenuId(null)}
            >
              <Edit2 className="w-4 h-4" />
              Modifica
            </Link>
            <Link
              href={`/admin/simulazioni/${openMenuId}/statistiche`}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${colors.text.secondary} ${colors.background.hover}`}
              onClick={() => setOpenMenuId(null)}
            >
              <BarChart3 className="w-4 h-4" />
              Statistiche
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
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${colors.text.secondary} ${colors.background.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Send className="w-4 h-4" />
              Pubblica
            </button>
            <hr className={`my-1 ${colors.border.light}`} />
            <button
              onClick={() => {
                const sim = simulations.find(s => s.id === openMenuId);
                if (sim) {
                  setArchiveConfirm({ id: sim.id, title: sim.title });
                }
                setOpenMenuId(null);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 ${colors.background.hover}`}
            >
              <Archive className="w-4 h-4" />
              Archivia
            </button>
            <button
              onClick={() => {
                const sim = simulations.find(s => s.id === openMenuId);
                if (sim) {
                  setDeleteConfirm({ id: sim.id, title: sim.title });
                }
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Elimina Simulazione"
          message={`Sei sicuro di voler eliminare "${deleteConfirm.title}"? Questa azione non può essere annullata.`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id: deleteConfirm.id })}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Archive Confirmation Modal */}
      {archiveConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Archivia Simulazione"
          message={`Sei sicuro di voler archiviare "${archiveConfirm.title}"? La simulazione non sarà più accessibile agli studenti.`}
          confirmText="Archivia"
          cancelText="Annulla"
          variant="warning"
          isLoading={archiveMutation.isPending}
          onConfirm={() => archiveMutation.mutate({ id: archiveConfirm.id })}
          onCancel={() => setArchiveConfirm(null)}
        />
      )}
    </div>
  );
}
