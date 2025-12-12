'use client';

import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import {
  UsersRound,
  Users,
  User,
  Crown,
  Calendar,
  Mail,
  UserCircle,
} from 'lucide-react';

// Group type labels
const groupTypeLabels: Record<string, string> = {
  STUDENTS: 'Studenti',
  COLLABORATORS: 'Collaboratori',
  MIXED: 'Misto',
};

export default function StudentGroupPage() {
  const { data: group, isLoading } = trpc.students.getMyGroup.useQuery();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!group) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className={`p-3 rounded-xl ${colors.primary.gradient}`}>
            <UsersRound className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Il Mio Gruppo</h1>
            <p className={colors.text.muted}>Visualizza il tuo gruppo di studio</p>
          </div>
        </div>

        <div className={`text-center py-16 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
          <UsersRound className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted} opacity-50`} />
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>
            Non fai parte di nessun gruppo
          </h2>
          <p className={`${colors.text.muted} max-w-md mx-auto`}>
            Non sei ancora stato assegnato a un gruppo di studio. Contatta un amministratore per
            essere aggiunto a un gruppo.
          </p>
        </div>
      </div>
    );
  }

  // Sort members: current user first, then reference, then others
  const sortedMembers = [...group.members].sort((a, b) => {
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    return a.name.localeCompare(b.name);
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${colors.primary.gradient}`}>
          <UsersRound className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Il Mio Gruppo</h1>
          <p className={colors.text.muted}>Visualizza il tuo gruppo di studio</p>
        </div>
      </div>

      {/* Group Info Card */}
      <div
        className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}
        style={group.color ? { borderLeftWidth: '4px', borderLeftColor: group.color } : undefined}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${colors.text.primary} mb-1`}>{group.name}</h2>
            {group.description && (
              <p className={`${colors.text.muted} max-w-2xl`}>{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                group.type === 'STUDENTS'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : group.type === 'COLLABORATORS'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              }`}
            >
              {groupTypeLabels[group.type]}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className={`w-4 h-4 ${colors.text.muted}`} />
            <span className={colors.text.muted}>{group.totalMembers} membri</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${colors.text.muted}`} />
            <span className={colors.text.muted}>Entrato il {formatDate(group.joinedAt)}</span>
          </div>
          {group.reference && (
            <div className="flex items-center gap-2">
              <Crown className={`w-4 h-4 text-amber-500`} />
              <span className={colors.text.muted}>
                Responsabile: {group.reference.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
        <div className="flex items-center gap-3 mb-6">
          <Users className={`w-5 h-5 ${colors.text.muted}`} />
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
            Membri del Gruppo ({group.totalMembers})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMembers.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-4 p-4 rounded-xl ${
                member.isCurrentUser
                  ? `${colors.primary.gradient} text-white`
                  : colors.background.secondary
              }`}
            >
              {/* Avatar - use initials */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${
                  member.isCurrentUser
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {getInitials(member.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold truncate ${
                      member.isCurrentUser ? 'text-white' : colors.text.primary
                    }`}
                  >
                    {member.name}
                  </p>
                  {member.isCurrentUser && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Tu</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {member.type === 'STUDENT' ? (
                    <User
                      className={`w-3 h-3 ${member.isCurrentUser ? 'text-white/70' : colors.text.muted}`}
                    />
                  ) : (
                    <UserCircle
                      className={`w-3 h-3 ${member.isCurrentUser ? 'text-white/70' : colors.text.muted}`}
                    />
                  )}
                  <span
                    className={`text-sm ${
                      member.isCurrentUser ? 'text-white/70' : colors.text.muted
                    }`}
                  >
                    {member.type === 'STUDENT' ? 'Studente' : 'Collaboratore'}
                  </span>
                </div>
              </div>

              {/* Contact */}
              {!member.isCurrentUser && (
                <a
                  href={`mailto:${member.email}`}
                  className={`p-2 rounded-lg transition-colors ${
                    member.isCurrentUser
                      ? 'hover:bg-white/20'
                      : `hover:${colors.background.hover}`
                  }`}
                  title={`Scrivi a ${member.name}`}
                >
                  <Mail
                    className={`w-5 h-5 ${
                      member.isCurrentUser ? 'text-white/70' : colors.text.muted
                    }`}
                  />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
