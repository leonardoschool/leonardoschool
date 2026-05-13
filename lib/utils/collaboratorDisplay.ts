export type CollaboratorKindDisplay = 'TUTOR' | 'SECRETARY' | string | null | undefined;

export type CollaboratorSubjectDisplay = {
  subject?: {
    code?: string | null;
    name?: string | null;
  } | null;
};

export function getCollaboratorSubjectLabel(subjects?: CollaboratorSubjectDisplay[] | null) {
  const subjectLabels = subjects
    ?.map((subjectEntry) => subjectEntry.subject?.name || subjectEntry.subject?.code)
    .filter(Boolean);

  return subjectLabels?.length ? subjectLabels.join(', ') : '';
}

export function getCollaboratorDetailLabel(kind: CollaboratorKindDisplay, subjects?: CollaboratorSubjectDisplay[] | null) {
  if (kind === 'SECRETARY') {
    return 'Segreteria';
  }

  return getCollaboratorSubjectLabel(subjects) || 'Materie non assegnate';
}

export function getCollaboratorDisplayLabel(
  name: string | null | undefined,
  kind: CollaboratorKindDisplay,
  subjects?: CollaboratorSubjectDisplay[] | null
) {
  return `${name || 'Collaboratore'} · ${getCollaboratorDetailLabel(kind, subjects)}`;
}