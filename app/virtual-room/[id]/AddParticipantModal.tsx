'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import Button from '@/components/ui/Button';
import { Spinner, ButtonLoader } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import { Search, UserPlus, X, Users } from 'lucide-react';

export interface AddParticipantModalProps {
  readonly isOpen: boolean;
  readonly sessionId: string;
  readonly isCollaborator: boolean;
  readonly excludedStudentIds: ReadonlySet<string>;
  readonly onClose: () => void;
  readonly onAdded: () => void;
}

/**
 * Staff modal to manually insert a student into an active Virtual Room,
 * even after the session has started. Students already invited or already
 * in the room are excluded from the list.
 */
export function AddParticipantModal({
  isOpen,
  sessionId,
  isCollaborator,
  excludedStudentIds,
  onClose,
  onAdded,
}: AddParticipantModalProps) {
  const [search, setSearch] = useState('');
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const { showSuccess } = useToast();
  const { handleMutationError } = useApiError();

  const { data: studentsData, isLoading, error: studentsError } = trpc.students.getStudents.useQuery(
    { pageSize: 500, isActive: true, ...(isCollaborator && { onlyMyGroups: true }) },
    { enabled: isOpen }
  );

  const addParticipant = trpc.virtualRoom.addParticipant.useMutation({
    onSuccess: (data) => {
      showSuccess('Studente aggiunto', data.message);
      setPendingStudentId(null);
      onAdded();
    },
    onError: (error) => {
      setPendingStudentId(null);
      handleMutationError(error);
    },
  });

  const availableStudents = useMemo(() => {
    const students = (studentsData?.students ?? [])
      .filter((s) => s.studentId && !excludedStudentIds.has(s.studentId))
      .map((s) => ({
        id: s.studentId!,
        name: s.name ?? '',
        matricola: s.matricola ?? '',
      }));

    if (!search.trim()) return students;
    const lowered = search.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(lowered) || s.matricola.toLowerCase().includes(lowered)
    );
  }, [studentsData, excludedStudentIds, search]);

  if (!isOpen) return null;

  const handleAdd = (studentId: string) => {
    setPendingStudentId(studentId);
    addParticipant.mutate({ sessionId, studentId });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${colors.text.primary}`}>Aggiungi studente</h3>
              <p className={`text-sm ${colors.text.muted}`}>
                Inserisci manualmente uno studente nella stanza
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${colors.text.muted} hover:text-gray-900 dark:hover:text-white`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.text.muted}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome o matricola..."
              className={`w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl ${colors.text.primary} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm`}
            />
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : studentsError ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className={`w-10 h-10 ${colors.text.muted} mb-2`} />
              <p className={`${colors.text.muted} text-sm`}>
                Non è stato possibile caricare la lista studenti. Verifica di avere il permesso di vedere gli studenti.
              </p>
            </div>
          ) : availableStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className={`w-10 h-10 ${colors.text.muted} mb-2`} />
              <p className={`${colors.text.muted} text-sm`}>
                {search.trim()
                  ? 'Nessuno studente trovato'
                  : 'Nessuno studente disponibile da aggiungere'}
              </p>
            </div>
          ) : (
            availableStudents.map((student) => (
              <div
                key={student.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${colors.border.light} ${colors.background.secondary}`}
              >
                <div className="min-w-0">
                  <p className={`font-medium ${colors.text.primary} truncate`}>{student.name}</p>
                  {student.matricola && (
                    <p className={`text-xs ${colors.text.muted}`}>Matricola: {student.matricola}</p>
                  )}
                </div>
                <Button
                  onClick={() => handleAdd(student.id)}
                  disabled={addParticipant.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 px-4 py-2 text-sm flex-shrink-0"
                >
                  <ButtonLoader
                    loading={addParticipant.isPending && pendingStudentId === student.id}
                    loadingText="Aggiunta..."
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Aggiungi
                  </ButtonLoader>
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AddParticipantModal;
