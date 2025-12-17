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
  
  // Search state
  const [groupSearch, setGroupSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  
  // Info modals
  const [viewGroupId, setViewGroupId] = useState<string | null>(null);
  const [viewUserId, setViewUserId] = useState<string | null>(null);

  // Collaborators only see their groups/students
  const isCollaborator = userRole === 'COLLABORATOR';

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
    return (studentsData?.students ?? []).map((s) => ({
      id: s.id,
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

  // Mutation
  const assignMutation = trpc.simulations.addAssignments.useMutation({
    onSuccess: () => {
      showSuccess('Simulazione assegnata', 'La simulazione è stata assegnata con successo.');
      utils.simulations.invalidate();
      handleClose();
    },
    onError: handleMutationError,
  });

  const resetForm = () => {
    setSelectedGroupIds([]);
    setSelectedStudentIds([]);
    setStartDate('');
    setEndDate('');
    setDateMode('single');
    setLocationType('ONLINE');
    setLocationDetails('');
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
      locationDetails?: string;
      groupId?: string;
      studentId?: string;
    }> = [];

    for (const groupId of selectedGroupIds) {
      targets.push({
        startDate: isoStartDate,
        endDate: isoEndDate,
        locationType,
        locationDetails: locationDetails || undefined,
        groupId,
      });
    }
    for (const studentId of selectedStudentIds) {
      targets.push({
        startDate: isoStartDate,
        endDate: isoEndDate,
        locationType,
        locationDetails: locationDetails || undefined,
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
                  {filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`flex items-center justify-between px-4 py-3 ${colors.background.cardHover} transition-colors`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={selectedGroupIds.includes(group.id)}
                          onChange={() => handleGroupToggle(group.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${colors.text.primary} truncate`}>{group.name}</p>
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
                  ))}
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
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between px-4 py-3 ${colors.background.cardHover} transition-colors`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => handleStudentToggle(student.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${colors.text.primary} truncate`}>{student.name}</p>
                          <p className={`text-xs ${colors.text.tertiary} truncate`}>{student.matricola}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewUserId(student.id)}
                        className={`p-1.5 rounded-lg ${colors.text.secondary} hover:text-[#a8012b] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors`}
                        title="Visualizza info studente"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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
