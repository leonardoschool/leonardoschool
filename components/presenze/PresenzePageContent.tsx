'use client';

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import CustomSelect from '@/components/ui/CustomSelect';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Users,
  Calendar,
  Check,
  X,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  UserCheck,
  UserX,
} from 'lucide-react';
import { eventTypeLabels } from '@/components/ui/Calendar';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { EventType } from '@prisma/client';

// Attendance status options
const attendanceStatuses = [
  { value: 'PRESENT', label: 'Presente', icon: Check, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  { value: 'ABSENT', label: 'Assente', icon: X, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'LATE', label: 'Ritardo', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'EXCUSED', label: 'Giustificato', icon: AlertCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
];

// Event type options for CustomSelect
const eventTypeOptions = [
  { value: 'ALL', label: 'Tutti i tipi' },
  ...Object.entries(eventTypeLabels).map(([value, label]) => ({ value, label })),
];

// Event type colors for dots
const eventTypeColors: Record<string, string> = {
  LESSON: 'bg-blue-500',
  SIMULATION: 'bg-purple-500',
  MEETING: 'bg-amber-500',
  EXAM: 'bg-red-500',
  OTHER: 'bg-gray-500',
};

type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'CUSTOM';

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatusType;
  notes?: string;
}

interface PresenzePageContentProps {
  /**
   * If true, only shows events created by the current user (for collaborators)
   * If false, shows all events (for admins)
   */
  onlyMyEvents?: boolean;
}

export default function PresenzePageContent({ onlyMyEvents = false }: PresenzePageContentProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  const { user } = useAuth();

  // Calculate date range for the entire month view (to show events dots)
  const monthRange = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return { start: calendarStart, end: calendarEnd };
  }, [currentMonth]);

  // Get all events for the month (to show dots on calendar)
  // For collaborators (onlyMyEvents=true), filter only events CREATED by them using createdById
  // For admins (onlyMyEvents=false), show all events
  const { data: monthEventsData, isLoading: monthEventsLoading } = trpc.calendar.getEvents.useQuery({
    startDate: monthRange.start,
    endDate: monthRange.end,
    includeCancelled: false,
    // Use createdById filter for collaborators to only get events they created
    createdById: onlyMyEvents && user?.id ? user.id : undefined,
    includeInvitations: true, // Need this to get createdBy info
    type: selectedEventType === 'ALL' ? undefined : selectedEventType as EventType,
    pageSize: 100,
  }, {
    // Only run query when user is loaded (for collaborator filtering)
    enabled: !onlyMyEvents || !!user?.id,
  });

  // Get events for the selected date
  // No additional filtering needed - server already returns correct events based on createdById
  const selectedDayEvents = useMemo(() => {
    if (!monthEventsData?.events) return [];
    return monthEventsData.events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, selectedDate);
    });
  }, [monthEventsData, selectedDate]);

  // Get attendances for selected event
  const { data: attendancesData, isLoading: attendancesLoading } = trpc.calendar.getEventAttendances.useQuery(
    { eventId: selectedEventId },
    { enabled: !!selectedEventId }
  );

  // Bulk record attendance mutation
  const bulkRecordMutation = trpc.calendar.bulkRecordAttendance.useMutation({
    onSuccess: (data) => {
      utils.calendar.getEventAttendances.invalidate({ eventId: selectedEventId });
      utils.calendar.getEvents.invalidate();
      showSuccess('Presenze salvate', `${data.recorded} presenze registrate con successo.`);
      setHasChanges(false);
    },
    onError: handleMutationError,
  });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group events by date for dots
  // No additional filtering needed - server already returns correct events
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof monthEventsData.events>();
    if (!monthEventsData?.events) return map;
    
    monthEventsData.events.forEach((event) => {
      const dateKey = format(new Date(event.startDate), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      existing.push(event);
      map.set(dateKey, existing);
    });
    return map;
  }, [monthEventsData]);

  // Initialize attendance records when event changes
  useEffect(() => {
    if (attendancesData) {
      const records = new Map<string, AttendanceRecord>();
      
      // Add existing attendances
      attendancesData.attendances.forEach((att) => {
        if (att.studentId) {
          records.set(att.studentId, {
            studentId: att.studentId,
            status: att.status as AttendanceStatusType,
            notes: att.notes || undefined,
          });
        }
      });
      
      // Add invited students without attendance
      attendancesData.invitedStudents.forEach((student) => {
        if (!records.has(student.id)) {
          records.set(student.id, {
            studentId: student.id,
            status: 'PRESENT', // Default to present
          });
        }
      });
      
      setAttendanceRecords(records);
      setHasChanges(false);
    }
  }, [attendancesData]);

  // Reset selected event when date changes
  useEffect(() => {
    setSelectedEventId('');
  }, [selectedDate]);

  // Navigation
  const navigateMonth = (direction: number) => {
    setCurrentMonth(direction > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
    setSelectedEventId('');
  };

  // Update attendance
  const updateAttendance = (studentId: string, status: AttendanceStatusType, notes?: string) => {
    const newRecords = new Map(attendanceRecords);
    const existing = newRecords.get(studentId);
    newRecords.set(studentId, {
      studentId,
      status,
      notes: notes !== undefined ? notes : existing?.notes,
    });
    setAttendanceRecords(newRecords);
    setHasChanges(true);
  };

  // Set all to a specific status
  const setAllStatus = (status: AttendanceStatusType) => {
    const newRecords = new Map<string, AttendanceRecord>();
    attendancesData?.invitedStudents.forEach((student) => {
      newRecords.set(student.id, {
        studentId: student.id,
        status,
      });
    });
    setAttendanceRecords(newRecords);
    setHasChanges(true);
  };

  // Save attendances
  const handleSave = () => {
    if (!selectedEventId) return;

    const attendances = Array.from(attendanceRecords.values()).map((record) => ({
      studentId: record.studentId,
      status: record.status,
      notes: record.notes,
    }));

    bulkRecordMutation.mutate({
      eventId: selectedEventId,
      attendances,
    });
  };

  // Calculate stats
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    attendanceRecords.forEach((record) => {
      switch (record.status) {
        case 'PRESENT':
          present++;
          break;
        case 'ABSENT':
          absent++;
          break;
        case 'LATE':
          late++;
          break;
        case 'EXCUSED':
          excused++;
          break;
      }
    });

    return { present, absent, late, excused, total: attendanceRecords.size };
  }, [attendanceRecords]);

  const selectedEvent = selectedDayEvents.find((e) => e.id === selectedEventId);
  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
            <Users className="w-8 h-8" />
            Registro Presenze
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Registra le presenze degli studenti agli eventi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: it })}
                </span>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Today Button */}
            <button
              onClick={goToToday}
              className="w-full mb-4 px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
            >
              Oggi
            </button>

            {/* Event Type Filter */}
            <div className="mb-4">
              <CustomSelect
                value={selectedEventType}
                options={eventTypeOptions}
                onChange={(value) => {
                  setSelectedEventType(value);
                  setSelectedEventId('');
                }}
                size="sm"
                placeholder="Filtra per tipo"
              />
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {monthEventsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate.get(dateKey) || [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        relative p-2 rounded-lg text-sm transition-all min-h-[48px] flex flex-col items-center justify-start
                        ${isCurrentMonth 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-gray-400 dark:text-gray-600'}
                        ${isSelected 
                          ? 'bg-[#a8012b] text-white ring-2 ring-[#a8012b]/30' 
                          : isTodayDate 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                        ${hasEvents && !isSelected ? 'font-semibold' : ''}
                      `}
                    >
                      <span>{format(day, 'd')}</span>
                      {/* Event Dots */}
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full">
                          {dayEvents.slice(0, 3).map((event, idx) => (
                            <div
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : eventTypeColors[event.type] || 'bg-gray-500'}`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className={`text-[8px] ${isSelected ? 'text-white' : 'text-gray-500'}`}>+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Legenda:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(eventTypeLabels).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${eventTypeColors[type]}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Events and Attendance Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected Date Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eventi del {format(selectedDate, 'd MMMM yyyy', { locale: it })}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedDayEvents.length === 0 
                ? 'Nessun evento per questa data' 
                : `${selectedDayEvents.length} evento/i disponibile/i`}
            </p>
          </div>

          {/* Events List */}
          {selectedDayEvents.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Seleziona Evento
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedDayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id!)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedEventId === event.id
                        ? 'border-[#a8012b] bg-red-50 dark:bg-red-950/20 ring-2 ring-[#a8012b]/30'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1 ${eventTypeColors[event.type] || 'bg-gray-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {event.type && eventTypeLabels[event.type as keyof typeof eventTypeLabels]}
                        </p>
                        {event.startDate && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(event.startDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            {event.endDate && ` - ${new Date(event.endDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
                          </p>
                        )}
                        {event._count && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            {event._count.invitations} invitati • {event._count.attendances} presenze
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attendance Registration */}
          {selectedEventId && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              {/* Event Info & Actions */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedEvent?.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Registra le presenze per questo evento
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Quick actions */}
                  <button
                    onClick={() => setAllStatus('PRESENT')}
                    className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <span className="hidden sm:inline">Tutti presenti</span>
                  </button>
                  <button
                    onClick={() => setAllStatus('ABSENT')}
                    className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    <UserX className="w-4 h-4 text-red-600" />
                    <span className="hidden sm:inline">Tutti assenti</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || bulkRecordMutation.isPending}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                      hasChanges
                        ? `${colors.primary.gradient} text-white`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {bulkRecordMutation.isPending ? (
                      <Spinner size="sm" variant="white" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salva
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Presenti: {stats.present}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Assenti: {stats.absent}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ritardi: {stats.late}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Giustificati: {stats.excused}</span>
                </div>
                <div className="ml-auto text-sm font-medium text-gray-900 dark:text-white">
                  Totale: {stats.total}
                </div>
              </div>

              {/* Student List */}
              {attendancesLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : !attendancesData?.invitedStudents.length ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessuno studente invitato a questo evento</p>
                  <p className="text-xs mt-2">
                    Il registro presenze è disponibile solo per eventi con studenti invitati.
                    <br />
                    Gli inviti a collaboratori o gruppi senza studenti non vengono mostrati.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {attendancesData.invitedStudents.map((student) => {
                    const record = attendanceRecords.get(student.id);
                    const currentStatus = record?.status || 'PRESENT';
                    const statusInfo = attendanceStatuses.find((s) => s.value === currentStatus);

                    return (
                      <div
                        key={student.id}
                        className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{student.email}</p>
                        </div>

                        {/* Status Buttons */}
                        <div className="flex items-center gap-2">
                          {attendanceStatuses.map((status) => {
                            const Icon = status.icon;
                            const isActive = currentStatus === status.value;

                            return (
                              <button
                                key={status.value}
                                onClick={() => updateAttendance(student.id, status.value as AttendanceStatusType)}
                                className={`p-2 rounded-lg transition-all ${
                                  isActive
                                    ? `${status.bg} ${status.color} ring-2 ring-current ring-opacity-50`
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                                title={status.label}
                              >
                                <Icon className="w-5 h-5" />
                              </button>
                            );
                          })}
                        </div>

                        {/* Current Status Label */}
                        <span className={`hidden sm:block text-sm px-3 py-1 rounded-full ${statusInfo?.bg} ${statusInfo?.color}`}>
                          {statusInfo?.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
