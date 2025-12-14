'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
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

// Attendance status options
const attendanceStatuses = [
  { value: 'PRESENT', label: 'Presente', icon: Check, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  { value: 'ABSENT', label: 'Assente', icon: X, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'LATE', label: 'Ritardo', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'EXCUSED', label: 'Giustificato', icon: AlertCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
];

type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'CUSTOM';

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatusType;
  notes?: string;
}

export default function AdminPresenzePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  // Calculate date range for events query (single day)
  const dateRange = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [selectedDate]);

  // Get events for selected date
  const { data: eventsData, isLoading: eventsLoading } = trpc.calendar.getEvents.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    includeCancelled: false,
  });

  // Get attendances for selected event
  const { data: attendancesData, isLoading: attendancesLoading } = trpc.calendar.getEventAttendances.useQuery(
    { eventId: selectedEventId },
    { enabled: !!selectedEventId }
  );

  // Bulk record attendance mutation
  const bulkRecordMutation = trpc.calendar.bulkRecordAttendance.useMutation({
    onSuccess: (data) => {
      utils.calendar.getEventAttendances.invalidate({ eventId: selectedEventId });
      showSuccess('Presenze salvate', `${data.recorded} presenze registrate con successo.`);
      setHasChanges(false);
    },
    onError: handleMutationError,
  });

  // Events for the selected date
  const todayEvents = useMemo(() => {
    return (eventsData?.events || []).filter((e) => e.id && e.title);
  }, [eventsData]);

  // Initialize attendance records when event changes
  useMemo(() => {
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

  // Navigate dates
  const navigateDay = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + direction);
    setSelectedDate(newDate);
    setSelectedEventId('');
  };

  const goToToday = () => {
    setSelectedDate(new Date());
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

  const selectedEvent = todayEvents.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${colors.text.primary}`}>
            <Users className="w-8 h-8" />
            Registro Presenze
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Registra le presenze degli studenti agli eventi
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateDay(-1)}
              className={`p-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className={`w-5 h-5 ${colors.icon.secondary}`} />
              <span className={`text-lg font-semibold ${colors.text.primary}`}>
                {selectedDate.toLocaleDateString('it-IT', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <button
              onClick={() => navigateDay(1)}
              className={`p-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className={`px-4 py-2 rounded-lg text-sm ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
          >
            Oggi
          </button>
        </div>
      </div>

      {/* Event Selection */}
      <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} p-4`}>
        <h2 className={`text-lg font-semibold mb-4 ${colors.text.primary}`}>
          Seleziona Evento
        </h2>

        {eventsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : todayEvents.length === 0 ? (
          <div className={`text-center py-8 ${colors.text.secondary}`}>
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessun evento per questa data</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todayEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id!)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedEventId === event.id
                    ? 'border-[#a8012b] bg-red-50 dark:bg-red-950/20 ring-2 ring-[#a8012b]/30'
                    : `${colors.border.primary} hover:${colors.background.secondary}`
                }`}
              >
                <p className={`font-medium ${colors.text.primary}`}>{event.title}</p>
                <p className={`text-sm ${colors.text.secondary} mt-1`}>
                  {event.type && eventTypeLabels[event.type as keyof typeof eventTypeLabels]}
                </p>
                {event.startDate && (
                  <p className={`text-xs ${colors.text.muted} mt-1`}>
                    {new Date(event.startDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    {event.endDate && ` - ${new Date(event.endDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                )}
                {event._count && (
                  <p className={`text-xs ${colors.text.muted} mt-2`}>
                    {event._count.invitations} invitati • {event._count.attendances} presenze
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Registration */}
      {selectedEventId && (
        <div className={`${colors.background.card} rounded-xl border ${colors.border.primary}`}>
          {/* Event Info & Actions */}
          <div className={`px-6 py-4 border-b ${colors.border.primary} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
            <div>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                {selectedEvent?.title}
              </h2>
              <p className={`text-sm ${colors.text.secondary}`}>
                Registra le presenze per questo evento
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Quick actions */}
              <button
                onClick={() => setAllStatus('PRESENT')}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${colors.background.secondary} hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors`}
              >
                <UserCheck className="w-4 h-4 text-green-600" />
                Tutti presenti
              </button>
              <button
                onClick={() => setAllStatus('ABSENT')}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${colors.background.secondary} hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors`}
              >
                <UserX className="w-4 h-4 text-red-600" />
                Tutti assenti
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || bulkRecordMutation.isPending}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  hasChanges
                    ? `${colors.primary.gradient} text-white`
                    : `${colors.background.secondary} ${colors.text.muted} cursor-not-allowed`
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
          <div className={`px-6 py-3 border-b ${colors.border.primary} flex flex-wrap gap-4`}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-green-500`} />
              <span className={`text-sm ${colors.text.secondary}`}>Presenti: {stats.present}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-red-500`} />
              <span className={`text-sm ${colors.text.secondary}`}>Assenti: {stats.absent}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-amber-500`} />
              <span className={`text-sm ${colors.text.secondary}`}>Ritardi: {stats.late}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-blue-500`} />
              <span className={`text-sm ${colors.text.secondary}`}>Giustificati: {stats.excused}</span>
            </div>
            <div className={`ml-auto text-sm font-medium ${colors.text.primary}`}>
              Totale: {stats.total}
            </div>
          </div>

          {/* Student List */}
          {attendancesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !attendancesData?.invitedStudents.length ? (
            <div className={`text-center py-12 ${colors.text.secondary}`}>
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessuno studente invitato a questo evento</p>
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
                    className={`px-6 py-4 flex items-center gap-4 hover:${colors.background.secondary} transition-colors`}
                  >
                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${colors.text.primary}`}>{student.name}</p>
                      <p className={`text-sm ${colors.text.muted} truncate`}>{student.email}</p>
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
                                : `${colors.background.secondary} ${colors.text.muted} hover:${colors.background.tertiary}`
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
  );
}
