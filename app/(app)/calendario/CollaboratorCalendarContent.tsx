'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { colors } from '@/lib/theme/colors';
import { Calendar, CalendarEvent, CalendarView, EventDetail, eventTypeLabels } from '@/components/ui/Calendar';
import { Spinner } from '@/components/ui/loaders';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import DateTimePicker from '@/components/ui/DateTimePicker';
import DatePicker from '@/components/ui/DatePicker';
import Checkbox from '@/components/ui/Checkbox';
import { UserInfoModal } from '@/components/ui/UserInfoModal';
import { GroupInfoModal } from '@/components/ui/GroupInfoModal';
import { useCalendarEvents } from '@/lib/hooks/useCalendarEvents';
import { useCalendarFilters } from '@/lib/hooks/useCalendarFilters';
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
} from 'lucide-react';

export default function CollaboratorCalendarContent() {
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterType, setFilterType] = useState<string>('');
  const [selectedUserInfo, setSelectedUserInfo] = useState<{ userId: string; userType: 'STUDENT' | 'COLLABORATOR' } | null>(null);
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<string | null>(null);
  const [statsModal, setStatsModal] = useState<{ type: 'total' | 'month' | 'upcoming' | 'absences'; title: string } | null>(null);

  const {
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
    isCreating,
    isUpdating,
    isDeleting,
    openAddEvent,
    openEditEvent,
    closeEventForm,
    handleSubmit,
    deleteEvent,
  } = useCalendarEvents({ selectedDate, view, filterType });

  const {
    inviteSearch,
    setInviteSearch,
    inviteRoleFilter,
    setInviteRoleFilter,
    groupSearch,
    setGroupSearch,
    allUsers,
    filteredUsers,
    filteredGroups,
  } = useCalendarFilters();

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
            Gestisci i tuoi eventi e lezioni
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

      {/* Filter Row */}
      <div className="flex items-center gap-4 flex-wrap">
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
          onEdit={selectedEvent.isMine ? () => openEditEvent(selectedEvent) : undefined}
          onDelete={selectedEvent.isMine ? () => setDeleteConfirm({ id: selectedEvent.id, title: selectedEvent.title }) : undefined}
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

              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                  Tipo
                </label>
                <CustomSelect
                  value={formData.type}
                  onChange={(value) => setFormData((prev) => ({ ...prev, type: value as 'LESSON' | 'SIMULATION' | 'MEETING' | 'EXAM' | 'OTHER' }))}
                  options={Object.entries(eventTypeLabels).map(([value, label]) => ({ value, label }))}
                />
              </div>

              <Checkbox
                id="isAllDay"
                checked={formData.isAllDay}
                onChange={(e) => setFormData((prev) => ({ ...prev, isAllDay: e.target.checked }))}
                label="Tutto il giorno"
              />

              {formData.isAllDay ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                      Data inizio *
                    </label>
                    <DatePicker
                      id="startDate"
                      value={formData.startDateTime.split('T')[0]}
                      onChange={(value) => setFormData((prev) => ({ ...prev, startDateTime: `${value}T00:00` }))}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                      Data fine *
                    </label>
                    <DatePicker
                      id="endDate"
                      value={formData.endDateTime.split('T')[0]}
                      onChange={(value) => setFormData((prev) => ({ ...prev, endDateTime: `${value}T23:59` }))}
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

              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                  Modalità
                </label>
                <CustomSelect
                  value={formData.locationType}
                  onChange={(value) => setFormData((prev) => ({ ...prev, locationType: value as 'ONLINE' | 'IN_PERSON' | 'HYBRID' }))}
                  options={[
                    { value: 'IN_PERSON', label: 'In presenza' },
                    { value: 'ONLINE', label: 'Online' },
                    { value: 'HYBRID', label: 'Ibrido' },
                  ]}
                />
              </div>

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

              {!editingEventId && (
                <div className={`space-y-4 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
                  <h3 className={`font-medium ${colors.text.primary} flex items-center gap-2`}>
                    <Users className="w-4 h-4" />
                    Invita partecipanti
                  </h3>

                  <div>
                    <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                      Utenti
                    </label>

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

                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          const studentIds = allUsers.filter(u => u.role === 'STUDENT').map(u => u.id);
                          const allSelected = studentIds.every(id => formData.inviteUserIds.includes(id));
                          setFormData(prev => ({
                            ...prev,
                            inviteUserIds: allSelected
                              ? prev.inviteUserIds.filter(id => !studentIds.includes(id))
                              : [...new Set([...prev.inviteUserIds, ...studentIds])],
                          }));
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
                          const allSelected = collabIds.every(id => formData.inviteUserIds.includes(id));
                          setFormData(prev => ({
                            ...prev,
                            inviteUserIds: allSelected
                              ? prev.inviteUserIds.filter(id => !collabIds.includes(id))
                              : [...new Set([...prev.inviteUserIds, ...collabIds])],
                          }));
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
                          {user.role === 'COLLABORATOR' && user.subjects && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">
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

                  {(formData.inviteUserIds.length > 0 || formData.inviteGroupIds.length > 0) && (
                    <div className={`text-sm ${colors.text.secondary} pt-2 border-t ${colors.border.primary}`}>
                      Inviti selezionati: {formData.inviteUserIds.length} utenti, {formData.inviteGroupIds.length} gruppi
                    </div>
                  )}

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

              <Checkbox
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
                label="Evento pubblico (visibile a tutti gli studenti)"
              />

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
                  disabled={isCreating || isUpdating}
                  className={`px-4 py-2 rounded-lg ${colors.primary.gradient} text-white font-medium disabled:opacity-50`}
                >
                  {(isCreating || isUpdating) ? (
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

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) deleteEvent(deleteConfirm.id);
        }}
        title="Elimina evento"
        message={`Sei sicuro di voler eliminare l'evento "${deleteConfirm?.title}"? Questa azione è irreversibile.`}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={isDeleting}
      />

      {selectedUserInfo && (
        <UserInfoModal
          userId={selectedUserInfo.userId}
          userType={selectedUserInfo.userType}
          isOpen={true}
          onClose={() => setSelectedUserInfo(null)}
        />
      )}

      {selectedGroupInfo && (
        <GroupInfoModal
          groupId={selectedGroupInfo}
          isOpen={true}
          onClose={() => setSelectedGroupInfo(null)}
        />
      )}

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

// Stats Detail Modal
interface StatsDetailModalProps {
  type: 'total' | 'month' | 'upcoming' | 'absences';
  title: string;
  events: CalendarEvent[];
  stats: { totalEvents: number; eventsThisMonth: number; upcomingEvents: number; myEventsCount: number; pendingAbsences: number } | undefined;
  onClose: () => void;
}

function StatsDetailModal({ type, title, events, stats, onClose }: StatsDetailModalProps) {
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
      case 'absences':
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
        <div className={`px-6 py-4 border-b ${colors.border.primary} flex items-center justify-between`}>
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>{title}</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${colors.text.secondary}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                        {event.isMine && <span className="text-amber-400">★</span>}
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
