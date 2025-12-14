'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { PageLoader } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import {
  Calendar,
  Users,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  MapPin,
  Video,
  RefreshCw,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { AttendanceStatus, EventType } from '@prisma/client';

// Event type labels
const eventTypeLabels: Record<EventType, string> = {
  LESSON: 'Lezione',
  SIMULATION: 'Simulazione',
  MEETING: 'Riunione',
  EXAM: 'Esame',
  OTHER: 'Altro',
};

// Attendance status labels and colors
const attendanceStatusConfig: Record<AttendanceStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PRESENT: { 
    label: 'Presente', 
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <Check className="h-4 w-4" />
  },
  ABSENT: { 
    label: 'Assente', 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="h-4 w-4" />
  },
  LATE: { 
    label: 'In ritardo', 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Clock className="h-4 w-4" />
  },
  EXCUSED: { 
    label: 'Giustificato', 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Check className="h-4 w-4" />
  },
  CUSTOM: { 
    label: 'Personalizzato', 
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <Clock className="h-4 w-4" />
  },
};

export default function CollaboratorePresenzePage() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  
  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [selectedEventType, setSelectedEventType] = useState<EventType | 'ALL'>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  
  // Date range for selected month
  const dateRange = useMemo(() => ({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
  }), [selectedMonth]);
  
  // Month options for selector (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      options.push({
        value: date.toISOString(),
        label: format(date, 'MMMM yyyy', { locale: it }),
      });
    }
    return options;
  }, []);
  
  // Fetch my events (events I'm assigned to or created)
  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = trpc.calendar.getEvents.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    type: selectedEventType === 'ALL' ? undefined : selectedEventType,
  });
  
  // Filter events where the collaborator is assigned or is the creator
  const myEvents = useMemo(() => {
    if (!eventsData?.events) return [];
    // For now, show all events - the backend already filters based on permissions
    return eventsData.events.filter(e => !e.isCancelled);
  }, [eventsData]);
  
  // Get attendance for expanded event
  const { data: attendanceData, isLoading: attendanceLoading } = trpc.calendar.getEventAttendances.useQuery(
    { eventId: expandedEventId! },
    { enabled: !!expandedEventId }
  );
  
  // Record attendance mutation
  const recordAttendance = trpc.calendar.recordAttendance.useMutation({
    onSuccess: () => {
      showSuccess('Presenza registrata', 'La presenza è stata registrata con successo.');
      refetchEvents();
    },
    onError: handleMutationError,
  });
  
  // Toggle event expansion
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };
  
  // Handle attendance change
  const handleAttendanceChange = (eventId: string, studentId: string, status: AttendanceStatus) => {
    recordAttendance.mutate({
      eventId,
      studentId,
      status,
    });
  };
  
  // Calculate attendance stats for an event
  const getEventStats = (eventId: string) => {
    if (expandedEventId !== eventId || !attendanceData?.attendances) return null;
    
    const attendances = attendanceData.attendances;
    const invitedStudents = attendanceData.invitedStudents || [];
    const total = invitedStudents.length;
    const present = attendances.filter(a => a.status === 'PRESENT').length;
    const absent = attendances.filter(a => a.status === 'ABSENT').length;
    const late = attendances.filter(a => a.status === 'LATE').length;
    const excused = attendances.filter(a => a.status === 'EXCUSED').length;
    
    return { total, present, absent, late, excused };
  };
  
  if (eventsLoading) {
    return <PageLoader />;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Registro Presenze
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestisci le presenze degli studenti ai tuoi eventi
          </p>
        </div>
        
        <button
          onClick={() => refetchEvents()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Aggiorna
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtri:</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {/* Month selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={selectedMonth.toISOString()}
                onChange={(e) => setSelectedMonth(new Date(e.target.value))}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Event type filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tipo:</span>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value as EventType | 'ALL')}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ALL">Tutti</option>
                {Object.entries(eventTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Events List */}
      <div className="space-y-4">
        {myEvents.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Nessun evento trovato per questo periodo.
            </p>
          </div>
        ) : (
          myEvents.map((event) => {
            const isExpanded = expandedEventId === event.id;
            const stats = getEventStats(event.id);
            
            return (
              <div
                key={event.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Event Header */}
                <button
                  onClick={() => toggleEventExpansion(event.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      event.type === 'LESSON' ? 'bg-blue-500' :
                      event.type === 'SIMULATION' ? 'bg-purple-500' :
                      event.type === 'MEETING' ? 'bg-amber-500' :
                      event.type === 'EXAM' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`} />
                    
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(event.startDate || new Date()), 'dd/MM/yyyy HH:mm', { locale: it })}
                        </span>
                        <span className="flex items-center gap-1">
                          {event.locationType === 'ONLINE' ? (
                            <Video className="h-3.5 w-3.5" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5" />
                          )}
                          {event.locationType === 'ONLINE' ? 'Online' : event.locationDetails || 'In sede'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          event.type === 'LESSON' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          event.type === 'SIMULATION' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          event.type === 'MEETING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          event.type === 'EXAM' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {eventTypeLabels[event.type as EventType]}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                      <span>{event._count?.invitations || 0} invitati</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {/* Expanded Content - Attendance */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    {attendanceLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
                      </div>
                    ) : attendanceData && (attendanceData.invitedStudents?.length || 0) > 0 ? (
                      <>
                        {/* Stats Summary */}
                        {stats && (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Totale</div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.present}</div>
                              <div className="text-xs text-emerald-600 dark:text-emerald-400">Presenti</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
                              <div className="text-xs text-red-600 dark:text-red-400">Assenti</div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.late}</div>
                              <div className="text-xs text-amber-600 dark:text-amber-400">In ritardo</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.excused}</div>
                              <div className="text-xs text-blue-600 dark:text-blue-400">Giustificati</div>
                            </div>
                          </div>
                        )}
                        
                        {/* Attendance List */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Elenco studenti
                          </h4>
                          
                          <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {attendanceData.invitedStudents?.map((student) => {
                              // Find this student's attendance record
                              const attendanceRecord = attendanceData.attendances?.find(
                                a => a.studentId === student.id
                              );
                              const status = attendanceRecord?.status as AttendanceStatus | undefined;
                              const nameParts = student.name?.split(' ') || [];
                              const initials = nameParts.length >= 2 
                                ? `${nameParts[0]?.[0] || ''}${nameParts[1]?.[0] || ''}`
                                : (student.name?.[0] || 'S');
                              
                              return (
                                <div
                                  key={student.id}
                                  className="py-3 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
                                      {initials.toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {student.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {student.email}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {/* Current status badge */}
                                    {status && (
                                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${attendanceStatusConfig[status].bgColor} ${attendanceStatusConfig[status].color}`}>
                                        {attendanceStatusConfig[status].icon}
                                        {attendanceStatusConfig[status].label}
                                      </span>
                                    )}
                                    
                                    {/* Attendance buttons */}
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleAttendanceChange(event.id, student.id!, 'PRESENT')}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                          status === 'PRESENT'
                                            ? 'bg-emerald-500 text-white'
                                            : 'text-gray-400 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400'
                                        }`}
                                        title="Presente"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleAttendanceChange(event.id, student.id!, 'ABSENT')}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                          status === 'ABSENT'
                                            ? 'bg-red-500 text-white'
                                            : 'text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400'
                                        }`}
                                        title="Assente"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleAttendanceChange(event.id, student.id!, 'LATE')}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                          status === 'LATE'
                                            ? 'bg-amber-500 text-white'
                                            : 'text-gray-400 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400'
                                        }`}
                                        title="In ritardo"
                                      >
                                        <Clock className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Users className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p>Nessun studente invitato a questo evento.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legenda stati</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(attendanceStatusConfig).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                {config.icon}
                {config.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
