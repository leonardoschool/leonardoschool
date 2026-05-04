'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner, PageLoader } from '@/components/ui/loaders';
import { Portal } from '@/components/ui/Portal';
import { UserInfoModal } from '@/components/ui/UserInfoModal';
import {
  Users,
  Search,
  GraduationCap,
  UserCog,
  X,
  Eye,
  UsersRound,
  MessageSquare,
  Send,
  Crown,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { useUserRole } from '@/lib/hooks/useUserRole';

type GroupType = 'STUDENTS' | 'COLLABORATORS' | 'MIXED';

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

// Type for group data from getMyGroups
interface MyGroupData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  type: GroupType;
  memberCount: number;
  isReferent: boolean;
  referenceCollaborator: { user: { id: string; name: string } } | null;
  referenceAdmin: { user: { id: string; name: string } } | null;
  referenceStudent: { user: { id: string; name: string } } | null;
  members: Array<{
    id: string;
    student: { id: string; user: { id: string; name: string; email: string }; matricola?: string } | null;
    collaborator: { id: string; user: { id: string; name: string; email: string } } | null;
  }>;
}

export default function CollaboratorGruppiContent() {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<MyGroupData | null>(null);
  const [messageGroupId, setMessageGroupId] = useState<string | null>(null);

  // Query
  const { data: groups, isLoading } = trpc.groups.getMyGroups.useQuery();

  // Filter groups by search
  const filteredGroups = (groups as MyGroupData[] | undefined)?.filter((group) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query)
    );
  }) || [];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
            I Miei Gruppi
          </h1>
          <p className={colors.text.muted}>
            Gruppi in cui sei referente o partecipante
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className={`${colors.background.card} rounded-xl p-4 border ${colors.border.primary}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${colors.primary.bg} flex items-center justify-center text-white`}>
              <UsersRound className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{groups?.length || 0}</p>
              <p className={`text-sm ${colors.text.muted}`}>Gruppi totali</p>
            </div>
          </div>
        </div>
        <div className={`${colors.background.card} rounded-xl p-4 border ${colors.border.primary}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>
                {(groups as MyGroupData[] | undefined)?.filter(g => g.isReferent).length || 0}
              </p>
              <p className={`text-sm ${colors.text.muted}`}>Come referente</p>
            </div>
          </div>
        </div>
        <div className={`${colors.background.card} rounded-xl p-4 border ${colors.border.primary}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>
                {(groups as MyGroupData[] | undefined)?.filter(g => !g.isReferent).length || 0}
              </p>
              <p className={`text-sm ${colors.text.muted}`}>Come membro</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
        <input
          type="text"
          placeholder="Cerca gruppi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-12 pr-4 py-3 rounded-xl border ${colors.border.primary} ${colors.background.input} ${colors.text.primary}`}
        />
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => (
          <div
            key={group.id}
            className={`${colors.background.card} rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
            style={{ borderColor: group.color || undefined }}
          >
            {/* Header with color */}
            <div
              className="h-2"
              style={{ backgroundColor: group.color || '#6366f1' }}
            />
            <div className="p-4 space-y-3">
              {/* Title & Type */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${colors.text.primary}`}>{group.name}</h3>
                    {group.isReferent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Crown className="w-3 h-3" />
                        Referente
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${colors.text.muted} mt-1`}>
                    {group.description || 'Nessuna descrizione'}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${groupTypeColors[group.type].bg} ${groupTypeColors[group.type].text}`}
                >
                  {groupTypeLabels[group.type]}
                </span>
              </div>

              {/* Stats */}
              <div className={`flex items-center gap-1.5 text-sm ${colors.text.secondary}`}>
                <Users className="w-4 h-4" />
                <span>{group.memberCount} membri</span>
              </div>

              {/* Referent info */}
              {(group.referenceCollaborator || group.referenceAdmin) && (
                <div className={`text-sm ${colors.text.muted}`}>
                  <div className="flex items-center gap-1.5">
                    <UserCog className="w-3.5 h-3.5" />
                    <span>Referente: {group.referenceCollaborator?.user.name || group.referenceAdmin?.user.name}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedGroup(group)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
                >
                  <Eye className="w-4 h-4" />
                  Dettagli
                </button>
                <button
                  onClick={() => setMessageGroupId(group.id)}
                  className={`p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition`}
                  title="Invia messaggio al gruppo"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="col-span-full text-center py-12">
            <UsersRound className={`w-12 h-12 mx-auto mb-4 ${colors.text.muted}`} />
            <p className={colors.text.muted}>
              {groups?.length === 0 
                ? 'Non fai parte di nessun gruppo'
                : 'Nessun gruppo trovato'
              }
            </p>
          </div>
        )}
      </div>

      {/* Group Details Modal */}
      {selectedGroup && (
        <GroupDetailsModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      {/* Message Group Modal */}
      {messageGroupId && (
        <MessageGroupModal
          groupId={messageGroupId}
          groups={groups as MyGroupData[] | undefined}
          onClose={() => setMessageGroupId(null)}
        />
      )}
    </div>
  );
}

// ==================== GROUP DETAILS MODAL (Read-only for collaborators) ====================
interface GroupDetailsModalProps {
  group: MyGroupData;
  onClose: () => void;
}

function GroupDetailsModal({ group, onClose }: GroupDetailsModalProps) {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();
  
  const [selectedUserInfo, setSelectedUserInfo] = useState<{
    id: string;
    type: 'STUDENT' | 'COLLABORATOR';
  } | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchMember, setSearchMember] = useState('');

  // Load students or collaborators based on group type
  const { data: students } = trpc.students.getListForCollaborator.useQuery(
    undefined,
    { enabled: group.isReferent && showAddMember && (group.type === 'STUDENTS' || group.type === 'MIXED') }
  );

  const { data: collaboratorsList } = trpc.collaborators.getListForCalendar.useQuery(
    undefined,
    { enabled: group.isReferent && showAddMember && (group.type === 'COLLABORATORS' || group.type === 'MIXED') }
  );

  const addMemberMutation = trpc.groups.addMember.useMutation({
    onSuccess: () => {
      utils.groups.getMyGroups.invalidate();
      showSuccess('Membro aggiunto', 'Il membro è stato aggiunto al gruppo.');
      setShowAddMember(false);
      setSearchMember('');
    },
    onError: handleMutationError,
  });

  const removeMemberMutation = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      utils.groups.getMyGroups.invalidate();
      showSuccess('Membro rimosso', 'Il membro è stato rimosso dal gruppo.');
    },
    onError: handleMutationError,
  });

  // Filter students for add member
  const filteredStudents = students?.filter((student) => {
    // Already a member?
    const isMember = group.members.some(m => m.student?.id === student.studentId);
    if (isMember) return false;
    
    // Search filter
    if (searchMember) {
      const query = searchMember.toLowerCase();
      return (
        student.name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.matricola?.toLowerCase().includes(query)
      );
    }
    return true;
  }) || [];

  // Filter collaborators for add member
  const filteredCollaborators = collaboratorsList?.filter((collab) => {
    if (!collab.collaborator?.id) return false;
    
    // Already a member?
    const isMember = group.members.some(m => m.collaborator?.id === collab.collaborator?.id);
    if (isMember) return false;
    
    // Search filter
    if (searchMember) {
      const query = searchMember.toLowerCase();
      return (
        collab.name?.toLowerCase().includes(query) ||
        collab.email?.toLowerCase().includes(query)
      );
    }
    return true;
  }) || [];

  // Combined list for display
  const hasMembers = filteredStudents.length > 0 || filteredCollaborators.length > 0;

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
                <div className="flex items-center gap-2">
                  <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
                    {group.name}
                  </h2>
                  {group.isReferent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Crown className="w-3 h-3" />
                      Sei il referente
                    </span>
                  )}
                </div>
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
              {group.isReferent && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${colors.primary.gradient} text-white`}
                >
                  <UserPlus className="w-4 h-4" />
                  Aggiungi
                </button>
              )}
            </div>

            {/* Add Member Section */}
            {group.isReferent && showAddMember && (
              <div className={`mb-4 p-4 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                <h4 className={`text-sm font-medium ${colors.text.primary} mb-3`}>
                  {group.type === 'STUDENTS' && 'Aggiungi studente al gruppo'}
                  {group.type === 'COLLABORATORS' && 'Aggiungi collaboratore al gruppo'}
                  {group.type === 'MIXED' && 'Aggiungi membro al gruppo'}
                </h4>
                
                <input
                  type="text"
                  placeholder={
                    group.type === 'STUDENTS' ? 'Cerca studente...' :
                    group.type === 'COLLABORATORS' ? 'Cerca collaboratore...' :
                    'Cerca...'
                  }
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} mb-3`}
                />

                <div className="max-h-40 overflow-y-auto space-y-1">
                  {!hasMembers ? (
                    <p className={`text-sm ${colors.text.muted} text-center py-4`}>
                      {searchMember ? 'Nessun risultato trovato' : 'Tutti sono già membri'}
                    </p>
                  ) : (
                    <>
                      {/* Students */}
                      {(group.type === 'STUDENTS' || group.type === 'MIXED') && filteredStudents.map((student) => (
                        <button
                          key={`student-${student.id}`}
                          onClick={() => {
                            if (!student.studentId) return;
                            addMemberMutation.mutate({
                              groupId: group.id,
                              studentId: student.studentId,
                            });
                          }}
                          disabled={addMemberMutation.isPending || !student.studentId}
                          className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left ${colors.text.primary}`}
                        >
                          <span className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            <span className="text-sm">{student.name}</span>
                            {student.matricola && (
                              <span className={`text-xs ${colors.text.muted}`}>({student.matricola})</span>
                            )}
                          </span>
                          <UserPlus className="w-4 h-4 opacity-50" />
                        </button>
                      ))}

                      {/* Collaborators */}
                      {(group.type === 'COLLABORATORS' || group.type === 'MIXED') && filteredCollaborators.map((collab) => (
                        <button
                          key={`collaborator-${collab.id}`}
                          onClick={() => {
                            if (!collab.collaborator?.id) return;
                            addMemberMutation.mutate({
                              groupId: group.id,
                              collaboratorId: collab.collaborator.id,
                            });
                          }}
                          disabled={addMemberMutation.isPending || !collab.collaborator?.id}
                          className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left ${colors.text.primary}`}
                        >
                          <span className="flex items-center gap-2">
                            <UserCog className="w-4 h-4" />
                            <span className="text-sm">{collab.name}</span>
                            <span className={`text-xs ${colors.text.muted}`}>({collab.email})</span>
                          </span>
                          <UserPlus className="w-4 h-4 opacity-50" />
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {group.members.map((member) => {
                const user = member.student?.user || member.collaborator?.user;
                const isStudent = !!member.student;
                const matricola = member.student?.matricola;
                const userId = user?.id;

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
                          {group.isReferent && (
                            <button
                              onClick={() => {
                                if (confirm(`Rimuovere ${user?.name} dal gruppo?`)) {
                                  removeMemberMutation.mutate({ memberId: member.id });
                                }
                              }}
                              disabled={removeMemberMutation.isPending}
                              className={`p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500`}
                              title="Rimuovi dal gruppo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
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

      {/* User Info Modal */}
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
  groups: MyGroupData[] | undefined;
  onClose: () => void;
}

function MessageGroupModal({ groupId, groups, onClose }: MessageGroupModalProps) {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const { user } = useUserRole();
  
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Find the group from the already loaded groups
  const group = groups?.find(g => g.id === groupId);

  // Create conversation mutation
  const createConversationMutation = trpc.messages.createConversation.useMutation({
    onError: handleMutationError,
  });

  // Get ALL member user IDs including reference student/collaborator/admin
  const allMemberUserIds = (() => {
    if (!group) return [];
    
    const ids: string[] = [];
    const currentUserId = user?.id;

    // Add reference student
    if (group.referenceStudent?.user?.id) {
      const userId = group.referenceStudent.user.id;
      if (userId !== currentUserId) ids.push(userId);
    }

    // Add reference collaborator
    if (group.referenceCollaborator?.user?.id) {
      const userId = group.referenceCollaborator.user.id;
      if (userId !== currentUserId) ids.push(userId);
    }

    // Add reference admin
    if (group.referenceAdmin?.user?.id) {
      const userId = group.referenceAdmin.user.id;
      if (userId !== currentUserId) ids.push(userId);
    }

    // Add group members
    group.members?.forEach((member) => {
      const userId = member.student?.user.id || member.collaborator?.user.id;
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

  if (!group) {
    return null;
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
                    backgroundColor: group.color ? `${group.color}20` : 'rgba(99,102,241,0.1)',
                    color: group.color || '#6366f1',
                  }}
                >
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                    Invia messaggio al gruppo
                  </h2>
                  <p className={`text-sm ${colors.text.muted}`}>
                    {group.name} ({allMemberUserIds.length} destinatari)
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
                    {group.referenceStudent?.user && group.referenceStudent.user.id !== user?.id && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-300 dark:border-blue-700"
                      >
                        <GraduationCap className="w-3 h-3" />
                        {group.referenceStudent.user.name} (Riferimento)
                      </span>
                    )}
                    
                    {/* Reference Collaborator */}
                    {group.referenceCollaborator?.user && group.referenceCollaborator.user.id !== user?.id && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-300 dark:border-purple-700"
                      >
                        <UserCog className="w-3 h-3" />
                        {group.referenceCollaborator.user.name} (Riferimento)
                      </span>
                    )}
                    
                    {/* Reference Admin */}
                    {group.referenceAdmin?.user && group.referenceAdmin.user.id !== user?.id && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-300 dark:border-purple-700"
                      >
                        <UserCog className="w-3 h-3" />
                        {group.referenceAdmin.user.name} (Riferimento)
                      </span>
                    )}
                    
                    {/* Group Members */}
                    {group.members.slice(0, 5).map((member) => {
                      const memberUser = member.student?.user || member.collaborator?.user;
                      const memberUserId = memberUser?.id;
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
