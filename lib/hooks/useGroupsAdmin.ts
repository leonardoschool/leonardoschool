'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';

type GroupType = 'STUDENTS' | 'COLLABORATORS' | 'MIXED';

export function useGroupsAdmin() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<GroupType | ''>('');
  const [referenceFilter, setReferenceFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [messageGroupId, setMessageGroupId] = useState<string | null>(null);

  const isAdminFilter = referenceFilter.startsWith('admin:');
  const referenceCollaboratorId = !isAdminFilter && referenceFilter ? referenceFilter : undefined;
  const referenceAdminId = isAdminFilter ? referenceFilter.replace('admin:', '') : undefined;

  const { data: groups, isLoading } = trpc.groups.getAll.useQuery({
    search: search || undefined,
    type: typeFilter || undefined,
    includeInactive: true,
    referenceCollaboratorId,
    referenceAdminId,
  });

  const { data: stats } = trpc.groups.getStats.useQuery();
  const { data: collaboratorsForFilter } = trpc.collaborators.getAll.useQuery();
  const { data: adminsForFilter } = trpc.users.getAll.useQuery({ role: 'ADMIN' });

  const { data: selectedGroup, isLoading: loadingGroup } = trpc.groups.getById.useQuery(
    { id: selectedGroupId! },
    { enabled: !!selectedGroupId }
  );

  const createMutation = trpc.groups.create.useMutation({
    onSuccess: () => {
      utils.groups.getAll.invalidate();
      utils.groups.getStats.invalidate();
      showSuccess('Gruppo creato', 'Il gruppo è stato creato con successo.');
      setShowCreateModal(false);
    },
    onError: handleMutationError,
  });

  const updateMutation = trpc.groups.update.useMutation({
    onSuccess: () => {
      utils.groups.getAll.invalidate();
      utils.groups.getById.invalidate();
      showSuccess('Gruppo aggiornato', 'Le modifiche sono state salvate.');
      setEditingGroup(null);
    },
    onError: handleMutationError,
  });

  const deleteMutation = trpc.groups.delete.useMutation({
    onSuccess: (result) => {
      utils.groups.getAll.invalidate();
      utils.groups.getStats.invalidate();
      if (result.deleted) {
        showSuccess('Gruppo eliminato', 'Il gruppo è stato eliminato definitivamente.');
      } else {
        showSuccess('Gruppo disattivato', 'Il gruppo è stato disattivato.');
      }
      if (selectedGroupId === deleteConfirmId) setSelectedGroupId(null);
      setDeleteConfirmId(null);
    },
    onError: handleMutationError,
  });

  const removeMemberMutation = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      utils.groups.getById.invalidate();
      utils.groups.getAll.invalidate();
      showSuccess('Membro rimosso', "L'utente è stato rimosso dal gruppo.");
    },
    onError: handleMutationError,
  });

  return {
    // State
    search, setSearch,
    typeFilter, setTypeFilter,
    referenceFilter, setReferenceFilter,
    showCreateModal, setShowCreateModal,
    editingGroup, setEditingGroup,
    selectedGroupId, setSelectedGroupId,
    deleteConfirmId, setDeleteConfirmId,
    messageGroupId, setMessageGroupId,
    // Queries
    groups, isLoading,
    stats,
    collaboratorsForFilter,
    adminsForFilter,
    selectedGroup, loadingGroup,
    // Mutations
    createMutation,
    updateMutation,
    deleteMutation,
    removeMemberMutation,
  };
}
