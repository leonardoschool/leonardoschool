'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';

export function useCalendarFilters() {
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteRoleFilter, setInviteRoleFilter] = useState<'all' | 'STUDENT' | 'COLLABORATOR'>('all');
  const [groupSearch, setGroupSearch] = useState('');

  const { data: studentsData } = trpc.students.getStudents.useQuery({
    page: 1,
    pageSize: 500,
    isActive: true,
    onlyMyGroups: true,
  });
  const { data: collaboratorsData } = trpc.collaborators.getListForCalendar.useQuery();
  const { data: groupsData } = trpc.groups.getGroups.useQuery({
    page: 1,
    pageSize: 100,
    onlyMyGroups: true,
  });

  const allUsers = useMemo(() => {
    const users: {
      id: string;
      name: string;
      role: 'STUDENT' | 'COLLABORATOR';
      extra?: string;
      subjects?: string;
    }[] = [];

    studentsData?.students?.forEach(student => {
      users.push({
        id: student.id,
        name: student.name || 'Studente',
        role: 'STUDENT',
      });
    });

    if (collaboratorsData && Array.isArray(collaboratorsData)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (collaboratorsData as any[]).forEach((collab: any) => {
        if (collab.isActive) {
          const subjects = collab.collaborator?.subjects || [];
          const subjectNames = subjects
            .map((s: { subject?: { code?: string; name?: string } }) => s.subject?.code || s.subject?.name)
            .filter(Boolean)
            .join(', ');

          users.push({
            id: collab.id,
            name: collab.name || 'Collaboratore',
            role: 'COLLABORATOR',
            extra: collab.collaborator?.specialization,
            subjects: subjectNames || undefined,
          });
        }
      });
    }

    return users;
  }, [studentsData, collaboratorsData]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const matchesSearch =
        inviteSearch === '' ||
        user.name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
        user.extra?.toLowerCase().includes(inviteSearch.toLowerCase());
      const matchesRole = inviteRoleFilter === 'all' || user.role === inviteRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allUsers, inviteSearch, inviteRoleFilter]);

  const filteredGroups = useMemo(() => {
    if (!groupsData?.groups) return [];
    return groupsData.groups.filter(group =>
      groupSearch === '' || group.name.toLowerCase().includes(groupSearch.toLowerCase())
    );
  }, [groupsData, groupSearch]);

  return {
    inviteSearch,
    setInviteSearch,
    inviteRoleFilter,
    setInviteRoleFilter,
    groupSearch,
    setGroupSearch,
    allUsers,
    filteredUsers,
    filteredGroups,
  };
}
