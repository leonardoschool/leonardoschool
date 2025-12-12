'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner, PageLoader } from '@/components/ui/loaders';
import { Portal } from '@/components/ui/Portal';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserPlus,
  GraduationCap,
  UserCog,
  X,
  Check,
  AlertTriangle,
  Eye,
  UsersRound,
} from 'lucide-react';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import CustomSelect from '@/components/ui/CustomSelect';

type GroupType = 'STUDENTS' | 'COLLABORATORS' | 'MIXED';

// Define group return type manually
interface GroupData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  type: GroupType;
  isActive: boolean;
  referenceStudentId: string | null;
  referenceCollaboratorId: string | null;
  referenceAdminId: string | null;
  referenceStudent: {
    id: string;
    user: { name: string };
  } | null;
  referenceCollaborator: {
    id: string;
    user: { name: string };
  } | null;
  referenceAdmin: {
    id: string;
    user: { name: string };
  } | null;
  members: Array<{
    id: string;
    student: { id: string; user: { name: string; email: string } } | null;
    collaborator: { id: string; user: { name: string; email: string } } | null;
  }>;
  memberCount: number;
}

const groupTypeLabels: Record<GroupType, string> = {
  STUDENTS: 'Solo Studenti',
  COLLABORATORS: 'Solo Collaboratori',
  MIXED: 'Misto',
};

const groupTypeColors: Record<GroupType, { bg: string; text: string; border: string }> = {
  STUDENTS: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700',
  },
  COLLABORATORS: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-300 dark:border-purple-700',
  },
  MIXED: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-300 dark:border-green-700',
  },
};

