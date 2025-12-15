'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { ButtonLoader } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import DateTimePicker from '@/components/ui/DateTimePicker';
import Checkbox from '@/components/ui/Checkbox';
import {
  X,
  Users,
  Calendar,
  MapPin,
  Send,
  Info,
} from 'lucide-react';
import type { LocationType } from '@/lib/validations/simulationValidation';

interface SimulationAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationId: string;
  simulationTitle: string;
  onSuccess?: () => void;
}

export function SimulationAssignModal({
  isOpen,
  onClose,
  simulationId,
  simulationTitle,
  onSuccess,
}: SimulationAssignModalProps) {
  const [mounted, setMounted] = useState(false);
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const utils = trpc.useUtils();

  // Form state
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationType, setLocationType] = useState<LocationType | ''>('');
  const [notes, setNotes] = useState('');

  // Fetch data
  const { data: groupsData } = trpc.groups.getGroups.useQuery(
    { page: 1, pageSize: 100 },
    { enabled: isOpen }
  );
  const { data: classesData } = trpc.students.getClasses.useQuery(
    undefined,
    { enabled: isOpen }
  );
  const { data: studentsData } = trpc.students.getAllForAdmin.useQuery(
    undefined,
    { enabled: isOpen }
  );

  // Mutation
  const assignMutation = trpc.simulations.addAssignments.useMutation({
    onSuccess: () => {
      showSuccess('Assegnazione completata', 'La simulazione è stata assegnata con successo');
      utils.simulations.getSimulations.invalidate();
      utils.simulations.getAssignments.invalidate();
      utils.simulations.getSimulation.invalidate({ id: simulationId });
      onSuccess?.();
      handleClose();
    },
    onError: handleMutationError,
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset form when closing
  const handleClose = () => {
    setSelectedStudents([]);
    setSelectedGroups([]);
    setSelectedClasses([]);
    setStartDate('');
    setEndDate('');
    setLocationType('');
    setNotes('');
    onClose();
  };

  // Handle submit
  const handleSubmit = () => {
    // Build targets array - each selection becomes a target with the same schedule
    const targets: Array<{
      studentId?: string | null;
      groupId?: string | null;
      classId?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      locationType?: LocationType | null;
      notes?: string | null;
    }> = [];

    // Add student targets
    for (const studentId of selectedStudents) {
      targets.push({
        studentId,
        startDate: startDate || null,
        endDate: endDate || null,
        locationType: locationType || null,
        notes: notes || null,
      });
    }

    // Add group targets
    for (const groupId of selectedGroups) {
      targets.push({
        groupId,
        startDate: startDate || null,
        endDate: endDate || null,
        locationType: locationType || null,
        notes: notes || null,
      });
    }

    // Add class targets
    for (const classId of selectedClasses) {
      targets.push({
        classId,
        startDate: startDate || null,
        endDate: endDate || null,
        locationType: locationType || null,
        notes: notes || null,
      });
    }

    if (targets.length === 0) {
      return;
    }

    assignMutation.mutate({
      simulationId,
      targets,
    });
  };

  const hasSelection = selectedStudents.length > 0 || selectedGroups.length > 0 || selectedClasses.length > 0;

  if (!isOpen || !mounted) return null;

  const groups = groupsData?.groups || [];
  const classes = classesData || [];
  const students = (studentsData || []).filter(u => u.student);

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className={`${colors.background.card} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border.light} flex items-center justify-between`}>
          <div>
            <h2 className={`text-lg font-bold ${colors.text.primary}`}>Assegna Simulazione</h2>
            <p className={`text-sm ${colors.text.muted} mt-0.5`}>{simulationTitle}</p>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg ${colors.background.hover} transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Info banner */}
          <div className={`p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className={`text-sm text-blue-700 dark:text-blue-300`}>
                <p className="font-medium">La simulazione verrà pubblicata automaticamente</p>
                <p className="mt-1 opacity-80">
                  Quando assegni la simulazione a studenti, gruppi o classi, verrà automaticamente pubblicata
                  e resa disponibile ai destinatari.
                </p>
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className={`font-medium ${colors.text.primary}`}>Programmazione</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                  Data/ora inizio
                </label>
                <DateTimePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Seleziona data/ora"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
                  Data/ora fine
                </label>
                <DateTimePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Seleziona data/ora"
                  minDate={startDate ? startDate.split('T')[0] : undefined}
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h3 className={`font-medium ${colors.text.primary}`}>Modalità</h3>
            </div>

            <CustomSelect
              value={locationType}
              onChange={(value) => setLocationType(value as LocationType | '')}
              options={[
                { value: '', label: 'Seleziona modalità...' },
                { value: 'ONLINE', label: '💻 Online' },
                { value: 'IN_PERSON', label: '🏢 In presenza' },
                { value: 'HYBRID', label: '🔄 Ibrida' },
              ]}
              placeholder="Seleziona modalità"
            />
          </div>

          {/* Targets Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className={`font-medium ${colors.text.primary}`}>Destinatari</h3>
            </div>

            {/* Groups */}
            {groups.length > 0 && (
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                  Gruppi
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedGroups.includes(group.id)
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : `${colors.border.light} ${colors.background.hover}`
                      }`}
                    >
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroups([...selectedGroups, group.id]);
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                          }
                        }}
                      />
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: group.color || undefined }}
                      >
                        {group.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Classes */}
            {classes.length > 0 && (
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                  Classi
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {classes.map((cls) => (
                    <label
                      key={cls.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedClasses.includes(cls.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : `${colors.border.light} ${colors.background.hover}`
                      }`}
                    >
                      <Checkbox
                        id={`class-${cls.id}`}
                        checked={selectedClasses.includes(cls.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClasses([...selectedClasses, cls.id]);
                          } else {
                            setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                          }
                        }}
                      />
                      <span className={`text-sm font-medium truncate ${colors.text.primary}`}>
                        {cls.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Students */}
            {students.length > 0 && (
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                  Studenti individuali
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {students.map((student) => (
                    <label
                      key={student.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedStudents.includes(student.student!.id)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : `${colors.border.light} ${colors.background.hover}`
                      }`}
                    >
                      <Checkbox
                        id={`student-${student.student!.id}`}
                        checked={selectedStudents.includes(student.student!.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.student!.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.student!.id));
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${colors.text.primary}`}>
                          {student.name}
                        </p>
                        <p className={`text-xs truncate ${colors.text.muted}`}>
                          {student.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* No data message */}
            {groups.length === 0 && classes.length === 0 && students.length === 0 && (
              <div className={`text-center py-8 ${colors.text.muted}`}>
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nessun destinatario disponibile</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium ${colors.text.secondary} mb-1`}>
              Note (opzionale)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aggiungi note per questa assegnazione..."
              rows={2}
              className={`w-full px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.input} ${colors.text.primary} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${colors.border.light} flex items-center justify-between`}>
          <div className={`text-sm ${colors.text.muted}`}>
            {hasSelection ? (
              <>
                Selezionati: {selectedGroups.length > 0 && `${selectedGroups.length} gruppi`}
                {selectedGroups.length > 0 && (selectedClasses.length > 0 || selectedStudents.length > 0) && ', '}
                {selectedClasses.length > 0 && `${selectedClasses.length} classi`}
                {selectedClasses.length > 0 && selectedStudents.length > 0 && ', '}
                {selectedStudents.length > 0 && `${selectedStudents.length} studenti`}
              </>
            ) : (
              'Seleziona almeno un destinatario'
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className={`px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} ${colors.background.hover}`}
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={!hasSelection || assignMutation.isPending}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ButtonLoader loading={assignMutation.isPending} loadingText="Assegnando...">
                <Send className="w-4 h-4" />
                Assegna
              </ButtonLoader>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default SimulationAssignModal;
