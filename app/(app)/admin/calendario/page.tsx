'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useAuth } from '@/lib/hooks/useAuth';
import { Calendar, CalendarEvent, CalendarView, EventDetail, eventTypeLabels } from '@/components/ui/Calendar';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import DateTimePicker from '@/components/ui/DateTimePicker';
import DatePicker from '@/components/ui/DatePicker';
import Checkbox from '@/components/ui/Checkbox';
import { UserInfoModal } from '@/components/ui/UserInfoModal';
import { GroupInfoModal } from '@/components/ui/GroupInfoModal';
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  BarChart3,
  Clock,
  Users,
  AlertTriangle,
  X,
  Search,
  GraduationCap,
  Briefcase,
  Eye,
  CheckSquare,
  Star,
} from 'lucide-react';

// Event Form Modal
interface EventFormData {
  title: string;
  description: string;
  type: 'LESSON' | 'SIMULATION' | 'MEETING' | 'EXAM' | 'OTHER';
  startDateTime: string; // ISO datetime-local format: "YYYY-MM-DDTHH:mm"
  endDateTime: string;   // ISO datetime-local format: "YYYY-MM-DDTHH:mm"
  isAllDay: boolean;
  locationType: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  locationDetails: string;
  onlineLink: string;
  isPublic: boolean;
  inviteUserIds: string[];
  inviteGroupIds: string[];
  sendEmailInvites: boolean;
}

const defaultFormData: EventFormData = {
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
};

