'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner, PageLoader } from '@/components/ui/loaders';
import { Portal } from '@/components/ui/Portal';
import { UserInfoModal } from '@/components/ui/UserInfoModal';
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
  AlertTriangle,
  Eye,
  UsersRound,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { useUserRole } from '@/lib/hooks/useUserRole';
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

export default function AdminGruppiContent() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<GroupType | ''>('');
  const [referenceFilter, setReferenceFilter] = useState<string>(''); // "collab:ID" or "admin:ID"
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [messageGroupId, setMessageGroupId] = useState<string | null>(null);

  // Parse reference filter
  const isAdminFilter = referenceFilter.startsWith('admin:');
  const referenceCollaboratorId = !isAdminFilter && referenceFilter ? referenceFilter : undefined;
  const referenceAdminId = isAdminFilter ? referenceFilter.replace('admin:', '') : undefined;

  // Queries
  const { data: groups, isLoading } = trpc.groups.getAll.useQuery({
    search: search || undefined,
    type: typeFilter || undefined,
    includeInactive: true,
    referenceCollaboratorId,
    referenceAdminId,
  });

  const { data: stats } = trpc.groups.getStats.useQuery();
  
  // Query per popolare il filtro collaboratori
  const { data: collaboratorsForFilter } = trpc.collaborators.getAll.useQuery();
  const { data: adminsForFilter } = trpc.users.getAll.useQuery({ role: 'ADMIN' });

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

      {/* Quick Filters - Filtri rapidi cliccabili per tipo */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Tutti i gruppi */}
          <button
            onClick={() => setTypeFilter('')}
            className={`${colors.background.card} p-4 rounded-xl border transition-all duration-200 ${
              typeFilter === '' 
                ? 'border-red-500 ring-2 ring-red-500/20' 
                : `${colors.border.primary} hover:border-gray-400 dark:hover:border-gray-500`
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                typeFilter === '' 
                  ? 'bg-red-100 dark:bg-red-900/30' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <UsersRound className={`w-5 h-5 ${
                  typeFilter === '' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="text-left">
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.total}</p>
                <p className={`text-sm ${colors.text.muted}`}>Tutti</p>
              </div>
            </div>
          </button>

          {/* Gruppi Misti */}
          <button
            onClick={() => setTypeFilter(typeFilter === 'MIXED' ? '' : 'MIXED')}
            className={`${colors.background.card} p-4 rounded-xl border transition-all duration-200 ${
              typeFilter === 'MIXED' 
                ? 'border-green-500 ring-2 ring-green-500/20' 
                : `${colors.border.primary} hover:border-gray-400 dark:hover:border-gray-500`
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                typeFilter === 'MIXED' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Users className={`w-5 h-5 ${
                  typeFilter === 'MIXED' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="text-left">
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.byType.MIXED || 0}</p>
                <p className={`text-sm ${colors.text.muted}`}>Misti</p>
              </div>
            </div>
          </button>

          {/* Gruppi Solo Studenti */}
          <button
            onClick={() => setTypeFilter(typeFilter === 'STUDENTS' ? '' : 'STUDENTS')}
            className={`${colors.background.card} p-4 rounded-xl border transition-all duration-200 ${
              typeFilter === 'STUDENTS' 
                ? 'border-blue-500 ring-2 ring-blue-500/20' 
                : `${colors.border.primary} hover:border-gray-400 dark:hover:border-gray-500`
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                typeFilter === 'STUDENTS' 
                  ? 'bg-blue-100 dark:bg-blue-900/30' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <GraduationCap className={`w-5 h-5 ${
                  typeFilter === 'STUDENTS' 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="text-left">
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.byType.STUDENTS || 0}</p>
                <p className={`text-sm ${colors.text.muted}`}>Studenti</p>
              </div>
            </div>
          </button>

          {/* Gruppi Solo Collaboratori */}
          <button
            onClick={() => setTypeFilter(typeFilter === 'COLLABORATORS' ? '' : 'COLLABORATORS')}
            className={`${colors.background.card} p-4 rounded-xl border transition-all duration-200 ${
              typeFilter === 'COLLABORATORS' 
                ? 'border-purple-500 ring-2 ring-purple-500/20' 
                : `${colors.border.primary} hover:border-gray-400 dark:hover:border-gray-500`
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                typeFilter === 'COLLABORATORS' 
                  ? 'bg-purple-100 dark:bg-purple-900/30' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <UserCog className={`w-5 h-5 ${
                  typeFilter === 'COLLABORATORS' 
                    ? 'text-purple-600 dark:text-purple-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="text-left">
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.byType.COLLABORATORS || 0}</p>
                <p className={`text-sm ${colors.text.muted}`}>Collaboratori</p>
              </div>
            </div>
          </button>
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
          <div className="w-full md:w-56">
            <CustomSelect
              value={referenceFilter}
              onChange={(v) => setReferenceFilter(v)}
              placeholder="Tutti i responsabili"
              searchable
              options={[
                { value: '', label: 'Tutti i responsabili' },
                // Collaboratori
                ...((collaboratorsForFilter as unknown as Array<{name: string; collaborator?: {id: string}}>)
                  ?.filter((c) => c.collaborator?.id)
                  .map((c) => ({
                    value: c.collaborator!.id,
                    label: c.name || 'N/A',
                  })) || []),
                // Admin
                ...((adminsForFilter?.users as unknown as Array<{name: string; admin?: {id: string}}>)
                  ?.filter((a) => a.admin?.id)
                  .map((a) => ({
                    value: `admin:${a.admin!.id}`,
                    label: `${a.name || 'N/A'} — 👑 Admin`,
                  })) || []),
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
                      <b>Collaboratore:</b> <span> {group.referenceCollaborator.user.name}</span>
                    </div>
                  )}
                  {group.referenceAdmin && (
                    <div className="flex items-center gap-1.5">
                      <UserCog className="w-3.5 h-3.5" />
                      <b>Collaboratore:</b> <span> {group.referenceAdmin.user.name}</span>
                    </div>
                  )}
                  {group.referenceStudent && (
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <b>Riferimento studenti:</b> <span> {group.referenceStudent.user.name}</span>
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
                  onClick={() => setMessageGroupId(group.id)}
                  className={`p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition`}
                  title="Invia messaggio al gruppo"
                >
                  <MessageSquare className="w-4 h-4" />
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

      {/* Message Group Modal */}
      {messageGroupId && (
        <MessageGroupModal
          groupId={messageGroupId}
          onClose={() => setMessageGroupId(null)}
        />
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
    isActive: true,
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
        isActive: group.isActive,
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
      isActive?: boolean;
    } = {
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color || undefined,
      type: formData.type,
    };

    // Aggiungi isActive solo se siamo in modifica (groupId esiste)
    if (groupId) {
      submitData.isActive = formData.isActive;
    }

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
  type UserWithCollaborator = { 
    id: string; 
    name: string; 
    role?: string; 
    collaborator?: { 
      id: string;
      subjects?: Array<{ 
        id: string;
        subject: { id: string; name: string; code: string; color: string | null };
      }>;
    }; 
    admin?: { id: string } 
  };

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
  
  // Aggiungi collaboratori con materie
  (collaborators as unknown as UserWithCollaborator[] | undefined)
    ?.filter((c) => c.collaborator?.id)
    .forEach((c) => {
      const subjects = c.collaborator?.subjects || [];
      const subjectStr = subjects.length > 0 
        ? ` — ${subjects.map(s => s.subject.code || s.subject.name).join(', ')}`
        : '';
      collaboratorOptionsList.push({
        value: c.collaborator!.id,
        label: `${c.name || 'N/A'}${subjectStr}`,
      });
    });

  // Aggiungi admin (stilizzati meglio)
  (admins?.users as unknown as UserWithCollaborator[] | undefined)
    ?.filter((a) => a.admin?.id)
    .forEach((a) => {
      collaboratorOptionsList.push({
        value: `admin:${a.admin!.id}`, // Prefisso per distinguere
        label: `${a.name || 'N/A'} — 👑 Admin`,
      });
    });

  const collaboratorOptions = [
    { value: '', label: 'Nessuno' },
    ...collaboratorOptionsList,
  ];

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={`${colors.background.card} rounded-xl w-full max-w-lg max-h-[90vh] overflow-visible shadow-xl`}>
          <div className="max-h-[90vh] overflow-y-auto rounded-xl">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-inherit z-10">
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

            {/* Stato attivo/inattivo - solo in modifica */}
            {groupId && (
              <div className={`flex items-center justify-between p-3 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
                <div>
                  <label className={`text-sm font-medium ${colors.text.primary}`}>
                    Gruppo attivo
                  </label>
                  <p className={`text-xs ${colors.text.muted} mt-0.5`}>
                    {formData.isActive 
                      ? 'Il gruppo è visibile e utilizzabile' 
                      : 'Il gruppo è nascosto e non utilizzabile'
                    }
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
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
  // Set default memberType based on group type
  const defaultMemberType = group?.type === 'COLLABORATORS' ? 'COLLABORATOR' : 'STUDENT';
  const [memberType, setMemberType] = useState<'STUDENT' | 'COLLABORATOR'>(defaultMemberType);
  const [searchMember, setSearchMember] = useState('');
  const [selectedUserInfo, setSelectedUserInfo] = useState<{
    id: string;
    type: 'STUDENT' | 'COLLABORATOR';
  } | null>(null);

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
                    <div
                      key={user.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${colors.text.primary} truncate`}>{user.name}</p>
                          {user.groups && user.groups.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {user.groups.slice(0, 2).map((g) => (
                                <span
                                  key={g.id}
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: g.color ? `${g.color}20` : 'rgba(100,100,100,0.1)',
                                    color: g.color || undefined,
                                  }}
                                  title={g.name}
                                >
                                  {g.name.length > 10 ? g.name.slice(0, 10) + '...' : g.name}
                                </span>
                              ))}
                              {user.groups.length > 2 && (
                                <span className={`text-xs ${colors.text.muted}`}>
                                  +{user.groups.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <p className={`text-xs ${colors.text.muted} truncate`}>
                          {user.type === 'STUDENT' && 'matricola' in user ? user.matricola : user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUserInfo({
                            id: user.userId,
                            type: user.type,
                          })}
                          className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 ${colors.text.secondary}`}
                          title="Info utente"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            addMemberMutation.mutate({
                              groupId: group.id,
                              studentId: memberType === 'STUDENT' ? user.id : undefined,
                              collaboratorId: memberType === 'COLLABORATOR' ? user.id : undefined,
                            })
                          }
                          disabled={addMemberMutation.isPending}
                          className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                          title="Aggiungi al gruppo"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
                const matricola = (member.student as { matricola?: string })?.matricola;
                const userId = (member.student?.user as { id?: string })?.id || (member.collaborator?.user as { id?: string })?.id;

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
                        <p className={`text-sm ${colors.text.muted}`}>
                          {isStudent ? matricola : user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {userId && (
                        <>
                          <a
                            href={`/messaggi?nuovo=${userId}`}
                            className={`p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500`}
                            title="Invia messaggio"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setSelectedUserInfo({
                              id: userId,
                              type: isStudent ? 'STUDENT' : 'COLLABORATOR',
                            })}
                            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${colors.text.secondary}`}
                            title="Info utente"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onRemoveMember(member.id)}
                        disabled={isRemovingMember}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
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

      {/* User Info Modal - Usando il componente riutilizzabile */}
      {selectedUserInfo && (
        <UserInfoModal
          userId={selectedUserInfo.id}
          userType={selectedUserInfo.type}
          isOpen={!!selectedUserInfo}
          onClose={() => setSelectedUserInfo(null)}
        />
      )}
    </Portal>
  );
}

// ==================== MESSAGE GROUP MODAL ====================
interface MessageGroupModalProps {
  groupId: string;
  onClose: () => void;
}

function MessageGroupModal({ groupId, onClose }: MessageGroupModalProps) {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const { user } = useUserRole();
  
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Get group details with members
  const { data: group, isLoading } = trpc.groups.getById.useQuery({ id: groupId });

  // Create conversation mutation
  const createConversationMutation = trpc.messages.createConversation.useMutation({
    onError: handleMutationError,
  });

  // Get ALL member user IDs including reference student/collaborator/admin
  const allMemberUserIds = (() => {
    const ids: string[] = [];
    const currentUserId = user?.id;

    // Add reference student
    if (group?.referenceStudent?.user) {
      const userId = (group.referenceStudent.user as { id?: string })?.id;
      if (userId && userId !== currentUserId) ids.push(userId);
    }

    // Add reference collaborator
    if (group?.referenceCollaborator?.user) {
      const userId = (group.referenceCollaborator.user as { id?: string })?.id;
      if (userId && userId !== currentUserId) ids.push(userId);
    }

    // Add reference admin
    if (group?.referenceAdmin?.user) {
      const userId = (group.referenceAdmin.user as { id?: string })?.id;
      if (userId && userId !== currentUserId) ids.push(userId);
    }

    // Add group members
    group?.members?.forEach((member) => {
      const user = member.student?.user || member.collaborator?.user;
      const userId = (user as { id?: string })?.id;
      if (userId && userId !== currentUserId && !ids.includes(userId)) {
        ids.push(userId);
      }
    });

    return ids;
  })();

  const handleSend = async () => {
    if (allMemberUserIds.length === 0 || !subject.trim() || !content.trim()) return;

    setIsSending(true);
    try {
      // Send to all group members (excluding current user)
      for (const recipientId of allMemberUserIds) {
        await createConversationMutation.mutateAsync({
          recipientId,
          subject: subject.trim(),
          content: content.trim(),
        });
      }
      showSuccess(
        'Messaggio inviato',
        `Messaggio inviato a ${allMemberUserIds.length} membri del gruppo.`
      );
      onClose();
    } catch {
      // Error handled by mutation
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
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
        <div className={`${colors.background.card} rounded-xl w-full max-w-lg shadow-xl`}>
          {/* Header */}
          <div className={`p-6 border-b ${colors.border.primary}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: group?.color ? `${group.color}20` : 'rgba(99,102,241,0.1)',
                    color: group?.color || '#6366f1',
                  }}
                >
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                    Invia messaggio al gruppo
                  </h2>
                  <p className={`text-sm ${colors.text.muted}`}>
                    {group?.name} ({allMemberUserIds.length} destinatari)
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${colors.text.secondary}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {allMemberUserIds.length === 0 ? (
              <div className={`text-center py-8 ${colors.text.muted}`}>
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Il gruppo non ha membri</p>
              </div>
            ) : (
              <>
                {/* Recipients preview */}
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                    Destinatari
                  </label>
                  <div className={`flex flex-wrap gap-2 p-3 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
                    {/* Reference Student */}
                    {group?.referenceStudent?.user && (group.referenceStudent.user as { id?: string })?.id !== user?.id && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-300 dark:border-blue-700"
                      >
                        <GraduationCap className="w-3 h-3" />
                        {group.referenceStudent.user.name} (Riferimento)
                      </span>
                    )}
                    
                    {/* Reference Collaborator */}
                    {group?.referenceCollaborator?.user && (group.referenceCollaborator.user as { id?: string })?.id !== user?.id && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-300 dark:border-purple-700"
                      >
                        <UserCog className="w-3 h-3" />
                        {group.referenceCollaborator.user.name} (Riferimento)
                      </span>
                    )}
                    
                    {/* Reference Admin */}
                    {group?.referenceAdmin?.user && (group.referenceAdmin.user as { id?: string })?.id !== user?.id && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-300 dark:border-purple-700"
                      >
                        <UserCog className="w-3 h-3" />
                        {group.referenceAdmin.user.name} (Riferimento)
                      </span>
                    )}
                    
                    {/* Group Members */}
                    {group?.members.slice(0, 5).map((member) => {
                      const memberUser = member.student?.user || member.collaborator?.user;
                      const memberUserId = (memberUser as { id?: string })?.id;
                      if (memberUserId === user?.id) return null; // Skip current user
                      
                      const isStudent = !!member.student;
                      return (
                        <span
                          key={member.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isStudent
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}
                        >
                          {isStudent ? (
                            <GraduationCap className="w-3 h-3" />
                          ) : (
                            <UserCog className="w-3 h-3" />
                          )}
                          {memberUser?.name}
                        </span>
                      );
                    })}
                    {allMemberUserIds.length > 5 && (
                      <span className={`px-2.5 py-1 rounded-full text-xs ${colors.text.muted}`}>
                        +{allMemberUserIds.length - 5} altri
                      </span>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                    Oggetto
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Inserisci l'oggetto del messaggio..."
                    className={`w-full px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary}`}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                    Messaggio
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Scrivi il tuo messaggio..."
                    rows={5}
                    className={`w-full px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} resize-none`}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t ${colors.border.primary} flex gap-3`}>
            <button
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-lg ${colors.text.secondary} border ${colors.border.primary} hover:bg-gray-100 dark:hover:bg-gray-800`}
            >
              Annulla
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || allMemberUserIds.length === 0 || !subject.trim() || !content.trim()}
              className={`flex-1 ${colors.primary.gradient} text-white py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isSending ? (
                <Spinner size="sm" variant="white" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Invia a tutti
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
