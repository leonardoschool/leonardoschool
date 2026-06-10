'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import type { CalendarEvent, CalendarView } from '@/components/ui/Calendar';

export interface EventFormData {
  title: string;
  description: string;
  type: 'LESSON' | 'SIMULATION' | 'MEETING' | 'EXAM' | 'OTHER';
  startDateTime: string;
  endDateTime: string;
  isAllDay: boolean;
  locationType: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  locationDetails: string;
  onlineLink: string;
  isPublic: boolean;
  inviteUserIds: string[];
  inviteGroupIds: string[];
  sendEmailInvites: boolean;
  tagId: string; // empty string = no tag
}

export const defaultFormData: EventFormData = {
  title: '',
  description: '',
  type: 'OTHER',
  startDateTime: '',
  endDateTime: '',
  isAllDay: false,
  locationType: 'IN_PERSON',
  locationDetails: '',
  onlineLink: '',
  isPublic: false,
  inviteUserIds: [],
  inviteGroupIds: [],
  sendEmailInvites: true,
  tagId: '',
};

interface UseCalendarEventsOptions {
  selectedDate: Date;
  view: CalendarView;
  filterType: string;
  filterTagId?: string;
}

export function useCalendarEvents({ selectedDate, view, filterType, filterTagId }: UseCalendarEventsOptions) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);
  const [showEventForm, setShowEventForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess, showWarning } = useToast();
  const { user: currentUser } = useAuth();

  const dateRange = useMemo(() => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);

    if (view === 'month') {
      start.setDate(1);
      start.setMonth(start.getMonth());
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    } else if (view === 'week') {
      const dayOfWeek = start.getDay() === 0 ? 6 : start.getDay() - 1;
      start.setDate(start.getDate() - dayOfWeek);
      end.setDate(start.getDate() + 6);
      start.setDate(start.getDate() - 30);
      end.setDate(end.getDate() + 30);
    } else if (view === 'day') {
      start.setDate(start.getDate() - 30);
      end.setDate(end.getDate() + 30);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [selectedDate, view]);

  const { data: eventsData, isLoading } = trpc.calendar.getEvents.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    type: filterType ? (filterType as CalendarEvent['type']) : undefined,
    tagId: filterTagId || undefined,
    includeInvitations: true,
    includeCancelled: false,
    onlyMyEvents: true,
  });

  const { data: stats } = trpc.calendar.getStats.useQuery();

  const createEventMutation = trpc.calendar.createEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.calendar.getStats.invalidate();
      showSuccess('Evento creato', "L'evento è stato creato con successo.");
      closeEventForm();
    },
    onError: handleMutationError,
  });

  const updateEventMutation = trpc.calendar.updateEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      showSuccess('Evento aggiornato', "L'evento è stato aggiornato con successo.");
      closeEventForm();
    },
    onError: handleMutationError,
  });

  // eslint-disable-next-line sonarjs/no-unused-vars -- reserved for future cancel button
  const _cancelEventMutation = trpc.calendar.cancelEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.calendar.getStats.invalidate();
      showSuccess('Evento annullato', "L'evento è stato annullato.");
      setDeleteConfirm(null);
      setSelectedEvent(null);
    },
    onError: handleMutationError,
  });

  const deleteEventMutation = trpc.calendar.deleteEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.calendar.getStats.invalidate();
      showSuccess('Evento eliminato', "L'evento è stato eliminato definitivamente.");
      setDeleteConfirm(null);
      setSelectedEvent(null);
    },
    onError: handleMutationError,
  });

  const events: CalendarEvent[] = useMemo(() => {
    const currentUserId = currentUser?.id;
    return (eventsData?.events || [])
      .filter((e): e is typeof e & { id: string; title: string } => !!e.id && !!e.title)
      .map((e) => {
        const invitations = e.invitations as Array<{
          id: string;
          status?: string;
          user?: { id: string; name: string; email: string } | null;
          group?: { id: string; name: string } | null;
        }> | undefined;

        const isMine = e.createdBy?.id === currentUserId;
        return {
          id: e.id,
          title: e.title,
          description: e.description,
          type: e.type || 'OTHER',
          startDate: new Date(e.startDate!),
          endDate: new Date(e.endDate!),
          isAllDay: e.isAllDay || false,
          locationType: e.locationType || 'IN_PERSON',
          locationDetails: e.locationDetails,
          onlineLink: e.onlineLink,
          isCancelled: e.isCancelled || false,
          isMine,
          createdBy: e.createdBy,
          tag: e.tag ?? null,
          invitations: invitations?.map((inv) => ({
            id: inv.id,
            status: inv.status,
            user: inv.user,
            group: inv.group,
          })),
          _count: e._count,
        };
      });
  }, [eventsData, currentUser?.id]);

  function formatDateTimeLocal(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function openAddEvent(date: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(date);
    clickedDate.setHours(0, 0, 0, 0);

    if (clickedDate < today) {
      showWarning('Data non valida', 'Non puoi creare eventi per date passate.');
      return;
    }

    const startDate = new Date(date);
    if (startDate.getHours() === 0) {
      startDate.setHours(9, 0, 0, 0);
    }
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    setFormData({
      ...defaultFormData,
      startDateTime: formatDateTimeLocal(startDate),
      endDateTime: formatDateTimeLocal(endDate),
    });
    setEditingEventId(null);
    setShowEventForm(true);
  }

  function openEditEvent(event: CalendarEvent) {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    setFormData({
      title: event.title,
      description: event.description || '',
      type: event.type,
      startDateTime: formatDateTimeLocal(startDate),
      endDateTime: formatDateTimeLocal(endDate),
      isAllDay: event.isAllDay,
      locationType: event.locationType,
      locationDetails: event.locationDetails || '',
      onlineLink: event.onlineLink || '',
      isPublic: false,
      inviteUserIds: [],
      inviteGroupIds: [],
      sendEmailInvites: false,
      tagId: event.tag?.id ?? '',
    });
    setEditingEventId(event.id);
    setSelectedEvent(null);
    setShowEventForm(true);
  }

  function closeEventForm() {
    setShowEventForm(false);
    setEditingEventId(null);
    setFormData(defaultFormData);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const startDateTime = new Date(formData.startDateTime);
    const endDateTime = new Date(formData.endDateTime);
    const now = new Date();

    if (!editingEventId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateOnly = new Date(startDateTime);
      startDateOnly.setHours(0, 0, 0, 0);

      if (startDateOnly < today) {
        showWarning('Data non valida', 'Non puoi creare eventi per date passate.');
        return;
      }

      if (!formData.isAllDay && startDateTime < now) {
        showWarning('Orario non valido', 'Non puoi creare eventi per orari già passati.');
        return;
      }
    }

    if (formData.isAllDay) {
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);
    }

    const eventData = {
      title: formData.title,
      description: formData.description || undefined,
      type: formData.type,
      startDate: startDateTime,
      endDate: endDateTime,
      isAllDay: formData.isAllDay,
      locationType: formData.locationType,
      locationDetails: formData.locationDetails || undefined,
      onlineLink: formData.onlineLink || undefined,
      isPublic: formData.isPublic,
      tagId: formData.tagId || null,
    };

    if (editingEventId) {
      updateEventMutation.mutate({ id: editingEventId, ...eventData });
    } else {
      createEventMutation.mutate({
        ...eventData,
        inviteUserIds: formData.inviteUserIds.length > 0 ? formData.inviteUserIds : undefined,
        inviteGroupIds: formData.inviteGroupIds.length > 0 ? formData.inviteGroupIds : undefined,
        sendEmailInvites: formData.sendEmailInvites,
      });
    }
  }

  return {
    events,
    isLoading,
    stats,
    selectedEvent,
    setSelectedEvent,
    formData,
    setFormData,
    editingEventId,
    showEventForm,
    deleteConfirm,
    setDeleteConfirm,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
    openAddEvent,
    openEditEvent,
    closeEventForm,
    handleSubmit,
    deleteEvent: (id: string) => deleteEventMutation.mutate({ id }),
  };
}