export default function AdminCalendarPage() {
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess, showWarning } = useToast();
  const { user: currentUser } = useAuth();

  // Calculate date range for query based on view
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
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [selectedDate, view]);

  // Queries
  const { data: eventsData, isLoading } = trpc.calendar.getEvents.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    type: filterType ? (filterType as CalendarEvent['type']) : undefined,
    includeInvitations: true,
    includeCancelled: false,
  });

  const { data: stats } = trpc.calendar.getStats.useQuery();

  // Data for invites - get all active users
  const { data: studentsData } = trpc.students.getStudents.useQuery({ 
    page: 1, 
    pageSize: 500, 
    isActive: true 
  });
  const { data: collaboratorsData } = trpc.collaborators.getAll.useQuery();
  const { data: groupsData } = trpc.groups.getGroups.useQuery({ 
    page: 1, 
    pageSize: 100 
  });

  // Search and filter state for invites
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteRoleFilter, setInviteRoleFilter] = useState<'all' | 'STUDENT' | 'COLLABORATOR'>('all');
  const [groupSearch, setGroupSearch] = useState('');
  
  // User info modal state
  const [selectedUserInfo, setSelectedUserInfo] = useState<{ userId: string; userType: 'STUDENT' | 'COLLABORATOR' } | null>(null);
  
  // Group info modal state
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<string | null>(null);

  // Stats detail modal state
  const [statsModal, setStatsModal] = useState<{ type: 'total' | 'month' | 'upcoming' | 'mine' | 'absences'; title: string } | null>(null);

  // Combined users list with roles and subjects for collaborators
  const allUsers = useMemo(() => {
    const users: { 
      id: string; 
      name: string; 
      role: 'STUDENT' | 'COLLABORATOR'; 
      extra?: string;
      subjects?: string;
    }[] = [];
    
    // Add students
    studentsData?.students?.forEach(student => {
      users.push({
        id: student.id,
        name: student.name || 'Studente',
        role: 'STUDENT',
        extra: student.className,
      });
    });
    
    // Add collaborators (getAll returns an array of users with collaborator data)
    if (collaboratorsData && Array.isArray(collaboratorsData)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (collaboratorsData as any[]).forEach((collab: any) => {
        if (collab.isActive) {
          // Get subjects from collaborator
          const subjects = collab.collaborator?.subjects || [];
          const subjectNames = subjects
            .map((s: { subject?: { code?: string; name?: string } }) => s.subject?.code || s.subject?.name)
            .filter(Boolean)
            .join(', ');
          
          users.push({
            id: collab.id,
            name: collab.name || 'Collaboratore',
            role: 'COLLABORATOR',
            extra: collab.collaborator?.specialization,
            subjects: subjectNames || undefined,
          });
        }
      });
    }
    
    return users;
  }, [studentsData, collaboratorsData]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const matchesSearch = inviteSearch === '' || 
        user.name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
        user.extra?.toLowerCase().includes(inviteSearch.toLowerCase());
      const matchesRole = inviteRoleFilter === 'all' || user.role === inviteRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allUsers, inviteSearch, inviteRoleFilter]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (!groupsData?.groups) return [];
    return groupsData.groups.filter(group => 
      groupSearch === '' || group.name.toLowerCase().includes(groupSearch.toLowerCase())
    );
  }, [groupsData, groupSearch]);

  // Mutations
  const createEventMutation = trpc.calendar.createEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.calendar.getStats.invalidate();
      showSuccess('Evento creato', 'L\'evento è stato creato con successo.');
      closeEventForm();
    },
    onError: handleMutationError,
  });

  const updateEventMutation = trpc.calendar.updateEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      showSuccess('Evento aggiornato', 'L\'evento è stato aggiornato con successo.');
      closeEventForm();
    },
    onError: handleMutationError,
  });

  const _cancelEventMutation = trpc.calendar.cancelEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.calendar.getStats.invalidate();
      showSuccess('Evento annullato', 'L\'evento è stato annullato.');
      setDeleteConfirm(null);
      setSelectedEvent(null);
    },
    onError: handleMutationError,
  });

  const deleteEventMutation = trpc.calendar.deleteEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.calendar.getStats.invalidate();
      showSuccess('Evento eliminato', 'L\'evento è stato eliminato definitivamente.');
      setDeleteConfirm(null);
      setSelectedEvent(null);
    },
    onError: handleMutationError,
  });

  // Transform events for Calendar component
  const events: CalendarEvent[] = useMemo(() => {
    const currentUserId = currentUser?.id;
    
    return (eventsData?.events || [])
      .filter((e): e is typeof e & { id: string; title: string } => !!e.id && !!e.title)
      .map((e) => {
        // Type assertion for invitations with relations
        const invitations = e.invitations as Array<{
          id: string;
          status?: string;
          user?: { id: string; name: string; email: string } | null;
          group?: { id: string; name: string } | null;
        }> | undefined;

        // Determine if this event is "mine" (created by me or I'm invited)
        const isCreatedByMe = e.createdBy?.id === currentUserId;
        const isInvitedToMe = invitations?.some(inv => inv.user?.id === currentUserId);
        const isMine = isCreatedByMe || isInvitedToMe;

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
          invitations: invitations?.map((inv) => ({
            id: inv.id,
            status: inv.status,
            user: inv.user,
            group: inv.group,
          })),
          _count: e._count,
        };
      })
      // Filter by "showOnlyMine" if enabled
      .filter((e) => !showOnlyMine || e.isMine);
  }, [eventsData, currentUser?.id, showOnlyMine]);

  // Handlers
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const openAddEvent = (date: Date) => {
    // Block creating events for past dates
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
  };

  const openEditEvent = (event: CalendarEvent) => {
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
      isPublic: false, // Will be fetched from full event
      inviteUserIds: [], // Editing invites is not supported in edit mode
      inviteGroupIds: [],
      sendEmailInvites: false,
    });
    setEditingEventId(event.id);
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const closeEventForm = () => {
    setShowEventForm(false);
    setEditingEventId(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startDateTime = new Date(formData.startDateTime);
    const endDateTime = new Date(formData.endDateTime);
    const now = new Date();
    
    // Block events in the past (only for new events, not edits)
    if (!editingEventId) {
      // Allow same day events, just not past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateOnly = new Date(startDateTime);
      startDateOnly.setHours(0, 0, 0, 0);
      
      if (startDateOnly < today) {
        showWarning('Data non valida', 'Non puoi creare eventi per date passate.');
        return;
      }
      
      // For non-all-day events, check if the time has passed today
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${colors.text.primary}`}>
            <CalendarIcon className="w-8 h-8" />
            Calendario
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Gestisci eventi, lezioni e simulazioni
          </p>
        </div>

        <button
          onClick={() => openAddEvent(new Date())}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${colors.primary.gradient} text-white`}
        >
          <Plus className="w-4 h-4" />
          Nuovo Evento
        </button>
      </div>

      {/* Stats Cards - Clickable filters */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Events */}
          <button
            onClick={() => setStatsModal({ type: 'total', title: 'Tutti gli eventi' })}
            className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.primary} hover:border-indigo-400 transition-all text-left`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30`}>
                <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.totalEvents}</p>
                <p className={`text-sm ${colors.text.secondary}`}>Totali</p>
              </div>
            </div>
          </button>
          
          {/* Events This Month */}
          <button
            onClick={() => setStatsModal({ type: 'month', title: 'Eventi questo mese' })}
            className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.primary} hover:border-green-400 transition-all text-left`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-green-100 dark:bg-green-900/30`}>
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.eventsThisMonth}</p>
                <p className={`text-sm ${colors.text.secondary}`}>Questo mese</p>
              </div>
            </div>
          </button>
          
          {/* Upcoming Events */}
          <button
            onClick={() => setStatsModal({ type: 'upcoming', title: 'Prossimi eventi' })}
            className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.primary} hover:border-blue-400 transition-all text-left`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30`}>
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.upcomingEvents}</p>
                <p className={`text-sm ${colors.text.secondary}`}>In arrivo</p>
              </div>
            </div>
          </button>
          
          {/* Pending Absences */}
          <button
            onClick={() => setStatsModal({ type: 'absences', title: 'Assenze da gestire' })}
            className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.primary} hover:border-amber-400 transition-all text-left`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30`}>
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.pendingAbsences}</p>
                <p className={`text-sm ${colors.text.secondary}`}>Assenze pending</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Filter Row with "Only Mine" toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Type Filter */}
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${colors.icon.secondary}`} />
            <span className={`text-sm ${colors.text.secondary}`}>Filtra per tipo:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterType === '' 
                ? colors.primary.bg + ' text-white' 
                : `${colors.background.secondary} ${colors.text.primary} hover:bg-gray-200 dark:hover:bg-slate-700`
            }`}
          >
            Tutti
          </button>
          {Object.entries(eventTypeLabels).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterType === type 
                  ? colors.primary.bg + ' text-white' 
                  : `${colors.background.secondary} ${colors.text.primary} hover:bg-gray-200 dark:hover:bg-slate-700`
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* "Only Mine" Toggle Button */}
        <button
          onClick={() => setShowOnlyMine(!showOnlyMine)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 shrink-0 ${
            showOnlyMine 
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
          }`}
        >
          <Star className={`w-4 h-4 ${showOnlyMine ? 'fill-white' : 'fill-amber-400'}`} />
          <span>I miei ({stats?.myEventsCount ?? 0})</span>
        </button>
      </div>
      </div>

      {/* Calendar */}
      <Calendar
        events={events}
        view={view}
        onViewChange={setView}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onEventClick={setSelectedEvent}
        onAddEvent={openAddEvent}
        isLoading={isLoading}
      />

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => openEditEvent(selectedEvent)}
          onDelete={() => setDeleteConfirm({ id: selectedEvent.id, title: selectedEvent.title })}
          onUserClick={(userId, userType) => setSelectedUserInfo({ userId, userType })}
          onGroupClick={(groupId) => setSelectedGroupInfo(groupId)}
        />
      )}

      {/* Event Form Modal */}
      {showEventForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-2xl ${colors.background.card} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b ${colors.border.primary} flex items-center justify-between sticky top-0 ${colors.background.card} z-10`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                {editingEventId ? 'Modifica Evento' : 'Nuovo Evento'}
              </h2>
              <button onClick={closeEventForm} className={`p-2 rounded-lg ${colors.text.primary} hover:${colors.background.secondary}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                  Titolo *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  className={`w-full px-4 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                  placeholder="Nome dell'evento"
                />
              </div>

              {/* Type */}
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                  Tipo
                </label>
                <CustomSelect
                  value={formData.type}
                  onChange={(value) => setFormData((prev) => ({ ...prev, type: value as EventFormData['type'] }))}
                  options={Object.entries(eventTypeLabels).map(([value, label]) => ({ value, label }))}
                />
              </div>

              {/* All Day Toggle */}
              <Checkbox
                id="isAllDay"
                checked={formData.isAllDay}
                onChange={(e) => setFormData((prev) => ({ ...prev, isAllDay: e.target.checked }))}
                label="Tutto il giorno"
              />

              {/* Date & Time */}
              {formData.isAllDay ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                      Data inizio *
                    </label>
                    <DatePicker
                      id="startDate"
                      value={formData.startDateTime.split('T')[0]}
                      onChange={(value) => setFormData((prev) => ({ 
                        ...prev, 
                        startDateTime: `${value}T00:00` 
                      }))}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                      Data fine *
                    </label>
                    <DatePicker
                      id="endDate"
                      value={formData.endDateTime.split('T')[0]}
                      onChange={(value) => setFormData((prev) => ({ 
                        ...prev, 
                        endDateTime: `${value}T23:59` 
                      }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                      Data e ora inizio *
                    </label>
                    <DateTimePicker
                      value={formData.startDateTime}
                      onChange={(value) => setFormData((prev) => ({ ...prev, startDateTime: value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                      Data e ora fine *
                    </label>
                    <DateTimePicker
                      value={formData.endDateTime}
                      onChange={(value) => setFormData((prev) => ({ ...prev, endDateTime: value }))}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Location Type */}
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                  Modalità
                </label>
                <CustomSelect
                  value={formData.locationType}
                  onChange={(value) => setFormData((prev) => ({ ...prev, locationType: value as EventFormData['locationType'] }))}
                  options={[
                    { value: 'IN_PERSON', label: 'In presenza' },
                    { value: 'ONLINE', label: 'Online' },
                    { value: 'HYBRID', label: 'Ibrido' },
                  ]}
                />
              </div>

              {/* Location Details */}
              {(formData.locationType === 'IN_PERSON' || formData.locationType === 'HYBRID') && (
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                    Luogo
                  </label>
                  <input
                    type="text"
                    value={formData.locationDetails}
                    onChange={(e) => setFormData((prev) => ({ ...prev, locationDetails: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                    placeholder="Es. Aula 3, Via Roma 10"
                  />
                </div>
              )}

              {/* Online Link */}
              {(formData.locationType === 'ONLINE' || formData.locationType === 'HYBRID') && (
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                    Link online
                  </label>
                  <input
                    type="url"
                    value={formData.onlineLink}
                    onChange={(e) => setFormData((prev) => ({ ...prev, onlineLink: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                  Descrizione
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                  placeholder="Descrizione opzionale"
                />
              </div>

              {/* Invites Section - Only for new events */}
              {!editingEventId && (
                <div className={`space-y-4 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
                  <h3 className={`font-medium ${colors.text.primary} flex items-center gap-2`}>
                    <Users className="w-4 h-4" />
                    Invita partecipanti
                  </h3>

                  {/* Users (Students + Collaborators) */}
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                      Utenti
                    </label>
                    
                    {/* Search and Filter */}
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.icon.muted}`} />
                        <input
                          type="text"
                          value={inviteSearch}
                          onChange={(e) => setInviteSearch(e.target.value)}
                          placeholder="Cerca per nome..."
                          className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                        />
                      </div>
                      <div className="w-40">
                        <CustomSelect
                          value={inviteRoleFilter}
                          onChange={(value) => setInviteRoleFilter(value as 'all' | 'STUDENT' | 'COLLABORATOR')}
                          options={[
                            { value: 'all', label: 'Tutti' },
                            { value: 'STUDENT', label: 'Studenti' },
                            { value: 'COLLABORATOR', label: 'Collaboratori' },
                          ]}
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Quick select buttons */}
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          const studentIds = allUsers.filter(u => u.role === 'STUDENT').map(u => u.id);
                          const currentIds = formData.inviteUserIds;
                          const allStudentsSelected = studentIds.every(id => currentIds.includes(id));
                          
                          if (allStudentsSelected) {
                            // Deselect all students
                            setFormData(prev => ({
                              ...prev,
                              inviteUserIds: prev.inviteUserIds.filter(id => !studentIds.includes(id))
                            }));
                          } else {
                            // Select all students
                            setFormData(prev => ({
                              ...prev,
                              inviteUserIds: [...new Set([...prev.inviteUserIds, ...studentIds])]
                            }));
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          allUsers.filter(u => u.role === 'STUDENT').every(u => formData.inviteUserIds.includes(u.id)) && allUsers.some(u => u.role === 'STUDENT')
                            ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                            : `${colors.background.secondary} ${colors.text.secondary} ${colors.border.primary} hover:bg-blue-50 dark:hover:bg-blue-900/20`
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <GraduationCap className="w-3.5 h-3.5" />
                        Tutti studenti ({allUsers.filter(u => u.role === 'STUDENT').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const collabIds = allUsers.filter(u => u.role === 'COLLABORATOR').map(u => u.id);
                          const currentIds = formData.inviteUserIds;
                          const allCollabsSelected = collabIds.every(id => currentIds.includes(id));
                          
                          if (allCollabsSelected) {
                            // Deselect all collaborators
                            setFormData(prev => ({
                              ...prev,
                              inviteUserIds: prev.inviteUserIds.filter(id => !collabIds.includes(id))
                            }));
                          } else {
                            // Select all collaborators
                            setFormData(prev => ({
                              ...prev,
                              inviteUserIds: [...new Set([...prev.inviteUserIds, ...collabIds])]
                            }));
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          allUsers.filter(u => u.role === 'COLLABORATOR').every(u => formData.inviteUserIds.includes(u.id)) && allUsers.some(u => u.role === 'COLLABORATOR')
                            ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700'
                            : `${colors.background.secondary} ${colors.text.secondary} ${colors.border.primary} hover:bg-purple-50 dark:hover:bg-purple-900/20`
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <Briefcase className="w-3.5 h-3.5" />
                        Tutti collaboratori ({allUsers.filter(u => u.role === 'COLLABORATOR').length})
                      </button>
                    </div>

                    <div className={`max-h-40 overflow-y-auto p-2 rounded-lg ${colors.background.card} border ${colors.border.primary}`}>
                      {filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                          <Checkbox
                            checked={formData.inviteUserIds.includes(user.id)}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                inviteUserIds: e.target.checked
                                  ? [...prev.inviteUserIds, user.id]
                                  : prev.inviteUserIds.filter((id) => id !== user.id),
                              }));
                            }}
                          />
                          <span className={`text-sm ${colors.text.primary} flex-1 truncate`}>{user.name}</span>
                          {/* Subject badges for collaborators */}
                          {user.role === 'COLLABORATOR' && user.subjects && (
                            <span className={`text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium`}>
                              {user.subjects}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            user.role === 'STUDENT' 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          }`}>
                            {user.role === 'STUDENT' ? (
                              <><GraduationCap className="w-3 h-3" /> Studente</>
                            ) : (
                              <><Briefcase className="w-3 h-3" /> Collaboratore</>
                            )}
                          </span>
                          {/* Info button */}
                          <button
                            type="button"
                            onClick={() => setSelectedUserInfo({ userId: user.id, userType: user.role })}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${colors.text.muted} hover:${colors.text.primary} transition-colors`}
                            title="Visualizza info"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {filteredUsers.length === 0 && (
                        <p className={`text-sm ${colors.text.muted} text-center py-2`}>
                          {inviteSearch || inviteRoleFilter !== 'all' ? 'Nessun risultato' : 'Nessun utente attivo'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Groups */}
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                      Gruppi
                    </label>
                    <div className="relative mb-2">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.icon.muted}`} />
                      <input
                        type="text"
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        placeholder="Cerca gruppo..."
                        className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                      />
                    </div>
                    <div className={`max-h-32 overflow-y-auto p-2 rounded-lg ${colors.background.card} border ${colors.border.primary}`}>
                      {filteredGroups.map((group) => (
                        <div key={group.id} className="flex items-center gap-3 py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                          <Checkbox
                            checked={formData.inviteGroupIds.includes(group.id)}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                inviteGroupIds: e.target.checked
                                  ? [...prev.inviteGroupIds, group.id]
                                  : prev.inviteGroupIds.filter((id) => id !== group.id),
                              }));
                            }}
                          />
                          <span className={`text-sm ${colors.text.primary} flex-1`}>{group.name}</span>
                          <span className={`text-xs ${colors.text.muted}`}>({group.memberCount || 0} membri)</span>
                          <button
                            type="button"
                            onClick={() => setSelectedGroupInfo(group.id)}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${colors.text.secondary}`}
                            title="Info gruppo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {filteredGroups.length === 0 && (
                        <p className={`text-sm ${colors.text.muted} text-center py-2`}>
                          {groupSearch ? 'Nessun risultato' : 'Nessun gruppo disponibile'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {(formData.inviteUserIds.length > 0 || formData.inviteGroupIds.length > 0) && (
                    <div className={`text-sm ${colors.text.secondary} pt-2 border-t ${colors.border.primary}`}>
                      Inviti selezionati: {formData.inviteUserIds.length} utenti, {formData.inviteGroupIds.length} gruppi
                    </div>
                  )}

                  {/* Email Notification Toggle */}
                  <div className="pt-2">
                    <Checkbox
                      id="sendEmailInvites"
                      checked={formData.sendEmailInvites}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sendEmailInvites: e.target.checked }))}
                      label="Invia email di notifica agli invitati"
                    />
                  </div>
                </div>
              )}

              {/* Public Toggle */}
              <Checkbox
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
                label="Evento pubblico (visibile a tutti gli studenti)"
              />

              {/* Actions */}
              <div className={`flex justify-end gap-3 pt-4 border-t ${colors.border.primary}`}>
                <button
                  type="button"
                  onClick={closeEventForm}
                  className={`px-4 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:opacity-80`}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending || updateEventMutation.isPending}
                  className={`px-4 py-2 rounded-lg ${colors.primary.gradient} text-white font-medium disabled:opacity-50`}
                >
                  {(createEventMutation.isPending || updateEventMutation.isPending) ? (
                    <Spinner size="sm" variant="white" />
                  ) : editingEventId ? (
                    'Salva modifiche'
                  ) : (
                    'Crea evento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteEventMutation.mutate({ id: deleteConfirm.id });
          }
        }}
        title="Elimina evento"
        message={`Sei sicuro di voler eliminare l'evento "${deleteConfirm?.title}"? Questa azione è irreversibile.`}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleteEventMutation.isPending}
      />

      {/* User Info Modal */}
      {selectedUserInfo && (
        <UserInfoModal
          userId={selectedUserInfo.userId}
          userType={selectedUserInfo.userType}
          isOpen={true}
          onClose={() => setSelectedUserInfo(null)}
        />
      )}

      {/* Group Info Modal */}
      {selectedGroupInfo && (
        <GroupInfoModal
          groupId={selectedGroupInfo}
          isOpen={true}
          onClose={() => setSelectedGroupInfo(null)}
        />
      )}

      {/* Stats Detail Modal */}
      {statsModal && (
        <StatsDetailModal
          type={statsModal.type}
          title={statsModal.title}
          events={events}
          stats={stats}
          onClose={() => setStatsModal(null)}
        />
      )}
    </div>
  );
}

// ==================== STATS DETAIL MODAL ====================
interface StatsDetailModalProps {
  type: 'total' | 'month' | 'upcoming' | 'mine' | 'absences';
  title: string;
  events: CalendarEvent[];
  stats: { totalEvents: number; eventsThisMonth: number; upcomingEvents: number; myEventsCount: number; pendingAbsences: number } | undefined;
  onClose: () => void;
}

function StatsDetailModal({ type, title, events, stats, onClose }: StatsDetailModalProps) {
  // Filtra eventi in base al tipo di statistica
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (type) {
      case 'total':
        return events;
      case 'month':
        return events.filter(e => {
          const eventDate = new Date(e.startDate);
          return eventDate >= startOfMonth && eventDate <= endOfMonth;
        });
      case 'upcoming':
        return events.filter(e => new Date(e.startDate) > now).sort((a, b) => 
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
      case 'mine':
        return events.filter(e => e.isMine);
      case 'absences':
        // Le assenze pending richiederebbero dati specifici - mostro messaggio
        return [];
      default:
        return events;
    }
  }, [events, type]);

  const getTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      LESSON: 'Lezione',
      SIMULATION: 'Simulazione',
      MEETING: 'Riunione',
      EXAM: 'Esame',
      OTHER: 'Altro',
    };
    return labels[eventType] || eventType;
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg ${colors.background.card} rounded-xl shadow-2xl max-h-[80vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border.primary} flex items-center justify-between`}>
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>{title}</h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${colors.text.secondary}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {type === 'absences' ? (
            <div className={`text-center py-8 ${colors.text.muted}`}>
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
              <p>Le assenze pending sono gestite nella sezione presenze.</p>
              <p className="text-sm mt-2">Ci sono {stats?.pendingAbsences || 0} assenze da gestire.</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className={`text-center py-8 ${colors.text.muted}`}>
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nessun evento trovato</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.slice(0, 20).map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${colors.border.primary} ${colors.background.secondary}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {event.isMine && (
                          <span className="text-amber-400">★</span>
                        )}
                        <h4 className={`font-medium ${colors.text.primary} truncate`}>{event.title}</h4>
                      </div>
                      <div className={`text-sm ${colors.text.secondary} mt-1`}>
                        {new Date(event.startDate).toLocaleDateString('it-IT', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: event.isAllDay ? undefined : '2-digit',
                          minute: event.isAllDay ? undefined : '2-digit',
                        })}
                        {event.isAllDay && ' (tutto il giorno)'}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      event.type === 'LESSON' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      event.type === 'SIMULATION' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                      event.type === 'MEETING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                      event.type === 'EXAM' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {getTypeLabel(event.type)}
                    </span>
                  </div>
                </div>
              ))}
              {filteredEvents.length > 20 && (
                <p className={`text-center text-sm ${colors.text.muted} pt-2`}>
                  ... e altri {filteredEvents.length - 20} eventi
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${colors.border.primary}`}>
          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-lg ${colors.text.secondary} border ${colors.border.primary} hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
