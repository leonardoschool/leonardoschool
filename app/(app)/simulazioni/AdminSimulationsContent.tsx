'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Portal } from '@/components/ui/Portal';
import { StudentDetailModal } from '@/components/ui/StudentDetailModal';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
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
  CheckCircle,
  Calendar,
  UserPlus,
  Lock,
  Unlock,
  User,
} from 'lucide-react';
import type { SimulationType, SimulationStatus } from '@/lib/validations/simulationValidation';
import { SimulationAssignModal } from '@/components/ui/SimulationAssignModal';

type TabType = 'simulations' | 'assignments';
type AssignmentStatus = 'ACTIVE' | 'CLOSED';

// Type labels
const typeLabels: Record<SimulationType, string> = {
  OFFICIAL: 'Ufficiale',
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

// Status labels for simulations (templates)
const statusLabels: Record<SimulationStatus, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicata',
  ARCHIVED: 'Archiviata',
};

// Status labels for assignments
const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  ACTIVE: 'Attiva',
  CLOSED: 'Chiusa',
};

// Type colors
const typeColors: Record<SimulationType, string> = {
  OFFICIAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PRACTICE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CUSTOM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  QUICK_QUIZ: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// Status colors for simulations (templates)
const statusColors: Record<SimulationStatus, string> = {
  DRAFT: 'bg-gray-200 text-gray-800 dark:bg-gray-400 dark:text-gray-900',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ARCHIVED: 'bg-slate-200 text-slate-800 dark:bg-slate-400 dark:text-slate-900',
};

// Status colors for assignments
const assignmentStatusColors: Record<AssignmentStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

export default function AdminSimulationsContent() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('simulations');

  // Filters state for simulations tab (templates only)
  const [search, setSearch] = useState('');
  const [type, setType] = useState<SimulationType | ''>('');
  const [status, setStatus] = useState<SimulationStatus | ''>('');
  const [isOfficial, setIsOfficial] = useState<boolean | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Assignments filters
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentGroupId, setAssignmentGroupId] = useState('');
  const [assignmentSimulationId, setAssignmentSimulationId] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<AssignmentStatus | ''>('');

  // Action menus state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; assignmentsCount?: number } | null>(null);
  const [forceDeleteConfirm, setForceDeleteConfirm] = useState<{ id: string; title: string; resultsCount: number } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; title: string } | null>(null);
  const [assignModal, setAssignModal] = useState<{ id: string; title: string; isOfficial: boolean; durationMinutes: number } | null>(null);
  
  // Student detail modal state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Expanded groups state (for showing all students)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch groups for filter
  const { data: groupsData } = trpc.groups.getGroups.useQuery({ page: 1, pageSize: 100 });

  // Fetch simulations (templates only, no visibility/group filters)
  const { data: simulationsData, isLoading } = trpc.simulations.getSimulations.useQuery({
    page,
    pageSize,
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
    isOfficial: isOfficial === '' ? undefined : isOfficial,
  });

  // Fetch assignments
  const { data: assignmentsData, isLoading: assignmentsLoading } = trpc.simulations.getAssignments.useQuery(
    {
      page: assignmentPage,
      pageSize: 20,
      groupId: assignmentGroupId || undefined,
      simulationId: assignmentSimulationId || undefined,
      assignmentStatus: assignmentStatusFilter || 'ALL',
    },
    { enabled: activeTab === 'assignments' }
  );

  // Mutations
  const deleteMutation = trpc.simulations.delete.useMutation({
    onSuccess: async (data) => {
      const message = data.deletedAssignments > 0 
        ? `Simulazione eliminata con successo. ${data.deletedAssignments} assegnazione${data.deletedAssignments === 1 ? '' : 'i'} rimossa${data.deletedAssignments === 1 ? '' : 'e'} dal calendario.`
        : 'Simulazione eliminata con successo';
      showSuccess('Eliminata', message);
      
      // Invalidate all related queries to ensure UI updates
      await Promise.all([
        utils.simulations.getSimulations.invalidate(),
        utils.simulations.getAssignments.invalidate(),
        utils.simulations.getAvailableSimulations.invalidate(),
      ]);
      
      setDeleteConfirm(null);
      setForceDeleteConfirm(null);
    },
    onError: (error) => {
      // Check if error is about having results - offer force delete
      if (error.message.includes('risultati salvati') || error.message.includes('Usa l\'eliminazione forzata')) {
        // Extract results count from message if possible
        const match = error.message.match(/ha (\d+) risultati/);
        const resultsCount = match ? parseInt(match[1], 10) : 0;
        
        // Close normal delete dialog and show force delete dialog
        if (deleteConfirm) {
          setForceDeleteConfirm({
            id: deleteConfirm.id,
            title: deleteConfirm.title,
            resultsCount,
          });
          setDeleteConfirm(null);
        }
      } else {
        handleMutationError(error);
      }
    },
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

  // Assignment mutations
  const closeAssignmentMutation = trpc.simulations.closeAssignment.useMutation({
    onSuccess: () => {
      showSuccess('Chiusa', 'Assegnazione chiusa con successo');
      utils.simulations.getAssignments.invalidate();
    },
    onError: handleMutationError,
  });

  const reopenAssignmentMutation = trpc.simulations.reopenAssignment.useMutation({
    onSuccess: () => {
      showSuccess('Riaperta', 'Assegnazione riaperta con successo');
      utils.simulations.getAssignments.invalidate();
    },
    onError: handleMutationError,
  });

  const removeAssignmentMutation = trpc.simulations.removeAssignment.useMutation({
    onSuccess: () => {
      showSuccess('Eliminata', 'Assegnazione eliminata con successo');
      utils.simulations.getAssignments.invalidate();
    },
    onError: handleMutationError,
  });

  // Group assignments by simulation + dates (for assignments tab)
  interface GroupedAssignment {
    id: string;
    simulationId: string;
    simulationTitle: string;
    simulationType: SimulationType;
    simulationAccessType: 'OPEN' | 'ROOM';
    startDate: string | Date | null;
    endDate: string | Date | null;
    status: AssignmentStatus;
    students: Array<{
      id: string;
      name: string;
      assignmentId: string;
      completedCount: number;
      totalTargeted: number;
      completionRate: number;
    }>;
    groups: Array<{
      id: string;
      name: string;
      assignmentId: string;
      completedCount: number;
      totalTargeted: number;
      completionRate: number;
    }>;
    completedCount: number;
    totalTargeted: number;
    completionRate: number;
    createdBy: { id: string; name: string };
  }

  const groupedAssignments = useMemo((): GroupedAssignment[] => {
    if (!assignmentsData?.assignments) return [];

    const groups = new Map<string, GroupedAssignment>();

    assignmentsData.assignments.forEach((assignment) => {
      const startDateStr = assignment.startDate 
        ? new Date(assignment.startDate).toISOString() 
        : 'null';
      const endDateStr = assignment.endDate 
        ? new Date(assignment.endDate).toISOString() 
        : 'null';
      
      const key = `${assignment.simulationId}-${startDateStr}-${endDateStr}-${assignment.status}`;

      if (!groups.has(key)) {
        groups.set(key, {
          id: assignment.id,
          simulationId: assignment.simulationId,
          simulationTitle: assignment.simulation?.title || '-',
          simulationType: (assignment.simulation?.type || 'PRACTICE') as SimulationType,
          simulationAccessType: (assignment.simulation?.accessType || 'OPEN') as 'OPEN' | 'ROOM',
          startDate: assignment.startDate || null,
          endDate: assignment.endDate || null,
          status: (assignment.status || 'ACTIVE') as AssignmentStatus,
          students: [],
          groups: [],
          completedCount: 0,
          totalTargeted: 0,
          completionRate: 0,
          createdBy: assignment.assignedBy || { id: '', name: 'Sconosciuto' },
        });
      }

      const group = groups.get(key)!;

      if (assignment.student) {
        group.students.push({
          id: assignment.student.user.id,
          name: assignment.student.user.name,
          assignmentId: assignment.id,
          completedCount: assignment.completedCount || 0,
          totalTargeted: assignment.totalTargeted || 1,
          completionRate: assignment.completionRate || 0,
        });
      } else if (assignment.group) {
        group.groups.push({
          id: assignment.group.id,
          name: assignment.group.name,
          assignmentId: assignment.id,
          completedCount: assignment.completedCount || 0,
          totalTargeted: assignment.totalTargeted || 0,
          completionRate: assignment.completionRate || 0,
        });
      }

      group.completedCount += assignment.completedCount || 0;
      group.totalTargeted += assignment.totalTargeted || 0;
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      completionRate: group.totalTargeted > 0 
        ? (group.completedCount / group.totalTargeted) * 100 
        : 0,
    }));
  }, [assignmentsData]);

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

  // Handle menu open with smart positioning
  const handleMenuOpen = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    
    // Menu dimensions (approximate) - organized menu with sections
    const menuHeight = 320; // Menu with navigation, actions and delete sections
    const menuWidth = 208; // w-52 = 13rem = 208px
    
    // Calculate available space
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = window.innerWidth - rect.right;
    
    // Determine if menu should open upward or downward
    // Only open upward if there's really not enough space below
    const openUpward = spaceBelow < menuHeight && spaceAbove > menuHeight + 20;
    
    // Calculate vertical position
    const top = openUpward
      ? rect.top + window.scrollY - menuHeight - 4 // 4px gap
      : rect.bottom + window.scrollY + 4; // 4px gap
    
    // Calculate horizontal position with responsive logic
    let left: number;
    
    // On mobile/small screens or when not enough space on right
    if (window.innerWidth < 640 || spaceRight < menuWidth + 16) {
      // Align to right edge with padding, or center if very small screen
      if (window.innerWidth < menuWidth + 32) {
        // Center on very small screens
        left = window.scrollX + (window.innerWidth - menuWidth) / 2;
      } else {
        // Align to right edge of button but ensure it stays on screen
        const idealLeft = rect.right + window.scrollX - menuWidth;
        const minLeft = window.scrollX + 8; // 8px padding from left edge
        left = Math.max(minLeft, idealLeft);
      }
    } else {
      // Desktop: align to right edge of button
      left = rect.right + window.scrollX - menuWidth;
    }
    
    setMenuPosition({ top, left });
    setOpenMenuId(openMenuId === id ? null : id);
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
          href="/simulazioni/nuova"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 transition-opacity`}
        >
          <Plus className="w-4 h-4" />
          Nuova Simulazione
        </Link>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1 rounded-lg ${colors.background.card} border ${colors.border.light} mb-6 w-fit`}>
        <button
          onClick={() => setActiveTab('simulations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'simulations'
              ? `${colors.primary.bg} text-white`
              : `${colors.text.secondary} hover:${colors.background.hover}`
          }`}
        >
          <FileText className="w-4 h-4" />
          Simulazioni Create
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'assignments'
              ? `${colors.primary.bg} text-white`
              : `${colors.text.secondary} hover:${colors.background.hover}`
          }`}
        >
          <Calendar className="w-4 h-4" />
          Assegnazioni
        </button>
      </div>

      {/* Tab: Simulations */}
      {activeTab === 'simulations' && (
        <>
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
                {(type || status || isOfficial !== '') && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {[type, status, isOfficial !== ''].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Extended filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <CustomSelect
                  label="Tipo"
                  value={type}
                  onChange={(v) => setType(v as SimulationType | '')}
                  options={[
                    { value: '', label: 'Tutti i tipi' },
                    ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
                  ]}
                />
                <CustomSelect
                  label="Stato"
                  value={status}
                  onChange={(v) => setStatus(v as SimulationStatus | '')}
                  options={[
                    { value: '', label: 'Tutti gli stati' },
                    { value: 'DRAFT', label: 'Bozza' },
                    { value: 'PUBLISHED', label: 'Pubblicata' },
                    { value: 'ARCHIVED', label: 'Archiviata' },
                  ]}
                />
                <CustomSelect
                  label="Template"
                  value={isOfficial === '' ? '' : isOfficial ? 'true' : 'false'}
                  onChange={(v) => setIsOfficial(v === '' ? '' : v === 'true')}
                  options={[
                    { value: '', label: 'Tutti i template' },
                    { value: 'true', label: 'Solo ufficiali' },
                    { value: 'false', label: 'Solo personalizzati' },
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
                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                      Simulazione
                    </th>
                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden lg:table-cell`}>
                      Tipo
                    </th>
                    <th className={`px-3 sm:px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden sm:table-cell`}>
                      Domande
                    </th>
                    <th className={`px-3 sm:px-4 py-3 text-center text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden md:table-cell`}>
                      Assegnazioni
                    </th>
                    <th className={`px-3 sm:px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider hidden sm:table-cell`}>
                      Stato
                    </th>
                    <th className={`px-3 sm:px-4 py-3 text-right text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${colors.border.light}`}>
                  {simulations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 sm:px-4 py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className={`text-sm ${colors.text.muted}`}>Nessuna simulazione trovata</p>
                      </td>
                    </tr>
                  ) : (
                    simulations.map((simulation) => (
                      <tr
                        key={simulation.id}
                        className={`${colors.background.hover} transition-colors cursor-pointer`}
                        onClick={() => window.location.href = `/simulazioni/${simulation.id}`}
                      >
                        <td className="px-3 sm:px-4 py-3 sm:py-4">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className={`p-1.5 sm:p-2 rounded-lg ${simulation.isOfficial ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'} flex-shrink-0`}>
                              {simulation.isOfficial ? (
                                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                              ) : (
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`font-medium text-sm sm:text-base ${colors.text.primary} truncate`}>{simulation.title}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {simulation.durationMinutes > 0 && (
                                  <span className={`text-xs ${colors.text.muted} flex items-center gap-1`}>
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(simulation.durationMinutes)}
                                  </span>
                                )}
                                {/* Show info on mobile that's hidden in other columns */}
                                <span className="sm:hidden inline-flex items-center gap-1 text-xs">
                                  <Target className="w-3 h-3 text-gray-400" />
                                  <span className={colors.text.primary}>{simulation._count.questions}</span>
                                </span>
                                <span className={`sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[simulation.status as SimulationStatus]}`}>
                                  {statusLabels[simulation.status as SimulationStatus]}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 hidden lg:table-cell">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[simulation.type as SimulationType]}`}>
                            {typeLabels[simulation.type as SimulationType]}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-center hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1 text-sm ${colors.text.primary}`}>
                            <Target className="w-4 h-4 text-gray-400" />
                            {simulation._count.questions}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-center hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1 text-sm ${colors.text.primary}`}>
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {simulation._count.assignments}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[simulation.status as SimulationStatus]}`}>
                            {statusLabels[simulation.status as SimulationStatus]}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleMenuOpen(simulation.id, e)}
                            className={`p-2 rounded-lg ${colors.background.hover} ${colors.icon.interactive} hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation`}
                            title="Azioni"
                          >
                            <MoreVertical className="w-5 h-5" />
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
                    className={`p-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page === pagination.totalPages}
                    className={`p-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Assignments */}
      {activeTab === 'assignments' && (
        <div className={`rounded-xl overflow-hidden ${colors.background.card} border ${colors.border.light}`}>
          {/* Filters for assignments */}
          <div className={`p-4 border-b ${colors.border.light}`}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <CustomSelect
                  label="Simulazione"
                  value={assignmentSimulationId}
                  onChange={(v) => {
                    setAssignmentSimulationId(v);
                    setAssignmentPage(1);
                  }}
                  options={[
                    { value: '', label: 'Tutte le simulazioni' },
                    ...(simulationsData?.simulations || []).map((s) => ({ value: s.id, label: s.title })),
                  ]}
                />
              </div>
              <div className="flex-1">
                <CustomSelect
                  label="Gruppo"
                  value={assignmentGroupId}
                  onChange={(v) => {
                    setAssignmentGroupId(v);
                    setAssignmentPage(1);
                  }}
                  options={[
                    { value: '', label: 'Tutti i gruppi' },
                    ...(groupsData?.groups || []).map((g) => ({ value: g.id, label: g.name })),
                  ]}
                />
              </div>
              <div className="flex-1">
                <CustomSelect
                  label="Stato"
                  value={assignmentStatusFilter}
                  onChange={(v) => {
                    setAssignmentStatusFilter(v as AssignmentStatus | '');
                    setAssignmentPage(1);
                  }}
                  options={[
                    { value: '', label: 'Tutti gli stati' },
                    { value: 'ACTIVE', label: 'Attive' },
                    { value: 'CLOSED', label: 'Chiuse' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Assignments Table */}
          {assignmentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !assignmentsData?.assignments.length ? (
            <div className="py-12 text-center">
              <Calendar className={`w-12 h-12 mx-auto mb-4 ${colors.text.muted}`} />
              <h3 className={`text-lg font-medium ${colors.text.primary} mb-2`}>
                Nessuna assegnazione trovata
              </h3>
              <p className={`text-sm ${colors.text.muted}`}>
                Le simulazioni assegnate a gruppi, classi o studenti appariranno qui.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${colors.border.light}`}>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                        Simulazione
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                        Assegnata a
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                        Stato
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                        Data Inizio
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                        Data Fine
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                        Completamenti
                      </th>
                      <th className={`px-4 py-3 text-right text-xs font-medium ${colors.text.muted} uppercase tracking-wider`}>
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${colors.border.light}`}>
                    {groupedAssignments.map((group) => {
                      const totalCount = group.students.length + group.groups.length;
                      const isExpanded = expandedGroups.has(group.id);
                      const displayLimit = 3;
                      const hasMore = totalCount > displayLimit;
                      
                      const visibleStudents = isExpanded ? group.students : group.students.slice(0, displayLimit);
                      const remainingCount = totalCount - displayLimit;
                      
                      const toggleExpand = () => {
                        setExpandedGroups(prev => {
                          const next = new Set(prev);
                          if (next.has(group.id)) {
                            next.delete(group.id);
                          } else {
                            next.add(group.id);
                          }
                          return next;
                        });
                      };
                      
                      return (
                        <tr key={group.id} className={`${colors.background.hover}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${colors.primary.light} flex items-center justify-center flex-shrink-0`}>
                                <FileText className={`w-5 h-5 ${colors.primary.text}`} />
                              </div>
                              <div className="min-w-0">
                                <p className={`font-medium ${colors.text.primary}`}>{group.simulationTitle}</p>
                                <p className={`text-xs ${colors.text.muted}`}>
                                  {typeLabels[group.simulationType]}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1.5">
                                {visibleStudents.map((student) => (
                                  <button
                                    key={student.id}
                                    onClick={() => setSelectedStudentId(student.id)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md ${colors.primary.light} ${colors.primary.text} hover:opacity-80 transition-opacity cursor-pointer`}
                                    title={`Clicca per visualizzare info di ${student.name}`}
                                  >
                                    <User className="w-3 h-3" />
                                    {student.name}
                                  </button>
                                ))}
                                {!hasMore && group.groups.map((g) => (
                                  <span
                                    key={g.id}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}
                                    title={`Gruppo: ${g.name}`}
                                  >
                                    <Users className="w-3 h-3" />
                                    {g.name}
                                  </span>
                                ))}
                                {hasMore && !isExpanded && (
                                  <button
                                    onClick={toggleExpand}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:opacity-80 transition-opacity cursor-pointer`}
                                    title="Clicca per mostrare tutti"
                                  >
                                    +{remainingCount} altr{remainingCount === 1 ? 'o' : 'i'}
                                  </button>
                                )}
                                {hasMore && isExpanded && (
                                  <button
                                    onClick={toggleExpand}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:opacity-80 transition-opacity cursor-pointer`}
                                  >
                                    Mostra meno
                                  </button>
                                )}
                              </div>
                              <p className={`text-[10px] ${colors.text.muted}`}>
                                Creata da: {group.createdBy.name}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${assignmentStatusColors[group.status]}`}>
                              {assignmentStatusLabels[group.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-xs ${colors.text.secondary}`}>
                                {group.startDate 
                                  ? new Date(group.startDate).toLocaleDateString('it-IT', { 
                                      day: '2-digit', 
                                      month: 'short', 
                                      year: 'numeric'
                                    })
                                  : '-'}
                              </span>
                              <span className={`text-[10px] ${colors.text.muted}`}>
                                {group.startDate 
                                  ? new Date(group.startDate).toLocaleTimeString('it-IT', { 
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-xs ${colors.text.secondary}`}>
                                {group.endDate 
                                  ? new Date(group.endDate).toLocaleDateString('it-IT', { 
                                      day: '2-digit', 
                                      month: 'short', 
                                      year: 'numeric'
                                    })
                                  : '-'}
                              </span>
                              <span className={`text-[10px] ${colors.text.muted}`}>
                                {group.endDate 
                                  ? new Date(group.endDate).toLocaleTimeString('it-IT', { 
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 max-w-[80px]">
                                <div 
                                  className={`h-full rounded-full ${
                                    group.completionRate >= 80 
                                      ? 'bg-green-500' 
                                      : group.completionRate >= 50 
                                      ? 'bg-yellow-500' 
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${group.completionRate}%` }}
                                />
                              </div>
                              <span className={`text-sm ${colors.text.secondary} whitespace-nowrap`}>
                                {group.completedCount}/{group.totalTargeted}
                              </span>
                              {group.completionRate === 100 && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-wrap">
                              {/* Virtual Room button for ROOM access type - show if ACTIVE and not expired */}
                              {group.simulationAccessType === 'ROOM' && group.status === 'ACTIVE' && (() => {
                                const isExpired = group.endDate && new Date(group.endDate) < new Date();
                                
                                if (isExpired) {
                                  return (
                                    <button
                                      disabled
                                      className={`inline-flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 text-sm font-medium rounded-lg bg-gray-400 dark:bg-gray-700 text-gray-200 dark:text-gray-500 cursor-not-allowed opacity-50`}
                                      title="Simulazione scaduta"
                                    >
                                      <Lock className="w-4 h-4" />
                                      <span className="hidden sm:inline">Virtual Room</span>
                                    </button>
                                  );
                                }
                                
                                return (
                                  <button
                                    onClick={() => {
                                      const url = `/virtual-room/${group.id}`;
                                      const width = Math.min(1400, window.screen.width - 100);
                                      const height = Math.min(900, window.screen.height - 100);
                                      const left = (window.screen.width - width) / 2;
                                      const top = (window.screen.height - height) / 2;
                                      window.open(
                                        url,
                                        `VirtualRoom_${group.id}`,
                                        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes`
                                      );
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-sm hover:shadow-md transition-all`}
                                    title="Virtual Room"
                                  >
                                    <Users className="w-4 h-4" />
                                    <span className="hidden sm:inline">Virtual Room</span>
                                  </button>
                                );
                              })()}
                              {/* Statistics - only show if there are completions */}
                              {group.completedCount > 0 && (
                                <Link
                                  href={`/simulazioni/${group.simulationId}/statistiche-assegnazione?assignmentId=${group.id}`}
                                  className={`inline-flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all`}
                                  title="Statistiche"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                  <span className="hidden sm:inline">Statistiche</span>
                                </Link>
                              )}
                              {/* Close/Reopen button - Admin can always act */}
                              {group.status === 'CLOSED' ? (
                                <button
                                  onClick={() => {
                                    const assignmentIds = [
                                      ...group.students.map(s => s.assignmentId),
                                      ...group.groups.map(g => g.assignmentId),
                                    ];
                                    reopenAssignmentMutation.mutate({ assignmentIds });
                                  }}
                                  disabled={reopenAssignmentMutation.isPending}
                                  className={`inline-flex items-center gap-1 px-2 py-1.5 sm:px-3 text-sm rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:opacity-80 transition-opacity disabled:opacity-50`}
                                  title="Riapri assegnazione"
                                >
                                  <Unlock className="w-4 h-4" />
                                  <span className="hidden sm:inline">Riapri</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const assignmentIds = [
                                      ...group.students.map(s => s.assignmentId),
                                      ...group.groups.map(g => g.assignmentId),
                                    ];
                                    closeAssignmentMutation.mutate({ assignmentIds });
                                  }}
                                  disabled={closeAssignmentMutation.isPending}
                                  className={`inline-flex items-center gap-1 px-2 py-1.5 sm:px-3 text-sm rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:opacity-80 transition-opacity disabled:opacity-50`}
                                  title="Chiudi assegnazione"
                                >
                                  <Lock className="w-4 h-4" />
                                  <span className="hidden sm:inline">Chiudi</span>
                                </button>
                              )}
                              {/* Delete button - Admin can always act */}
                              <button
                                onClick={() => {
                                  const firstAssignmentId = group.students[0]?.assignmentId || group.groups[0]?.assignmentId;
                                  if (firstAssignmentId) {
                                    removeAssignmentMutation.mutate({ assignmentId: firstAssignmentId });
                                  }
                                }}
                                disabled={removeAssignmentMutation.isPending}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:opacity-80 transition-opacity disabled:opacity-50`}
                                title="Elimina assegnazione"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Assignments Pagination */}
              {assignmentsData.pagination.totalPages > 1 && (
                <div className={`px-4 py-3 border-t ${colors.border.light} flex items-center justify-between`}>
                  <p className={`text-sm ${colors.text.muted}`}>
                    Pagina {assignmentsData.pagination.page} di {assignmentsData.pagination.totalPages}
                    {' '}({assignmentsData.pagination.total} assegnazioni)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAssignmentPage(Math.max(1, assignmentPage - 1))}
                      disabled={assignmentPage === 1}
                      className={`p-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAssignmentPage(Math.min(assignmentsData.pagination.totalPages, assignmentPage + 1))}
                      disabled={assignmentPage === assignmentsData.pagination.totalPages}
                      className={`p-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Action Menu - Desktop Dropdown / Mobile Bottom Sheet */}
      {openMenuId && menuPosition && (
        <Portal>
          {/* Mobile: Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
            onClick={() => setOpenMenuId(null)}
          />
          
          {/* Menu Container - Desktop dropdown / Mobile bottom sheet */}
          <div
            ref={menuRef}
            className={`
              fixed z-50 shadow-xl ${colors.background.card} border ${colors.border.light}
              
              /* Mobile: Bottom sheet */
              inset-x-0 bottom-0 rounded-t-2xl sm:rounded-xl
              max-h-[80vh] overflow-y-auto
              
              /* Desktop: Dropdown */
              sm:w-52 sm:inset-x-auto sm:bottom-auto
            `}
            style={{ 
              top: window.innerWidth >= 640 ? menuPosition.top : undefined,
              left: window.innerWidth >= 640 ? menuPosition.left : undefined 
            }}
          >
            {/* Mobile: Drag handle */}
            <div className="sm:hidden flex justify-center py-2">
              <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            
            {/* Navigation Actions */}
            <div className="px-3 sm:px-2 pb-2 pt-2 sm:pt-2">
              <p className={`px-2 py-1 text-xs font-semibold uppercase tracking-wider ${colors.text.muted}`}>
                Navigazione
              </p>
              <Link
                href={`/simulazioni/${openMenuId}/modifica`}
                className={`flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2.5 text-sm sm:text-sm rounded-lg ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation`}
                onClick={() => setOpenMenuId(null)}
              >
                <Edit2 className="w-5 h-5 sm:w-4 sm:h-4" />
                Modifica
              </Link>
              <Link
                href={`/simulazioni/${openMenuId}/statistiche`}
                className={`flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2.5 text-sm sm:text-sm rounded-lg ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation`}
                onClick={() => setOpenMenuId(null)}
              >
                <BarChart3 className="w-5 h-5 sm:w-4 sm:h-4" />
                Statistiche
              </Link>
            </div>
            
            <hr className={`my-1 ${colors.border.light}`} />
            
            {/* Quick Actions */}
            <div className="px-3 sm:px-2 py-2">
              <p className={`px-2 py-1 text-xs font-semibold uppercase tracking-wider ${colors.text.muted}`}>
                Azioni
              </p>
              <button
                onClick={() => {
                  const sim = simulations.find(s => s.id === openMenuId);
                  if (sim) {
                    setAssignModal({ 
                      id: sim.id, 
                      title: sim.title,
                      isOfficial: sim.isOfficial,
                      durationMinutes: sim.durationMinutes
                    });
                  }
                  setOpenMenuId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2.5 text-sm sm:text-sm rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors touch-manipulation`}
              >
                <UserPlus className="w-5 h-5 sm:w-4 sm:h-4" />
                Assegna a studenti
              </button>
              
              {/* Pubblica - only for DRAFT */}
              {simulations.find(s => s.id === openMenuId)?.status === 'DRAFT' && (
                <button
                  onClick={() => {
                    publishMutation.mutate({ id: openMenuId });
                    setOpenMenuId(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2.5 text-sm sm:text-sm rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors touch-manipulation`}
                >
                  <Send className="w-5 h-5 sm:w-4 sm:h-4" />
                  Pubblica
                </button>
              )}
              
              {/* Archivia - only for PUBLISHED */}
              {simulations.find(s => s.id === openMenuId)?.status === 'PUBLISHED' && (
                <button
                  onClick={() => {
                    const sim = simulations.find(s => s.id === openMenuId);
                    if (sim) {
                      setArchiveConfirm({ id: sim.id, title: sim.title });
                    }
                    setOpenMenuId(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2.5 text-sm sm:text-sm rounded-lg text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors touch-manipulation`}
                >
                  <Archive className="w-5 h-5 sm:w-4 sm:h-4" />
                  Archivia
                </button>
              )}
            </div>
            
            <hr className={`my-1 ${colors.border.light}`} />
            
            {/* Danger Zone */}
            <div className="px-3 sm:px-2 pt-1 pb-4 sm:pb-1">
              <button
                onClick={() => {
                  const sim = simulations.find(s => s.id === openMenuId);
                  if (sim) {
                    // Check if simulation has assignments
                    const assignmentsCount = assignmentsData?.assignments.filter(
                      a => a.simulationId === sim.id
                    ).length || 0;
                    
                    setDeleteConfirm({ 
                      id: sim.id, 
                      title: sim.title,
                      assignmentsCount 
                    });
                  }
                  setOpenMenuId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2.5 text-sm sm:text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation`}
              >
                <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                Elimina
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Elimina Simulazione"
          message={
            deleteConfirm.assignmentsCount && deleteConfirm.assignmentsCount > 0
              ? `Sei sicuro di voler eliminare "${deleteConfirm.title}"?\n\n⚠️ Questa simulazione è assegnata a ${deleteConfirm.assignmentsCount} studente/gruppo${deleteConfirm.assignmentsCount > 1 ? 'i' : ''} e verrà rimossa dal loro calendario.\n\nQuesta azione non può essere annullata.`
              : `Sei sicuro di voler eliminare "${deleteConfirm.title}"? Questa azione non può essere annullata.`
          }
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id: deleteConfirm.id })}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Force Delete Confirmation Modal - shown when simulation has results */}
      {forceDeleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="⚠️ Eliminazione Forzata"
          message={`ATTENZIONE: Stai per eliminare definitivamente "${forceDeleteConfirm.title}".\n\n🗑️ Verranno eliminati:\n• ${forceDeleteConfirm.resultsCount} risultati degli studenti\n• Tutte le statistiche e analisi\n• Tutte le assegnazioni e sessioni\n• Gli eventi calendario correlati\n\n❌ Questa operazione è IRREVERSIBILE.\n\nSei assolutamente sicuro di voler procedere?`}
          confirmText="Elimina Definitivamente"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id: forceDeleteConfirm.id, force: true })}
          onCancel={() => setForceDeleteConfirm(null)}
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

      {/* Assign Modal */}
      {assignModal && (
        <SimulationAssignModal
          isOpen={true}
          onClose={() => setAssignModal(null)}
          simulationId={assignModal.id}
          simulationTitle={assignModal.title}
          isOfficial={assignModal.isOfficial}
          durationMinutes={assignModal.durationMinutes}
          userRole="ADMIN"
        />
      )}

      {/* Student Detail Modal */}
      {selectedStudentId && (
        <StudentDetailModal
          isOpen={true}
          onClose={() => setSelectedStudentId(null)}
          studentId={selectedStudentId}
        />
      )}
    </div>
  );
}
