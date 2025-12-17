'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Calendar, CalendarEvent, CalendarView, EventDetail, eventTypeLabels } from '@/components/ui/Calendar';
import { Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import { UserInfoModal } from '@/components/ui/UserInfoModal';
import { GroupInfoModal } from '@/components/ui/GroupInfoModal';
import {
  Calendar as CalendarIcon,
  Filter,
  BarChart3,
  Clock,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';

// ============================================================================
// STUDENTE CALENDARIO PAGE (READ-ONLY)
// ============================================================================

export default function StudentCalendarContent() {
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  // User info modal state
  const [selectedUserInfo, setSelectedUserInfo] = useState<{ userId: string; userType: 'STUDENT' | 'COLLABORATOR' } | null>(null);
  
  // Group info modal state
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<string | null>(null);

  // Stats detail modal state
  const [statsModal, setStatsModal] = useState<{ type: 'total' | 'month' | 'upcoming' | 'absences'; title: string } | null>(null);

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
      // Expand range to include multi-day events that might span into this week
      start.setDate(start.getDate() - 30);
      end.setDate(end.getDate() + 30);
    } else if (view === 'day') {
      // For day view, expand range to include multi-day events that might span this day
      start.setDate(start.getDate() - 30);
      end.setDate(end.getDate() + 30);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [selectedDate, view]);

  // Queries - Student sees only their own events (invited)
  const { data: eventsData, isLoading } = trpc.calendar.getEvents.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    type: filterType ? (filterType as CalendarEvent['type']) : undefined,
    includeInvitations: true,
    includeCancelled: false,
    onlyMyEvents: true,
  });

  const { data: stats } = trpc.calendar.getStats.useQuery();

  // Transform events for Calendar component
  const events: CalendarEvent[] = useMemo(() => {
    return (eventsData?.events || [])
      .filter((e): e is typeof e & { id: string; title: string } => !!e.id && !!e.title)
      .map((e) => {
        const invitations = e.invitations as Array<{
          id: string;
          status?: string;
          user?: { id: string; name: string; email: string } | null;
          group?: { id: string; name: string } | null;
        }> | undefined;

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
          isMine: true, // All events shown are for this student
          createdBy: e.createdBy,
          invitations: invitations?.map((inv) => ({
            id: inv.id,
            status: inv.status,
            user: inv.user,
            group: inv.group,
          })),
          _count: e._count,
        };
      });
  }, [eventsData]);

  // Event type filters 
  const typeFilterOptions = [
    { value: '', label: 'Tutti' },
    ...Object.entries(eventTypeLabels).map(([value, label]) => ({ value, label })),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${colors.text.primary}`}>
            <CalendarIcon className="w-8 h-8" />
            Il Mio Calendario
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-400/20 to-teal-400/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
              <GraduationCap className="h-4 w-4" />
              Studente
            </span>
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Visualizza i tuoi appuntamenti e lezioni programmate
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setStatsModal({ type: 'total', title: 'I miei eventi' })}
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
          
          <button
            onClick={() => setStatsModal({ type: 'absences', title: 'Assenze' })}
            className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.primary} hover:border-amber-400 transition-all text-left`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30`}>
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.pendingAbsences}</p>
                <p className={`text-sm ${colors.text.secondary}`}>Assenze</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${colors.icon.secondary}`} />
          <span className={`text-sm ${colors.text.secondary}`}>Filtra per tipo:</span>
        </div>
        <div className="w-48">
          <CustomSelect
            value={filterType}
            onChange={setFilterType}
            options={typeFilterOptions}
          />
        </div>
      </div>

      {/* Calendar (read-only - no onAddEvent handler) */}
      <Calendar
        events={events}
        view={view}
        onViewChange={setView}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onEventClick={setSelectedEvent}
        isLoading={isLoading}
      />

      {/* Event Detail Modal (read-only - no onEdit, no onDelete) */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUserClick={(userId, userType) => setSelectedUserInfo({ userId, userType })}
          onGroupClick={(groupId) => setSelectedGroupInfo(groupId)}
        />
      )}

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

      {/* Stats Modal - show events list when clicking stats */}
      {statsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg ${colors.background.card} rounded-xl shadow-2xl max-h-[80vh] overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${colors.border.primary} flex items-center justify-between`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                {statsModal.title}
              </h2>
              <button 
                onClick={() => setStatsModal(null)} 
                className={`p-2 rounded-lg ${colors.text.primary} hover:${colors.background.secondary}`}
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <p className={`text-center ${colors.text.secondary}`}>
                Statistiche dettagliate in sviluppo
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