export default function GroupsPage() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<GroupType | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Queries
  const { data: groups, isLoading } = trpc.groups.getAll.useQuery({
    search: search || undefined,
    type: typeFilter || undefined,
    includeInactive: true,
  });

  const { data: stats } = trpc.groups.getStats.useQuery();

  const { data: selectedGroup, isLoading: loadingGroup } = trpc.groups.getById.useQuery(
    { id: selectedGroupId! },
    { enabled: !!selectedGroupId }
  );

  // Mutations
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
      setDeleteConfirmId(null);
      if (selectedGroupId === deleteConfirmId) {
        setSelectedGroupId(null);
      }
    },
    onError: handleMutationError,
  });

  const removeMemberMutation = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      utils.groups.getById.invalidate();
      utils.groups.getAll.invalidate();
      showSuccess('Membro rimosso', 'L\'utente è stato rimosso dal gruppo.');
    },
    onError: handleMutationError,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
            Gestione Gruppi
          </h1>
          <p className={colors.text.muted}>
            Organizza studenti e collaboratori in gruppi
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`${colors.primary.gradient} text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition`}
        >
          <Plus className="w-5 h-5" />
          Nuovo Gruppo
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${colors.background.card} p-4 rounded-xl border ${colors.border.primary}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <UsersRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.total}</p>
                <p className={`text-sm ${colors.text.muted}`}>Gruppi totali</p>
              </div>
            </div>
          </div>
          <div className={`${colors.background.card} p-4 rounded-xl border ${colors.border.primary}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.active}</p>
                <p className={`text-sm ${colors.text.muted}`}>Attivi</p>
              </div>
            </div>
          </div>
          <div className={`${colors.background.card} p-4 rounded-xl border ${colors.border.primary}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.totalMembers}</p>
                <p className={`text-sm ${colors.text.muted}`}>Membri totali</p>
              </div>
            </div>
          </div>
          <div className={`${colors.background.card} p-4 rounded-xl border ${colors.border.primary}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.byType.STUDENTS || 0}</p>
                <p className={`text-sm ${colors.text.muted}`}>Gruppi studenti</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className={`${colors.background.card} p-4 rounded-xl border ${colors.border.primary}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
            <input
              type="text"
              placeholder="Cerca gruppi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
            />
          </div>
          <div className="w-full md:w-48">
            <CustomSelect
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as GroupType | '')}
              placeholder="Tutti i tipi"
              options={[
                { value: '', label: 'Tutti i tipi' },
                { value: 'STUDENTS', label: 'Solo Studenti' },
                { value: 'COLLABORATORS', label: 'Solo Collaboratori' },
                { value: 'MIXED', label: 'Misti' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups?.map((group) => (
          <div
            key={group.id}
            className={`${colors.background.card} rounded-xl border ${colors.border.primary} overflow-hidden hover:shadow-lg transition-shadow ${!group.isActive ? 'opacity-60' : ''}`}
          >
            {/* Color header */}
            <div
              className="h-2"
              style={{ backgroundColor: group.color || '#6366f1' }}
            />
            
            <div className="p-4 space-y-4">
              {/* Group info */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${colors.text.primary} truncate`}>
                      {group.name}
                    </h3>
                    {!group.isActive && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        Inattivo
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${colors.text.muted} line-clamp-2 mt-1`}>
                    {group.description || 'Nessuna descrizione'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-medium ${groupTypeColors[group.type].bg} ${groupTypeColors[group.type].text}`}
                >
                  {groupTypeLabels[group.type]}
                </span>
              </div>

              {/* Stats and references */}
              <div className="flex items-center gap-4 text-sm">
                <div className={`flex items-center gap-1.5 ${colors.text.secondary}`}>
                  <Users className="w-4 h-4" />
                  <span>{group.memberCount} membri</span>
                </div>
              </div>

              {/* References */}
              {(group.referenceCollaborator || group.referenceAdmin || group.referenceStudent) && (
                <div className={`text-sm ${colors.text.muted} space-y-1`}>
                  {group.referenceCollaborator && (
                    <div className="flex items-center gap-1.5">
                      <UserCog className="w-3.5 h-3.5" />
                      <span>Rif: {group.referenceCollaborator.user.name}</span>
                    </div>
                  )}
                  {group.referenceAdmin && (
                    <div className="flex items-center gap-1.5">
                      <UserCog className="w-3.5 h-3.5" />
                      <span>Rif: {group.referenceAdmin.user.name} (Admin)</span>
                    </div>
                  )}
                  {group.referenceStudent && (
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Rif: {group.referenceStudent.user.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
                >
                  <Eye className="w-4 h-4" />
                  Dettagli
                </button>
                <button
                  onClick={() => setEditingGroup(group.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
                >
                  <Edit2 className="w-4 h-4" />
                  Modifica
                </button>
                <button
                  onClick={() => setDeleteConfirmId(group.id)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {groups?.length === 0 && (
          <div className="col-span-full text-center py-12">
            <UsersRound className={`w-12 h-12 mx-auto mb-4 ${colors.text.muted}`} />
            <p className={colors.text.muted}>Nessun gruppo trovato</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <GroupFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <GroupFormModal
          groupId={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingGroup, ...data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Group Details Modal */}
      {selectedGroupId && (
        <GroupDetailsModal
          group={selectedGroup as unknown as GroupData | null | undefined}
          isLoading={loadingGroup}
          onClose={() => setSelectedGroupId(null)}
          onRemoveMember={(memberId) => removeMemberMutation.mutate({ memberId })}
          isRemovingMember={removeMemberMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${colors.background.card} rounded-xl p-6 max-w-md w-full shadow-xl`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
                  Elimina gruppo
                </h3>
              </div>
              <p className={`${colors.text.secondary} mb-6`}>
                Sei sicuro di voler eliminare questo gruppo? Se il gruppo ha membri verrà disattivato invece che eliminato.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className={`px-4 py-2 rounded-lg ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-gray-800`}
                >
                  Annulla
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: deleteConfirmId })}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? <Spinner size="sm" variant="white" /> : 'Elimina'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

// ==================== GROUP FORM MODAL ====================
interface GroupFormModalProps {
  groupId?: string;
  onClose: () => void;
  onSubmit: (data: {
    name?: string;
    description?: string | null;
    color?: string | null;
    type?: GroupType;
    referenceStudentId?: string | null;
    referenceCollaboratorId?: string | null;
  }) => void;
  isLoading: boolean;
}

function GroupFormModal({ groupId, onClose, onSubmit, isLoading }: GroupFormModalProps) {
  const { data: existingGroup } = trpc.groups.getById.useQuery(
    { id: groupId! },
    { enabled: !!groupId }
  );

  const { data: students } = trpc.students.getAllForAdmin.useQuery();
  const { data: collaborators } = trpc.collaborators.getAll.useQuery();
  
  // Carica anche gli admin per il riferimento collaboratore
  const { data: admins } = trpc.users.getAll.useQuery({ 
    role: 'ADMIN',
    status: 'ALL',
    search: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    type: 'MIXED' as GroupType,
    referenceStudentId: '',
    referenceCollaboratorId: '',
  });

  // Load existing data when it arrives
  useEffect(() => {
    if (existingGroup) {
      const group = existingGroup as unknown as GroupData;
      // Determine collaborator/admin reference value
      let referenceCollaboratorValue = '';
      if (group.referenceAdminId) {
        referenceCollaboratorValue = `admin:${group.referenceAdminId}`;
      } else if (group.referenceCollaboratorId) {
        referenceCollaboratorValue = group.referenceCollaboratorId;
      }
      
      setFormData({
        name: group.name,
        description: group.description || '',
        color: group.color || '#6366f1',
        type: group.type,
        referenceStudentId: group.referenceStudentId || '',
        referenceCollaboratorId: referenceCollaboratorValue,
      });
    }
  }, [existingGroup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Costruisce i dati in base al tipo di gruppo
    const submitData: {
      name: string;
      description?: string | null;
      color?: string | null;
      type: GroupType;
      referenceStudentId?: string | null;
      referenceCollaboratorId?: string | null;
    } = {
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color || undefined,
      type: formData.type,
    };

    // Aggiungi riferimenti solo se pertinenti al tipo
    if (formData.type !== 'STUDENTS') {
      submitData.referenceCollaboratorId = formData.referenceCollaboratorId || undefined;
    }
    if (formData.type !== 'COLLABORATORS') {
      submitData.referenceStudentId = formData.referenceStudentId || undefined;
    }

    onSubmit(submitData);
  };

  // Type definitions for the user lists
  type UserWithStudent = { id: string; name: string; student?: { id: string } };
  type UserWithCollaborator = { id: string; name: string; role?: string; collaborator?: { id: string }; admin?: { id: string } };

  const studentOptions = [
    { value: '', label: 'Nessuno' },
    ...((students as unknown as UserWithStudent[] | undefined)
      ?.filter((s) => s.student?.id) // Solo utenti con profilo studente
      .map((s) => ({
        value: s.student!.id,
        label: s.name || 'N/A',
      })) || []),
  ];

  // Combina collaboratori e admin per il riferimento
  const collaboratorOptionsList: { value: string; label: string }[] = [];
  
  // Aggiungi collaboratori
  (collaborators as unknown as UserWithCollaborator[] | undefined)
    ?.filter((c) => c.collaborator?.id)
    .forEach((c) => {
      collaboratorOptionsList.push({
        value: c.collaborator!.id,
        label: c.name || 'N/A',
      });
    });

  // Aggiungi admin (evidenziati)
  (admins?.users as unknown as UserWithCollaborator[] | undefined)
    ?.filter((a) => a.admin?.id)
    .forEach((a) => {
      collaboratorOptionsList.push({
        value: `admin:${a.admin!.id}`, // Prefisso per distinguere
        label: `${a.name || 'N/A'} (Admin)`,
      });
    });

  const collaboratorOptions = [
    { value: '', label: 'Nessuno' },
    ...collaboratorOptionsList,
  ];

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={`${colors.background.card} rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
              {groupId ? 'Modifica Gruppo' : 'Nuovo Gruppo'}
            </h2>
            <button onClick={onClose} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Nome del gruppo
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Es: Classe A - Biologia"
                className={`w-full px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrizione opzionale..."
                rows={3}
                className={`w-full px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                  Colore
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-10 h-10 cursor-pointer opacity-0 absolute inset-0"
                    />
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: formData.color }}
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className={`flex-1 px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                  Tipo di gruppo
                </label>
                <CustomSelect
                  value={formData.type}
                  onChange={(v) => {
                    const newType = v as GroupType;
                    setFormData({ 
                      ...formData, 
                      type: newType,
                      // Reset riferimenti non pertinenti al nuovo tipo
                      referenceStudentId: newType === 'COLLABORATORS' ? '' : formData.referenceStudentId,
                      referenceCollaboratorId: newType === 'STUDENTS' ? '' : formData.referenceCollaboratorId,
                    });
                  }}
                  options={[
                    { value: 'MIXED', label: 'Misto' },
                    { value: 'STUDENTS', label: 'Solo Studenti' },
                    { value: 'COLLABORATORS', label: 'Solo Collaboratori' },
                  ]}
                />
              </div>
            </div>

            {/* Collaboratore di riferimento - solo se non è gruppo STUDENTS */}
            {formData.type !== 'STUDENTS' && (
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                  Collaboratore di riferimento
                </label>
                <CustomSelect
                  value={formData.referenceCollaboratorId}
                  onChange={(v) => setFormData({ ...formData, referenceCollaboratorId: v })}
                  options={collaboratorOptions}
                  placeholder="Seleziona collaboratore..."
                  searchable
                />
              </div>
            )}

            {/* Studente di riferimento - solo se non è gruppo COLLABORATORS */}
            {formData.type !== 'COLLABORATORS' && (
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                  Studente di riferimento
                </label>
                <CustomSelect
                  value={formData.referenceStudentId}
                  onChange={(v) => setFormData({ ...formData, referenceStudentId: v })}
                  options={studentOptions}
                  placeholder="Seleziona studente..."
                  searchable
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-4 py-2.5 rounded-lg ${colors.text.secondary} border ${colors.border.primary} hover:bg-gray-100 dark:hover:bg-gray-800`}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.name}
                className={`flex-1 ${colors.primary.gradient} text-white px-4 py-2.5 rounded-lg disabled:opacity-50`}
              >
                {isLoading ? <Spinner size="sm" variant="white" /> : groupId ? 'Salva' : 'Crea'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

// ==================== GROUP DETAILS MODAL ====================
interface GroupDetailsModalProps {
  group: GroupData | null | undefined;
  isLoading: boolean;
  onClose: () => void;
  onRemoveMember: (memberId: string) => void;
  isRemovingMember: boolean;
}

function GroupDetailsModal({ group, isLoading, onClose, onRemoveMember, isRemovingMember }: GroupDetailsModalProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberType, setMemberType] = useState<'STUDENT' | 'COLLABORATOR'>('STUDENT');
  const [searchMember, setSearchMember] = useState('');

  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  const { data: availableUsers } = trpc.groups.getAvailableUsers.useQuery(
    {
      groupId: group?.id || '',
      userType: memberType,
      search: searchMember || undefined,
    },
    { enabled: !!group && showAddMember }
  );

  const addMemberMutation = trpc.groups.addMember.useMutation({
    onSuccess: () => {
      utils.groups.getById.invalidate();
      utils.groups.getAll.invalidate();
      showSuccess('Membro aggiunto', 'L\'utente è stato aggiunto al gruppo.');
      setSearchMember('');
    },
    onError: handleMutationError,
  });

  if (isLoading || !group) {
    return (
      <Portal>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Spinner size="lg" />
        </div>
      </Portal>
    );
  }

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={`${colors.background.card} rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col`}>
          {/* Header */}
          <div
            className="p-6 border-b"
            style={{
              borderColor: group.color || undefined,
              backgroundColor: group.color ? `${group.color}15` : undefined,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
                  {group.name}
                </h2>
                <p className={`text-sm ${colors.text.muted}`}>
                  {group.description || 'Nessuna descrizione'}
                </p>
              </div>
              <button onClick={onClose} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400`}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-medium ${colors.text.primary}`}>
                Membri ({group.members.length})
              </h3>
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${colors.primary.bg} text-white hover:opacity-90`}
              >
                <UserPlus className="w-4 h-4" />
                Aggiungi
              </button>
            </div>

            {/* Add Member Panel */}
            {showAddMember && (
              <div className={`mb-4 p-4 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                <div className="flex gap-2 mb-3">
                  {(group.type === 'MIXED' || group.type === 'STUDENTS') && (
                    <button
                      onClick={() => setMemberType('STUDENT')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        memberType === 'STUDENT'
                          ? `${colors.primary.bg} text-white`
                          : `${colors.background.input} ${colors.text.secondary}`
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 inline mr-1.5" />
                      Studenti
                    </button>
                  )}
                  {(group.type === 'MIXED' || group.type === 'COLLABORATORS') && (
                    <button
                      onClick={() => setMemberType('COLLABORATOR')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        memberType === 'COLLABORATOR'
                          ? `${colors.primary.bg} text-white`
                          : `${colors.background.input} ${colors.text.secondary}`
                      }`}
                    >
                      <UserCog className="w-4 h-4 inline mr-1.5" />
                      Collaboratori
                    </button>
                  )}
                </div>

                <div className="relative mb-3">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.text.muted}`} />
                  <input
                    type="text"
                    placeholder="Cerca utente..."
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm`}
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1">
                  {availableUsers?.map((user) => (
                    <button
                      key={user.id}
                      onClick={() =>
                        addMemberMutation.mutate({
                          groupId: group.id,
                          studentId: memberType === 'STUDENT' ? user.id : undefined,
                          collaboratorId: memberType === 'COLLABORATOR' ? user.id : undefined,
                        })
                      }
                      disabled={addMemberMutation.isPending}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left`}
                    >
                      <div>
                        <p className={`font-medium ${colors.text.primary}`}>{user.name}</p>
                        <p className={`text-xs ${colors.text.muted}`}>{user.email}</p>
                      </div>
                      <Plus className="w-4 h-4 text-green-500" />
                    </button>
                  ))}
                  {availableUsers?.length === 0 && (
                    <p className={`text-center py-4 ${colors.text.muted} text-sm`}>
                      Nessun utente disponibile
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2">
              {group.members.map((member) => {
                const user = member.student?.user || member.collaborator?.user;
                const isStudent = !!member.student;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isStudent
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        {isStudent ? (
                          <GraduationCap className="w-5 h-5" />
                        ) : (
                          <UserCog className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${colors.text.primary}`}>{user?.name}</p>
                        <p className={`text-sm ${colors.text.muted}`}>{user?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveMember(member.id)}
                      disabled={isRemovingMember}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {group.members.length === 0 && (
                <p className={`text-center py-8 ${colors.text.muted}`}>
                  Nessun membro nel gruppo
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className={`w-full py-2.5 rounded-lg ${colors.text.secondary} border ${colors.border.primary} hover:bg-gray-100 dark:hover:bg-gray-800`}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
