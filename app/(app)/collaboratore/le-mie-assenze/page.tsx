'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner, PageLoader } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import Checkbox from '@/components/ui/Checkbox';
import CustomSelect from '@/components/ui/CustomSelect';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { eventTypeLabels } from '@/components/ui/Calendar';

import {
  UserMinus,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  X,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Trash2,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { EventType } from '@prisma/client';

// Status labels and colors
const statusConfig = {
  PENDING: { 
    label: 'In attesa', 
    icon: Clock, 
    bg: 'bg-amber-100 dark:bg-amber-900/30', 
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700'
  },
  CONFIRMED: { 
    label: 'Confermata', 
    icon: Check, 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700'
  },
  REJECTED: { 
    label: 'Rifiutata', 
    icon: X, 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700'
  },
  CANCELLED: { 
    label: 'Annullata', 
    icon: X, 
    bg: 'bg-gray-100 dark:bg-gray-800', 
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-300 dark:border-gray-700'
  },
};

type AbsenceStatus = keyof typeof statusConfig;

// Event type colors for dots
const eventTypeColors: Record<string, string> = {
  LESSON: 'bg-blue-500',
  SIMULATION: 'bg-purple-500',
  MEETING: 'bg-amber-500',
  EXAM: 'bg-red-500',
  OTHER: 'bg-gray-500',
};

// Event type options for filter
const eventTypeOptions = [
  { value: 'ALL', label: 'Tutti i tipi' },
  ...Object.entries(eventTypeLabels).map(([value, label]) => ({ value, label })),
];

interface SelectedEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  type: EventType;
}

