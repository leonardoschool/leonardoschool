'use client';

import { useState } from 'react';
import { Portal } from '@/components/ui/Portal';
import { colors } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/loaders';
import { UserInfoModal } from '@/components/ui/UserInfoModal';
import {
  X,
  Users,
  GraduationCap,
  UserCog,
  Crown,
  Calendar,
  Eye,
} from 'lucide-react';

export interface GroupInfoModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Interfacce per i dati del gruppo
interface GroupMember {
  id: string;
  student: {
    id: string;
    user: { id: string; name: string; email: string };
  } | null;
  collaborator: {
    id: string;
    user: { id: string; name: string; email: string };
  } | null;
}

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  type: 'STUDENTS' | 'COLLABORATORS' | 'MIXED';
  isActive: boolean;
  createdAt: Date | string;
  referenceStudent: {
    id: string;
    user: { id: string; name: string };
  } | null;
  referenceCollaborator: {
    id: string;
    user: { id: string; name: string };
  } | null;
  referenceAdmin: {
    id: string;
    user: { id: string; name: string };
  } | null;
  members: GroupMember[];
  memberCount?: number;
}

const groupTypeLabels: Record<string, string> = {
  STUDENTS: 'Solo Studenti',
  COLLABORATORS: 'Solo Collaboratori',
  MIXED: 'Misto',
};

const groupTypeColors: Record<string, { bg: string; text: string }> = {
  STUDENTS: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
  },
  COLLABORATORS: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
  },
  MIXED: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
  },
};

