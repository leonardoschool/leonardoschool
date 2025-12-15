'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import Link from 'next/link';
import {
  UsersRound,
  Users,
  User,
  Crown,
  Calendar,
  MessageSquare,
  UserCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const groupTypeLabels: Record<string, string> = {
  STUDENTS: 'Studenti',
  COLLABORATORS: 'Collaboratori',
  MIXED: 'Misto',
};

export default function StudentGruppoContent() {
  const { data: groups, isLoading } = trpc.students.getMyGroup.useQuery();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className={`p-3 rounded-xl ${colors.primary.gradient}`}>
            <UsersRound className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>I Miei Gruppi</h1>
            <p className={colors.text.muted}>Visualizza i tuoi gruppi di studio</p>
          </div>
        </div>
        <div className={`text-center py-16 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
          <UsersRound className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted} opacity-50`} />
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>
            Non fai parte di nessun gruppo
          </h2>
          <p className={`${colors.text.muted} max-w-md mx-auto`}>
            Non sei ancora stato assegnato a un gruppo di studio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${colors.primary.gradient}`}>
          <UsersRound className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
            {groups.length === 1 ? 'Il Mio Gruppo' : 'I Miei Gruppi'}
          </h1>
          <p className={colors.text.muted}>
            {groups.length === 1 ? 'Visualizza il tuo gruppo di studio' : `Fai parte di ${groups.length} gruppi di studio`}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          
          // Sort members: current user first, then collaborators, then by name
          const sortedMembers = [...group.members].sort((a, b) => {
            if (a.isCurrentUser) return -1;
            if (b.isCurrentUser) return 1;
            if (a.type === 'COLLABORATOR' && b.type !== 'COLLABORATOR') return -1;
            if (a.type !== 'COLLABORATOR' && b.type === 'COLLABORATOR') return 1;
            return a.name.localeCompare(b.name);
          });

          return (
            <div
              key={group.id}
              className={`rounded-xl ${colors.background.card} border ${colors.border.light} overflow-hidden`}
              style={group.color ? { borderLeftWidth: '4px', borderLeftColor: group.color } : undefined}
            >
              {/* Accordion Header - Always Visible */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full p-6 text-left hover:${colors.background.secondary} transition-colors`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className={`text-xl font-bold ${colors.text.primary}`}>{group.name}</h2>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        group.type === 'STUDENTS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        group.type === 'COLLABORATORS' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {groupTypeLabels[group.type]}
                      </span>
                    </div>
                    {group.description && (
                      <p className={`${colors.text.muted} max-w-2xl text-sm`}>{group.description}</p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${colors.background.secondary}`}>
                    {isExpanded ? (
                      <ChevronUp className={`w-5 h-5 ${colors.text.muted}`} />
                    ) : (
                      <ChevronDown className={`w-5 h-5 ${colors.text.muted}`} />
                    )}
                  </div>
                </div>

                {/* Group Info */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Users className={`w-4 h-4 ${colors.text.muted}`} />
                    <span className={colors.text.muted}>{group.totalMembers} partecipanti</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${colors.text.muted}`} />
                    <span className={colors.text.muted}>Entrato il {formatDate(group.joinedAt)}</span>
                  </div>
                </div>

                {/* Reference Contacts */}
                <div className="flex flex-wrap gap-4" onClick={(e) => e.stopPropagation()}>
                  {/* Reference Collaborator */}
                  {group.referenceCollaborator && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Responsabile Collaboratore</p>
                          <p className={`font-semibold ${colors.text.primary}`}>{group.referenceCollaborator.name}</p>
                        </div>
                      </div>
                      <Link
                        href={`/studente/messaggi?nuovo=${group.referenceCollaborator.userId}`}
                        className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800/50 hover:bg-purple-200 dark:hover:bg-purple-700/50 transition-colors"
                        title={`Scrivi a ${group.referenceCollaborator.name}`}
                      >
                        <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </Link>
                    </div>
                  )}

                  {/* Reference Student */}
                  {group.referenceStudent && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Responsabile Studenti</p>
                          <p className={`font-semibold ${colors.text.primary}`}>
                            {group.referenceStudent.name}
                            {group.referenceStudent.isCurrentUser && (
                              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded-full text-blue-600 dark:text-blue-300">Tu</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {!group.referenceStudent.isCurrentUser && (
                        <Link
                          href={`/studente/messaggi?nuovo=${group.referenceStudent.userId}`}
                          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/50 hover:bg-blue-200 dark:hover:bg-blue-700/50 transition-colors"
                          title={`Scrivi a ${group.referenceStudent.name}`}
                        >
                          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </button>

              {/* Accordion Content - Expandable Members List */}
              {isExpanded && (
                <div className={`px-6 pb-6 border-t ${colors.border.light}`}>
                  <div className="flex items-center gap-3 py-4">
                    <Users className={`w-5 h-5 ${colors.text.muted}`} />
                    <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
                      Tutti i Partecipanti ({group.totalMembers})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedMembers.map((member) => (
                      <div
                        key={member.memberId}
                        className={`flex items-center gap-4 p-4 rounded-xl ${
                          member.isCurrentUser ? `${colors.primary.gradient} text-white` :
                          member.type === 'COLLABORATOR' ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' :
                          colors.background.secondary
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${
                          member.isCurrentUser ? 'bg-white/20 text-white' :
                          member.type === 'COLLABORATOR' ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200' :
                          'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {getInitials(member.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold truncate ${member.isCurrentUser ? 'text-white' : colors.text.primary}`}>
                              {member.name}
                            </p>
                            {member.isCurrentUser && (
                              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Tu</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {member.type === 'STUDENT' ? (
                              <User className={`w-3 h-3 ${member.isCurrentUser ? 'text-white/70' : colors.text.muted}`} />
                            ) : (
                              <UserCircle className={`w-3 h-3 ${member.isCurrentUser ? 'text-white/70' : 'text-purple-500'}`} />
                            )}
                            <span className={`text-sm ${
                              member.isCurrentUser ? 'text-white/70' :
                              member.type === 'COLLABORATOR' ? 'text-purple-600 dark:text-purple-400' : colors.text.muted
                            }`}>
                              {member.type === 'STUDENT' ? 'Studente' : 'Collaboratore'}
                            </span>
                          </div>
                        </div>
                        {!member.isCurrentUser && member.type === 'COLLABORATOR' && (
                          <Link
                            href={`/studente/messaggi?nuovo=${member.userId}`}
                            className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800/50 transition-colors"
                            title={`Scrivi a ${member.name}`}
                          >
                            <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
