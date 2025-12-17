'use client';

import { useState, useMemo, useEffect } from 'react';
import { Users, User, Calendar, Clock, MapPin, Search, Info, CheckSquare, FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import CustomSelect from '@/components/ui/CustomSelect';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { ButtonLoader } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import Checkbox from '@/components/ui/Checkbox';
import { GroupInfoModal } from '@/components/ui/GroupInfoModal';
import { UserInfoModal } from '@/components/ui/UserInfoModal';
import { colors } from '@/lib/theme/colors';

type LocationType = 'ONLINE' | 'IN_PERSON' | 'HYBRID';
type DateMode = 'single' | 'range';
type UserRole = 'ADMIN' | 'COLLABORATOR';

export interface SimulationAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationId: string;
  simulationTitle: string;
  isOfficial: boolean;
  durationMinutes: number;
  /** User role - determines which groups/students are visible */
  userRole: UserRole;
}

/**
 * Unified Simulation Assignment Modal
 * 
 * Used by both Admin and Collaborator to assign simulations to groups/students.
 * - Admin: sees all groups and students
 * - Collaborator: sees only their assigned groups and students (onlyMyGroups: true)
 * 
 * Features:
 * - Group and individual student selection with search
 * - Select all / Deselect all functionality
 * - Date logic: 
 *   - Official simulations: auto-calculate end date from start + duration
 *   - Non-official: choice between single date (auto-calc) or date range
 * - Location type selection (Online/In-person/Hybrid)
 * - Info modals for groups and students
 */