export function GroupInfoModal({ groupId, isOpen, onClose }: GroupInfoModalProps) {
  const [selectedUserInfo, setSelectedUserInfo] = useState<{ userId: string; userType: 'STUDENT' | 'COLLABORATOR' } | null>(null);
  
  const { 
    data: groupData, 
    isLoading,
    error 
  } = trpc.groups.getPublicInfo.useQuery(
    { id: groupId },
    { enabled: isOpen && !!groupId, retry: false }
  );

  if (!isOpen) return null;

  // Messaggio di errore user-friendly
  const getErrorMessage = (): string | null => {
    if (!error) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (error as any)?.data?.code;
    if (code === 'NOT_FOUND') {
      return 'Gruppo non trovato o non più disponibile.';
    }
    if (code === 'FORBIDDEN' || code === 'UNAUTHORIZED') {
      return 'Non hai i permessi per visualizzare questo gruppo.';
    }
    return 'Si è verificato un errore nel caricamento del gruppo.';
  };

  const errorMessage = getErrorMessage();
  const group = groupData as unknown as GroupData | undefined;

  return (
    <>
    <Portal>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
        onClick={onClose}
      >
        <div
          className={`${colors.background.card} rounded-xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : errorMessage ? (
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                  <X className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${colors.text.primary}`}>Errore</h2>
                </div>
              </div>
              <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
                <p className={`text-center ${colors.text.secondary}`}>
                  {errorMessage}
                </p>
              </div>
              <button
                onClick={onClose}
                className={`w-full mt-4 px-4 py-2.5 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:opacity-80 transition-opacity font-medium`}
              >
                Chiudi
              </button>
            </div>
          ) : !group ? (
            <div className="p-6">
              <p className={colors.text.muted}>Gruppo non trovato</p>
            </div>
          ) : (
            <>
              {/* Header con colore del gruppo */}
              <div
                className="p-6 border-b relative"
                style={{
                  borderColor: group.color || undefined,
                  backgroundColor: group.color ? `${group.color}20` : undefined,
                }}
              >
                <button
                  onClick={onClose}
                  className={`absolute top-4 right-4 p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 ${colors.text.secondary}`}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: group.color || '#6366f1' }}
                  >
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-xl font-bold ${colors.text.primary}`}>
                        {group.name}
                      </h2>
                      {!group.isActive && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          Inattivo
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${colors.text.muted} mt-1`}>
                      {group.description || 'Nessuna descrizione'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${groupTypeColors[group.type]?.bg} ${groupTypeColors[group.type]?.text}`}>
                        {groupTypeLabels[group.type]}
                      </span>
                      <span className={`text-sm ${colors.text.secondary} flex items-center gap-1`}>
                        <Users className="w-3.5 h-3.5" />
                        {group.memberCount} membri
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto">
                {/* Referenti */}
                {(group.referenceCollaborator || group.referenceAdmin || group.referenceStudent) && (
                  <div>
                    <h3 className={`text-sm font-semibold ${colors.text.primary} mb-3 flex items-center gap-2`}>
                      <Crown className="w-4 h-4 text-amber-500" />
                      Referenti
                    </h3>
                    <div className="space-y-2">
                      {group.referenceAdmin && (
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${colors.background.secondary}`}>
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${colors.text.primary}`}>{group.referenceAdmin.user.name}</p>
                            <p className={`text-xs ${colors.text.muted}`}>Admin</p>
                          </div>
                        </div>
                      )}
                      {group.referenceCollaborator && (
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${colors.background.secondary}`}>
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <UserCog className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${colors.text.primary}`}>{group.referenceCollaborator.user.name}</p>
                            <p className={`text-xs ${colors.text.muted}`}>Collaboratore referente</p>
                          </div>
                          <button
                            onClick={() => setSelectedUserInfo({
                              userId: group.referenceCollaborator!.user.id,
                              userType: 'COLLABORATOR'
                            })}
                            className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 ${colors.text.secondary}`}
                            title="Info utente"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {group.referenceStudent && (
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${colors.background.secondary}`}>
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${colors.text.primary}`}>{group.referenceStudent.user.name}</p>
                            <p className={`text-xs ${colors.text.muted}`}>Studente referente</p>
                          </div>
                          <button
                            onClick={() => setSelectedUserInfo({
                              userId: group.referenceStudent!.user.id,
                              userType: 'STUDENT'
                            })}
                            className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 ${colors.text.secondary}`}
                            title="Info utente"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Membri */}
                <div>
                  <h3 className={`text-sm font-semibold ${colors.text.primary} mb-3 flex items-center gap-2`}>
                    <Users className="w-4 h-4" />
                    Membri ({group.members.length})
                  </h3>
                  {group.members.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {group.members.map((member) => {
                        const user = member.student?.user || member.collaborator?.user;
                        const isStudent = !!member.student;
                        const userId = user?.id;
                        
                        return (
                          <div
                            key={member.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg ${colors.background.secondary}`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isStudent
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                              }`}
                            >
                              {isStudent ? (
                                <GraduationCap className="w-4 h-4" />
                              ) : (
                                <UserCog className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium ${colors.text.primary} truncate`}>{user?.name}</p>
                              <p className={`text-xs ${colors.text.muted} truncate`}>{user?.email}</p>
                            </div>
                            {userId && (
                              <button
                                onClick={() => setSelectedUserInfo({
                                  userId,
                                  userType: isStudent ? 'STUDENT' : 'COLLABORATOR'
                                })}
                                className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 ${colors.text.secondary}`}
                                title="Info utente"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={`text-sm ${colors.text.muted} italic`}>Nessun membro nel gruppo</p>
                  )}
                </div>

                {/* Info aggiuntive */}
                <div className={`pt-4 border-t ${colors.border.primary}`}>
                  <div className={`flex items-center gap-2 text-xs ${colors.text.muted}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Creato il {new Date(group.createdAt).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`p-4 border-t ${colors.border.primary}`}>
                <button
                  onClick={onClose}
                  className={`w-full py-2.5 rounded-lg ${colors.text.secondary} border ${colors.border.primary} hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
                >
                  Chiudi
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>

    {/* User Info Modal */}
    {selectedUserInfo && (
      <UserInfoModal
        userId={selectedUserInfo.userId}
        userType={selectedUserInfo.userType}
        isOpen={true}
        onClose={() => setSelectedUserInfo(null)}
      />
    )}
    </>
  );
}