export default function LeMieAssenzePage() {
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  
  // Modal state
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  // Cancel confirmation state
  const [absenceToCancel, setAbsenceToCancel] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  // Calculate date range for the entire month view
  const monthRange = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return { start: calendarStart, end: calendarEnd };
  }, [currentMonth]);

  // Get my events for the month
  const { data: eventsData, isLoading: eventsLoading } = trpc.calendar.getEvents.useQuery({
    startDate: monthRange.start,
    endDate: monthRange.end,
    includeCancelled: false,
    onlyMyEvents: true,
    type: selectedEventType === 'ALL' ? undefined : selectedEventType as EventType,
    pageSize: 100,
  });

  // Get my absences
  const { data: absencesData, isLoading: absencesLoading } = trpc.calendar.getStaffAbsences.useQuery({
    onlyMine: true,
    pageSize: 50,
  });

  // Request absence mutation
  const requestAbsenceMutation = trpc.calendar.requestAbsence.useMutation({
    onSuccess: () => {
      utils.calendar.getStaffAbsences.invalidate();
      utils.calendar.getEvents.invalidate();
      showSuccess('Assenza comunicata', 'La tua assenza è stata inviata. Gli invitati riceveranno una notifica.');
      closeModal();
    },
    onError: handleMutationError,
  });

  // Cancel absence mutation
  const cancelAbsenceMutation = trpc.calendar.cancelAbsenceRequest.useMutation({
    onSuccess: () => {
      utils.calendar.getStaffAbsences.invalidate();
      utils.calendar.getEvents.invalidate();
      showSuccess('Assenza ritirata', 'L\'assenza è stata ritirata. Gli invitati riceveranno una notifica.');
      setAbsenceToCancel(null);
    },
    onError: (error) => {
      setAbsenceToCancel(null);
      handleMutationError(error);
    },
  });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof eventsData>['events']>();
    if (!eventsData?.events) return map;
    
    eventsData.events.forEach((event) => {
      const dateKey = format(new Date(event.startDate), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      existing.push(event);
      map.set(dateKey, existing);
    });
    return map;
  }, [eventsData]);

  // Check if event already has an active absence (not cancelled)
  const eventHasAbsence = useMemo(() => {
    const set = new Set<string>();
    absencesData?.absences.forEach((absence) => {
      if (absence.affectedEventId && absence.status !== 'CANCELLED') {
        set.add(absence.affectedEventId);
      }
    });
    return set;
  }, [absencesData]);

  // Navigation
  const navigateMonth = (direction: number) => {
    setCurrentMonth(direction > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Modal handlers
  const openModal = (event: SelectedEvent) => {
    setSelectedEvent(event);
    setReason('');
    setIsUrgent(false);
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setReason('');
    setIsUrgent(false);
  };

  const handleSubmit = () => {
    if (!selectedEvent || !reason.trim()) return;

    requestAbsenceMutation.mutate({
      startDate: selectedEvent.startDate,
      endDate: selectedEvent.endDate,
      isAllDay: true,
      reason: reason.trim(),
      isUrgent,
      affectedEventId: selectedEvent.id,
    });
  };

  // Close modal on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  if (eventsLoading || absencesLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
          <UserMinus className="w-8 h-8" />
          Le Mie Assenze
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Clicca su un evento per comunicare la tua assenza
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
        <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Come funziona</p>
          <p className="mt-1">
            Seleziona un tuo evento dal calendario e comunica l&apos;assenza. 
            Gli admin e tutti gli invitati (studenti e collaboratori) riceveranno automaticamente una notifica.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
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

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={goToToday}
                className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
              >
                Oggi
              </button>
              <div className="flex-1 sm:max-w-[200px]">
                <CustomSelect
                  value={selectedEventType}
                  options={eventTypeOptions}
                  onChange={setSelectedEventType}
                  size="sm"
                  placeholder="Filtra per tipo"
                />
              </div>
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
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate.get(dateKey) || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={dateKey}
                    className={`
                      relative p-1 sm:p-2 rounded-lg text-sm min-h-[60px] sm:min-h-[80px] flex flex-col
                      ${isCurrentMonth 
                        ? 'bg-gray-50 dark:bg-gray-700/30' 
                        : 'bg-gray-100/50 dark:bg-gray-800/50 opacity-50'}
                      ${isTodayDate ? 'ring-2 ring-[#a8012b]/50' : ''}
                    `}
                  >
                    <span className={`text-xs font-medium mb-1 ${
                      isTodayDate 
                        ? 'text-[#a8012b] dark:text-red-400' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    
                    {/* Events */}
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((event) => {
                        const hasAbsence = eventHasAbsence.has(event.id!);
                        
                        return (
                          <button
                            key={event.id}
                            onClick={() => !hasAbsence && openModal({
                              id: event.id!,
                              title: event.title,
                              startDate: new Date(event.startDate),
                              endDate: new Date(event.endDate),
                              type: event.type as EventType,
                            })}
                            disabled={hasAbsence}
                            className={`
                              w-full text-left px-1.5 py-0.5 rounded text-[10px] sm:text-xs truncate transition-all
                              ${hasAbsence 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 line-through cursor-not-allowed' 
                                : `${eventTypeColors[event.type]} bg-opacity-20 dark:bg-opacity-30 hover:bg-opacity-40 dark:hover:bg-opacity-50 cursor-pointer`
                              }
                            `}
                            title={hasAbsence ? 'Assenza già comunicata' : `Clicca per comunicare assenza - ${event.title}`}
                          >
                            {event.title}
                          </button>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                          +{dayEvents.length - 2} altri
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-3">
                {Object.entries(eventTypeLabels).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${eventTypeColors[type]}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-400 dark:bg-red-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Assenza comunicata</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Absences Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Le mie assenze
            </h2>

            {!absencesData?.absences.length ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <UserMinus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nessuna assenza</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {absencesData.absences.slice(0, 10).map((absence) => {
                  const status = statusConfig[absence.status as AbsenceStatus];
                  const StatusIcon = status?.icon || HelpCircle;
                  const canCancel = absence.status !== 'CANCELLED' && absence.status !== 'REJECTED';

                  return (
                    <div
                      key={absence.id}
                      className={`p-3 rounded-lg border ${status?.border} ${status?.bg}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${status?.text} truncate`}>
                            {absence.affectedEvent?.title || 'Assenza generica'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {format(new Date(absence.startDate), 'd MMM yyyy', { locale: it })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canCancel && (
                            <button
                              onClick={() => setAbsenceToCancel(absence.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Ritira assenza"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <div className={`flex items-center gap-1 text-xs ${status?.text}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{status?.label}</span>
                          </div>
                        </div>
                      </div>
                      {absence.isUrgent && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          Urgente
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Absence Modal - rendered via portal to ensure full-screen overlay */}
      {selectedEvent && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${eventTypeColors[selectedEvent.type]} bg-opacity-20 dark:bg-opacity-30 flex items-center justify-center`}>
                    <Calendar className={`w-5 h-5 ${eventTypeColors[selectedEvent.type].replace('bg-', 'text-')}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Comunica Assenza
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedEvent.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Event Info */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {format(selectedEvent.startDate, 'EEEE d MMMM yyyy', { locale: it })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-2">
                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {format(selectedEvent.startDate, 'HH:mm', { locale: it })} - {format(selectedEvent.endDate, 'HH:mm', { locale: it })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-2">
                  <div className={`w-3 h-3 rounded-full ${eventTypeColors[selectedEvent.type]}`} />
                  <span className="text-gray-600 dark:text-gray-400">
                    {eventTypeLabels[selectedEvent.type as keyof typeof eventTypeLabels]}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Motivo dell&apos;assenza *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Es: Visita medica, impegno personale..."
                  rows={3}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b] transition-all resize-none"
                />
              </div>

              {/* Urgent Checkbox */}
              <Checkbox
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                label="Urgente"
                description="Segnala se richiede attenzione immediata"
              />

              {/* Info Note */}
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Gli admin e tutti gli studenti/collaboratori invitati a questo evento riceveranno una notifica.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                disabled={requestAbsenceMutation.isPending || !reason.trim()}
                className={`flex-1 px-4 py-3 rounded-xl ${colors.primary.gradient} text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
              >
                {requestAbsenceMutation.isPending ? (
                  <Spinner size="sm" variant="white" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Invia
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Cancel Modal */}
      <ConfirmModal
        isOpen={!!absenceToCancel}
        onClose={() => setAbsenceToCancel(null)}
        onConfirm={() => {
          if (absenceToCancel) {
            cancelAbsenceMutation.mutate({ id: absenceToCancel });
          }
        }}
        title="Ritira assenza"
        message="Sei sicuro di voler ritirare questa comunicazione di assenza? Gli invitati all'evento riceveranno una notifica che l'evento si svolgerà regolarmente."
        confirmText="Ritira"
        cancelText="Annulla"
        variant="warning"
        isLoading={cancelAbsenceMutation.isPending}
      />
    </div>
  );
}