export function SimulationAssignModal({
  isOpen,
  onClose,
  simulationId,
  simulationTitle,
  isOfficial,
  durationMinutes,
  userRole,
}: SimulationAssignModalProps) {
  const { showSuccess } = useToast();
  const { handleMutationError } = useApiError();
  const utils = trpc.useUtils();

  // Form state
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [locationType, setLocationType] = useState<LocationType>('ONLINE');
  const [locationDetails, setLocationDetails] = useState('');
  const [createCalendarEvent, setCreateCalendarEvent] = useState(false);
  
  // Search state
  const [groupSearch, setGroupSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  
  // Info modals
  const [viewGroupId, setViewGroupId] = useState<string | null>(null);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  
  // Track groups with members that have any assignments (direct or from other groups)
  const [groupsWithConflicts, setGroupsWithConflicts] = useState<
    Record<string, { 
      count: number; 
      members: Array<{ 
        name: string; 
        isDirect: boolean; 
        fromGroups: string[] 
      }> 
    }>
  >();

  // Collaborators only see their groups/students
  const isCollaborator = userRole === 'COLLABORATOR';

  // Fetch existing assignments for this simulation
  const { data: existingAssignments } = trpc.simulations.getExistingAssignmentIds.useQuery(
    { simulationId },
    { enabled: isOpen && !!simulationId }
  );

  // Note: Removed client-side duplicate checks since the server now handles
  // duplicate detection intelligently based on overlapping dates.
  // This allows assigning the same simulation multiple times with different schedules.
  const alreadyAssignedStudentIds = useMemo(() => new Set<string>(), []);
  const alreadyAssignedGroupIds = useMemo(() => new Set<string>(), []);

  // Calculate end date automatically when using single date mode
  useEffect(() => {
    if ((isOfficial || dateMode === 'single') && startDate && durationMinutes > 0) {
      const start = new Date(startDate);
      start.setMinutes(start.getMinutes() + durationMinutes);
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      const hours = String(start.getHours()).padStart(2, '0');
      const minutes = String(start.getMinutes()).padStart(2, '0');
      setEndDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [startDate, durationMinutes, isOfficial, dateMode]);

  // Fetch groups - collaborators only see their groups
  const { data: groupsData, isLoading: loadingGroups } = trpc.groups.getGroups.useQuery(
    { pageSize: 100, ...(isCollaborator && { onlyMyGroups: true }) },
    { enabled: isOpen }
  );

  // Fetch students - collaborators only see students in their groups
  const { data: studentsData, isLoading: loadingStudents } = trpc.students.getStudents.useQuery(
    { pageSize: 500, isActive: true, ...(isCollaborator && { onlyMyGroups: true }) },
    { enabled: isOpen }
  );

  // Transform data
  const groups = useMemo(() => {
    return (groupsData?.groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g.memberCount,
    }));
  }, [groupsData]);

  const students = useMemo(() => {
    return (studentsData?.students ?? [])
      .filter((s) => s.studentId) // Only include users with student records
      .map((s) => ({
        id: s.studentId!, // Use studentId, not user id
        userId: s.id, // Keep userId for info modal
        name: s.name ?? '',
        matricola: s.matricola ?? '',
      }));
  }, [studentsData]);

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const search = groupSearch.toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(search));
  }, [groups, groupSearch]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const search = studentSearch.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(search) || s.matricola.toLowerCase().includes(search)
    );
  }, [students, studentSearch]);

  // Selection handlers
  const handleSelectAllGroups = () => {
    const allGroupIds = filteredGroups.map((g) => g.id);
    setSelectedGroupIds((prev) => Array.from(new Set([...prev, ...allGroupIds])));
  };

  const handleDeselectAllGroups = () => {
    const filteredIds = new Set(filteredGroups.map((g) => g.id));
    setSelectedGroupIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  const handleSelectAllStudents = () => {
    const allStudentIds = filteredStudents.map((s) => s.id);
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...allStudentIds])));
  };

  const handleDeselectAllStudents = () => {
    const filteredIds = new Set(filteredStudents.map((s) => s.id));
    setSelectedStudentIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };
  
  // Check for group members already assigned (direct or from other groups)
  useEffect(() => {
    const checkGroups = async () => {
      const newGroupsWithConflicts: Record<string, { 
        count: number; 
        members: Array<{ name: string; isDirect: boolean; fromGroups: string[] }> 
      }> = {};
      
      for (const groupId of selectedGroupIds) {
        // Note: Removed skip for already assigned groups to allow multiple assignments with different dates
        
        try {
          const result = await utils.simulations.getGroupMembersAlreadyAssigned.fetch({
            simulationId,
            groupId,
          });
          
          if (result.countAlreadyAssigned > 0) {
            newGroupsWithConflicts[groupId] = {
              count: result.countAlreadyAssigned,
              members: result.membersAlreadyAssigned.map((m) => ({
                name: m.name || 'Sconosciuto',
                isDirect: m.isDirect,
                fromGroups: m.fromGroups,
              })),
            };
          }
        } catch {
          // Ignore errors
        }
      }
      
      setGroupsWithConflicts(newGroupsWithConflicts);
    };
    
    if (selectedGroupIds.length > 0) {
      checkGroups();
    } else {
      setGroupsWithConflicts({});
    }
  }, [selectedGroupIds, alreadyAssignedGroupIds, simulationId, utils]);

  // Mutation
  const assignMutation = trpc.simulations.addAssignments.useMutation({
    onSuccess: () => {
      showSuccess('Simulazione assegnata', 'La simulazione è stata assegnata con successo.');
      utils.simulations.invalidate();
      handleClose();
    },
    onError: handleMutationError,
  });

  // Remove assignment mutation (for reassigning)
  const removeAssignmentMutation = trpc.simulations.removeAssignment.useMutation({
    onSuccess: () => {
      utils.simulations.invalidate();
    },
    onError: handleMutationError,
  });

  // Handle reassign - remove existing assignment and enable selection
  const handleReassign = (studentId: string) => {
    const assignment = existingAssignments?.assignments.find(
      (a) => a.studentId === studentId
    );
    if (assignment) {
      removeAssignmentMutation.mutate({ assignmentId: assignment.id });
    }
  };

  const resetForm = () => {
    setSelectedGroupIds([]);
    setSelectedStudentIds([]);
    setStartDate('');
    setEndDate('');
    setDateMode('single');
    setLocationType('ONLINE');
    setLocationDetails('');
    setCreateCalendarEvent(false);
    setGroupSearch('');
    setStudentSearch('');
    setViewGroupId(null);
    setViewUserId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Convert local datetime string to ISO format for API
  const toISOString = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toISOString();
  };

  const handleSubmit = () => {
    if (selectedGroupIds.length === 0 && selectedStudentIds.length === 0) return;
    if (!startDate || !endDate) return;

    // Convert to ISO format for API
    const isoStartDate = toISOString(startDate);
    const isoEndDate = toISOString(endDate);

    const targets: Array<{
      startDate: string;
      endDate: string;
      locationType: LocationType;
      createCalendarEvent: boolean;
      groupId?: string;
      studentId?: string;
    }> = [];

    for (const groupId of selectedGroupIds) {
      targets.push({
        startDate: isoStartDate,
        endDate: isoEndDate,
        locationType,
        createCalendarEvent,
        groupId,
      });
    }
    for (const studentId of selectedStudentIds) {
      targets.push({
        startDate: isoStartDate,
        endDate: isoEndDate,
        locationType,
        createCalendarEvent,
        studentId,
      });
    }

    assignMutation.mutate({ simulationId, targets });
  };

  // Validation
  const isValid =
    (selectedGroupIds.length > 0 || selectedStudentIds.length > 0) &&
    startDate &&
    endDate &&
    startDate < endDate;

  // Options
  const locationOptions = [
    { value: 'ONLINE', label: 'Online' },
    { value: 'IN_PERSON', label: 'In presenza' },
    { value: 'HYBRID', label: 'Ibrido' },
  ];

  const dateModeOptions = [
    { value: 'single', label: 'Data singola (calcola fine automaticamente)' },
    { value: 'range', label: 'Arco temporale (scegli inizio e fine)' },
  ];

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return 'Illimitato';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const totalGroupsSelected = selectedGroupIds.length;
  const totalStudentsSelected = selectedStudentIds.length;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  // Footer content
  const footerContent = (
    <div className="flex items-center w-full gap-4">
      <div className="flex items-center justify-between w-full gap-3">
        <Button variant="outline" onClick={handleClose}>
          Annulla
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || assignMutation.isPending}>
          <ButtonLoader loading={assignMutation.isPending} loadingText="Assegnazione...">
            <CheckSquare className="w-4 h-4 mr-2" />
            Assegna
          </ButtonLoader>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Assegna Simulazione"
        subtitle={simulationTitle}
        icon={<FileText className="w-7 h-7" />}
        variant="primary"
        size="2xl"
        footer={footerContent}
        maxBodyHeight="65vh"
      >
        <div className="space-y-6">
          {/* Groups Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#a8012b]" />
                <h3 className={`font-semibold ${colors.text.primary}`}>
                  Gruppi ({totalGroupsSelected} selezionati)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllGroups}
                  className="text-xs px-2 py-1 rounded text-[#a8012b] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Seleziona tutti
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllGroups}
                  className={`text-xs px-2 py-1 rounded ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors`}
                >
                  Deseleziona
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.text.tertiary}`} />
              <input
                type="text"
                placeholder="Cerca gruppi..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a8012b]/50`}
              />
            </div>
            
            {/* List */}
            <div className={`border ${colors.border.primary} rounded-lg max-h-40 overflow-y-auto`}>
              {loadingGroups ? (
                <div className={`p-4 text-center ${colors.text.secondary}`}>Caricamento...</div>
              ) : filteredGroups.length === 0 ? (
                <div className={`p-4 text-center ${colors.text.secondary}`}>
                  {groupSearch ? 'Nessun gruppo trovato' : 'Nessun gruppo disponibile'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filteredGroups.map((group) => {
                    const isAlreadyAssigned = alreadyAssignedGroupIds.has(group.id);
                    const isSelected = selectedGroupIds.includes(group.id);
                    return (
                      <div
                        key={group.id}
                        className={`px-4 py-3 ${isAlreadyAssigned ? 'opacity-60' : ''} ${colors.background.cardHover} transition-colors`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleGroupToggle(group.id)}
                              disabled={isAlreadyAssigned}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`font-medium ${colors.text.primary} truncate`}>{group.name}</p>
                                {isAlreadyAssigned && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                    Già assegnato
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs ${colors.text.tertiary}`}>{group.memberCount} studenti</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewGroupId(group.id)}
                            className={`p-1.5 rounded-lg ${colors.text.secondary} hover:text-[#a8012b] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors`}
                            title="Visualizza info gruppo"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Warning for members already assigned */}
                        {isSelected && groupsWithConflicts?.[group.id] && groupsWithConflicts[group.id].count > 0 && (
                          <div className="mt-2 ml-8 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                              ⚠️ {groupsWithConflicts[group.id].count} {groupsWithConflicts[group.id].count === 1 ? 'membro ha' : 'membri hanno'} già questa simulazione:
                            </p>
                            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 ml-4">
                              {groupsWithConflicts[group.id].members.slice(0, 3).map((member, idx) => (
                                <li key={idx}>
                                  <strong>{member.name}</strong> - {member.isDirect ? 'Assegnazione diretta' : `Via ${member.fromGroups.join(', ')}`}
                                </li>
                              ))}
                              {groupsWithConflicts[group.id].members.length > 3 && (
                                <li className="text-xs italic">
                                  ...e altri {groupsWithConflicts[group.id].members.length - 3}
                                </li>
                              )}
                            </ul>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
                              Questi studenti verranno saltati (duplicati)
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Students Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#a8012b]" />
                <h3 className={`font-semibold ${colors.text.primary}`}>
                  Studenti singoli ({totalStudentsSelected} selezionati)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllStudents}
                  className="text-xs px-2 py-1 rounded text-[#a8012b] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Seleziona tutti
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllStudents}
                  className={`text-xs px-2 py-1 rounded ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors`}
                >
                  Deseleziona
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.text.tertiary}`} />
              <input
                type="text"
                placeholder="Cerca studenti..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a8012b]/50`}
              />
            </div>
            
            {/* List */}
            <div className={`border ${colors.border.primary} rounded-lg max-h-40 overflow-y-auto`}>
              {loadingStudents ? (
                <div className={`p-4 text-center ${colors.text.secondary}`}>Caricamento...</div>
              ) : filteredStudents.length === 0 ? (
                <div className={`p-4 text-center ${colors.text.secondary}`}>
                  {studentSearch ? 'Nessuno studente trovato' : 'Nessuno studente disponibile'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filteredStudents.map((student) => {
                    const isAlreadyAssigned = alreadyAssignedStudentIds.has(student.id);
                    const isRemoving = removeAssignmentMutation.isPending;
                    return (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between px-4 py-3 ${isAlreadyAssigned ? 'opacity-60' : ''} ${colors.background.cardHover} transition-colors`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => handleStudentToggle(student.id)}
                            disabled={isAlreadyAssigned}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${colors.text.primary} truncate`}>{student.name}</p>
                              {isAlreadyAssigned && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReassign(student.id);
                                  }}
                                  disabled={isRemoving}
                                  className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                                  title="Rimuovi assegnazione e permetti nuova assegnazione"
                                >
                                    Riassegna
                                </button>
                              )}
                            </div>
                            <p className={`text-xs ${colors.text.tertiary} truncate`}>{student.matricola}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewUserId(student.userId)}
                          className={`p-1.5 rounded-lg ${colors.text.secondary} hover:text-[#a8012b] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors`}
                          title="Visualizza info studente"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Date Section */}
          <div className="space-y-4">
            {/* Date Mode Selector - only for non-official simulations */}
            {!isOfficial && (
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Modalità temporale
                </label>
                <CustomSelect
                  options={dateModeOptions}
                  value={dateMode}
                  onChange={(val) => {
                    setDateMode(val as DateMode);
                    if (val === 'range') {
                      setEndDate('');
                    }
                  }}
                />
                {dateMode === 'single' && durationMinutes > 0 && (
                  <p className={`text-xs ${colors.text.tertiary} mt-1`}>
                    La simulazione dura {formatDuration(durationMinutes)}. La data di fine sarà calcolata automaticamente.
                  </p>
                )}
              </div>
            )}

            {/* Official simulation info */}
            {isOfficial && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Simulazione ufficiale:</strong> Durata {formatDuration(durationMinutes)}.
                  La data di fine sarà calcolata automaticamente.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium ${colors.text.primary} mb-2`}>
                  <Calendar className="w-4 h-4" />
                  Data e ora inizio
                </label>
                <DateTimePicker value={startDate} onChange={setStartDate} placeholder="Seleziona data/ora" />
              </div>
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium ${colors.text.primary} mb-2`}>
                  <Clock className="w-4 h-4" />
                  Data e ora fine
                </label>
                {isOfficial || dateMode === 'single' ? (
                  <div className={`px-4 py-2.5 rounded-lg border ${colors.border.primary} bg-gray-50 dark:bg-slate-800 ${colors.text.secondary}`}>
                    {endDate
                      ? new Date(endDate).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Calcolata automaticamente'}
                  </div>
                ) : (
                  <DateTimePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Seleziona data/ora"
                    minDate={startDate ? startDate.split('T')[0] : undefined}
                  />
                )}
              </div>
            </div>

            {/* Calendar Event Checkbox */}
            <div className={`p-4 rounded-lg border ${colors.border.light} ${colors.background.secondary}`}>
              <Checkbox
                id="create-calendar-event"
                checked={createCalendarEvent}
                onChange={(e) => setCreateCalendarEvent(e.target.checked)}
                label="Evento programmato"
                description="Crea un evento nel calendario associato a questa simulazione"
              />
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium ${colors.text.primary} mb-2`}>
                <MapPin className="w-4 h-4" />
                Modalità
              </label>
              <CustomSelect
                options={locationOptions}
                value={locationType}
                onChange={(val) => setLocationType(val as LocationType)}
                placeholder="Seleziona modalità"
              />
            </div>
            {(locationType === 'IN_PERSON' || locationType === 'HYBRID') && (
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Indirizzo / Aula
                </label>
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="Es: Aula 3, Via Roma 10"
                  className={`w-full px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a8012b]/50`}
                />
              </div>
            )}
            {locationType === 'ONLINE' && (
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Link meeting (opzionale)
                </label>
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="Link Zoom, Meet (opzionale)"
                  className={`w-full px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a8012b]/50`}
                />
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Info Modals */}
      {viewGroupId && (
        <GroupInfoModal groupId={viewGroupId} isOpen={!!viewGroupId} onClose={() => setViewGroupId(null)} />
      )}
      {viewUserId && (
        <UserInfoModal userId={viewUserId} userType="STUDENT" isOpen={!!viewUserId} onClose={() => setViewUserId(null)} />
      )}
    </>
  );
}

export default SimulationAssignModal;
