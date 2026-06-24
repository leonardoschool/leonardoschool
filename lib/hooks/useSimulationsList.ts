'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc/client';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { useFocusAwarePolling } from '@/lib/hooks/useWindowFocus';
import type { SimulationType, SimulationStatus } from '@/lib/validations/simulationValidation';

type TabType = 'simulations' | 'assignments' | 'templates';
type AssignmentStatus = 'ACTIVE' | 'CLOSED';
type SimulationAccessType = 'OPEN' | 'ROOM';
type NullableDate = string | Date | null;

export interface GroupedAssignment {
  id: string;
  simulationId: string;
  simulationTitle: string;
  simulationType: SimulationType;
  simulationAccessType: SimulationAccessType;
  startDate: NullableDate;
  endDate: NullableDate;
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

export function useSimulationsList() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const pollingInterval = useFocusAwarePolling(120000, true);

  // Filter state
  const [search, setSearch] = useState('');
  const [type, setType] = useState<SimulationType | ''>('');
  const [status, setStatus] = useState<SimulationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Tab & assignment filter state
  const [activeTab, setActiveTab] = useState<TabType>('simulations');
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentGroupId, setAssignmentGroupId] = useState('');
  const [assignmentSimulationId, setAssignmentSimulationId] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<AssignmentStatus | ''>('');

  // Menu & modal state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [assignModal, setAssignModal] = useState<{ id: string; title: string; isOfficial: boolean; durationMinutes: number } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<GroupedAssignment | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [openAssignmentMenuId, setOpenAssignmentMenuId] = useState<string | null>(null);
  const [assignmentMenuPosition, setAssignmentMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const menuRef = useRef<HTMLDivElement>(null);
  const assignmentMenuRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: pendingReviewsData } = trpc.simulations.getResultsWithPendingReviews.useQuery(
    { limit: 1, offset: 0 },
    { refetchInterval: pollingInterval }
  );

  const { data: currentUser } = trpc.users.me.useQuery();
  const { data: groupsData } = trpc.groups.getGroups.useQuery({ page: 1, pageSize: 100 });

  // keepPreviousData keeps the current rows visible while a new search/filter fetches,
  // so the page doesn't blank out (and the search input keeps focus) on every keystroke.
  const { data: simulationsData, isLoading } = trpc.simulations.getSimulations.useQuery({
    page,
    pageSize,
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
  }, {
    placeholderData: keepPreviousData,
  });

  const { data: assignmentsData, isLoading: assignmentsLoading } = trpc.simulations.getAssignments.useQuery(
    {
      page: assignmentPage,
      pageSize: 20,
      simulationId: assignmentSimulationId || undefined,
      groupId: assignmentGroupId || undefined,
      assignmentStatus: assignmentStatusFilter || 'ALL',
    },
    { enabled: activeTab === 'assignments' }
  );

  // Mutations
  const utils = trpc.useUtils();

  const closeAssignmentMutation = trpc.simulations.closeAssignment.useMutation({
    onSuccess: () => {
      showSuccess('Assegnazione chiusa', "L'assegnazione è stata chiusa con successo.");
      utils.simulations.getAssignments.invalidate();
    },
    onError: handleMutationError,
  });

  const reopenAssignmentMutation = trpc.simulations.reopenAssignment.useMutation({
    onSuccess: () => {
      showSuccess('Assegnazione riaperta', "L'assegnazione è stata riaperta con successo.");
      utils.simulations.getAssignments.invalidate();
    },
    onError: handleMutationError,
  });

  const removeAssignmentMutation = trpc.simulations.removeAssignment.useMutation({
    onSuccess: () => {
      showSuccess('Assegnazione eliminata', "L'assegnazione è stata eliminata con successo.");
      utils.simulations.getAssignments.invalidate();
    },
    onError: handleMutationError,
  });

  const updateAssignmentsMutation = trpc.simulations.updateAssignments.useMutation({
    onSuccess: () => {
      showSuccess('Salvata', 'Assegnazione aggiornata con successo.');
      utils.simulations.getAssignments.invalidate();
      setEditingAssignment(null);
    },
    onError: handleMutationError,
  });

  const publishMutation = trpc.simulations.publish.useMutation({
    onSuccess: () => {
      showSuccess('Simulazione pubblicata', 'La simulazione è stata pubblicata con successo.');
      utils.simulations.getSimulations.invalidate();
    },
    onError: handleMutationError,
  });

  const archiveMutation = trpc.simulations.archive.useMutation({
    onSuccess: () => {
      showSuccess('Simulazione archiviata', 'La simulazione è stata archiviata con successo.');
      utils.simulations.getSimulations.invalidate();
    },
    onError: handleMutationError,
  });

  // Derived
  const simulations = simulationsData?.simulations ?? [];
  const pagination = simulationsData?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };
  const pendingReviewsCount = pendingReviewsData?.total ?? 0;

  const groupedAssignments = useMemo((): GroupedAssignment[] => {
    if (!assignmentsData?.assignments) return [];
    const map = new Map<string, GroupedAssignment>();

    assignmentsData.assignments.forEach((assignment) => {
      const startStr = assignment.startDate ? new Date(assignment.startDate).toISOString() : 'null';
      const endStr = assignment.endDate ? new Date(assignment.endDate).toISOString() : 'null';
      const key = `${assignment.simulationId}-${startStr}-${endStr}-${assignment.status}`;

      if (!map.has(key)) {
        map.set(key, {
          id: assignment.id,
          simulationId: assignment.simulationId,
          simulationTitle: assignment.simulation?.title || '-',
          simulationType: (assignment.simulation?.type || 'PRACTICE') as SimulationType,
          simulationAccessType: (assignment.simulation?.accessType || 'OPEN') as SimulationAccessType,
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

      const group = map.get(key)!;
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

    return Array.from(map.values()).map((group) => ({
      ...group,
      completionRate: group.totalTargeted > 0 ? (group.completedCount / group.totalTargeted) * 100 : 0,
    }));
  }, [assignmentsData]);

  // Helpers
  const canTakeAction = (createdById: string) => currentUser?.id === createdById;

  const canModifySimulation = (simulationId: string) => {
    const sim = simulations.find(s => s.id === simulationId);
    return sim?.createdById === currentUser?.id;
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return 'Illimitato';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  function computeMenuPosition(rect: DOMRect, menuHeight: number, menuWidth: number) {
    const spaceBelow = globalThis.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < menuHeight && spaceAbove > menuHeight + 20;
    // The menu is position:fixed, so coordinates are viewport-relative — never add scroll offsets.
    const top = openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4;
    let left: number;
    if (globalThis.innerWidth < 640 || globalThis.innerWidth - rect.right < menuWidth + 16) {
      const idealLeft = rect.right - menuWidth;
      if (globalThis.innerWidth < menuWidth + 32) {
        left = (globalThis.innerWidth - menuWidth) / 2;
      } else {
        left = Math.max(8, idealLeft);
      }
    } else {
      left = rect.right - menuWidth;
    }
    return { top, left };
  }

  const handleMenuOpen = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition(computeMenuPosition(rect, 320, 208));
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleAssignmentMenuOpen = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setAssignmentMenuPosition(computeMenuPosition(rect, 280, 208));
    setOpenAssignmentMenuId(openAssignmentMenuId === id ? null : id);
  };

  const toggleExpandGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Close menus on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (assignmentMenuRef.current && !assignmentMenuRef.current.contains(e.target as Node)) setOpenAssignmentMenuId(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return {
    // Filter state
    search, setSearch,
    type, setType,
    status, setStatus,
    page, setPage,
    pageSize,
    showFilters, setShowFilters,
    activeTab, setActiveTab,
    assignmentPage, setAssignmentPage,
    assignmentGroupId, setAssignmentGroupId,
    assignmentSimulationId, setAssignmentSimulationId,
    assignmentStatusFilter, setAssignmentStatusFilter,
    // Menu/modal state
    openMenuId, setOpenMenuId,
    menuPosition,
    assignModal, setAssignModal,
    selectedStudentId, setSelectedStudentId,
    editingAssignment, setEditingAssignment,
    editStartDate, setEditStartDate,
    editEndDate, setEditEndDate,
    openAssignmentMenuId, setOpenAssignmentMenuId,
    assignmentMenuPosition,
    expandedGroups,
    // Refs
    menuRef,
    assignmentMenuRef,
    // Queries
    pendingReviewsCount,
    groupsData,
    simulationsData,
    isLoading,
    assignmentsData,
    assignmentsLoading,
    // Derived
    simulations,
    pagination,
    groupedAssignments,
    // Mutations
    closeAssignmentMutation,
    reopenAssignmentMutation,
    removeAssignmentMutation,
    updateAssignmentsMutation,
    publishMutation,
    archiveMutation,
    // Helpers
    canTakeAction,
    canModifySimulation,
    formatDuration,
    handleMenuOpen,
    handleAssignmentMenuOpen,
    toggleExpandGroup,
  };
}
