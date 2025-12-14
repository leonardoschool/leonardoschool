'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { PageLoader } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import {
  Calendar,
  Check,
  X,
  Clock,
  Filter,
  RefreshCw,
  UserMinus,
  AlertCircle,
  CheckCircle,
  User,
  FileText,
} from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { StaffAbsenceStatus } from '@prisma/client';

// Absence status configuration - using correct Prisma enum values
const absenceStatusConfig: Record<StaffAbsenceStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDING: { 
    label: 'In attesa', 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Clock className="h-4 w-4" />
  },
  CONFIRMED: { 
    label: 'Confermata', 
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <CheckCircle className="h-4 w-4" />
  },
  REJECTED: { 
    label: 'Rifiutata', 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="h-4 w-4" />
  },
  CANCELLED: { 
    label: 'Annullata', 
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    icon: <X className="h-4 w-4" />
  },
};

export default function AdminAssenzePage() {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  
  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [selectedStatus, setSelectedStatus] = useState<StaffAbsenceStatus | 'ALL'>('ALL');
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  
  // Modal state for response
  const [responseModal, setResponseModal] = useState<{
    isOpen: boolean;
    absenceId: string;
    action: 'approve' | 'reject';
    userName: string;
  } | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  
  // Date range for selected month (extended to show future absences)
  const dateRange = useMemo(() => ({
    startDate: startOfMonth(subMonths(selectedMonth, 1)),
    endDate: endOfMonth(addMonths(selectedMonth, 2)),
  }), [selectedMonth]);
  
  // Month options for selector
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = -2; i < 4; i++) {
      const date = addMonths(new Date(), i);
      options.push({
        value: date.toISOString(),
        label: format(date, 'MMMM yyyy', { locale: it }),
      });
    }
    return options;
  }, []);
  
  // Fetch absences
  const { data: absencesData, isLoading, refetch } = trpc.calendar.getStaffAbsences.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
  });
  
  // Update absence status mutation
  const updateAbsenceStatus = trpc.calendar.updateAbsenceStatus.useMutation({
    onSuccess: (data) => {
      const action = data?.status === 'CONFIRMED' ? 'confermata' : 'rifiutata';
      showSuccess('Assenza aggiornata', `La richiesta di assenza è stata ${action}.`);
      setResponseModal(null);
      setResponseNotes('');
      refetch();
    },
    onError: handleMutationError,
  });
  
  // Extract absences from response
  const allAbsences = useMemo(() => absencesData?.absences || [], [absencesData?.absences]);
  
  // Filter absences
  const filteredAbsences = useMemo(() => {
    if (!allAbsences.length) return [];
    
    let absences = [...allAbsences];
    
    // Filter by pending status
    if (showOnlyPending) {
      absences = absences.filter(a => a.status === 'PENDING');
    }
    
    // Filter by selected month
    absences = absences.filter(a => {
      const absenceDate = new Date(a.startDate);
      return absenceDate.getMonth() === selectedMonth.getMonth() &&
             absenceDate.getFullYear() === selectedMonth.getFullYear();
    });
    
    return absences.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [allAbsences, showOnlyPending, selectedMonth]);
  
  // Stats
  const stats = useMemo(() => {
    if (!allAbsences.length) return { pending: 0, confirmed: 0, rejected: 0, total: 0 };
    
    const monthAbsences = allAbsences.filter(a => {
      const absenceDate = new Date(a.startDate);
      return absenceDate.getMonth() === selectedMonth.getMonth() &&
             absenceDate.getFullYear() === selectedMonth.getFullYear();
    });
    
    return {
      pending: monthAbsences.filter(a => a.status === 'PENDING').length,
      confirmed: monthAbsences.filter(a => a.status === 'CONFIRMED').length,
      rejected: monthAbsences.filter(a => a.status === 'REJECTED').length,
      total: monthAbsences.length,
    };
  }, [allAbsences, selectedMonth]);
  
  // Handle approve/reject
  const handleResponse = (action: 'approve' | 'reject') => {
    if (!responseModal) return;
    
    updateAbsenceStatus.mutate({
      id: responseModal.absenceId,
      status: action === 'approve' ? 'CONFIRMED' : 'REJECTED',
      adminNotes: responseNotes || undefined,
    });
  };
  
  // Quick actions (prefixed with _ as they're reserved for future inline buttons)
  const _handleQuickApprove = (absenceId: string) => {
    updateAbsenceStatus.mutate({
      id: absenceId,
      status: 'CONFIRMED',
    });
  };
  
  const _handleQuickReject = (absenceId: string) => {
    updateAbsenceStatus.mutate({
      id: absenceId,
      status: 'REJECTED',
    });
  };
  
  if (isLoading) {
    return <PageLoader />;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestione Assenze Staff
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Approva o rifiuta le richieste di assenza del personale
          </p>
        </div>
        
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Aggiorna
        </button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <UserMinus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Totale richieste</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">In attesa</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.confirmed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Confermate</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Rifiutate</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
            
            {/* Pending only toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyPending}
                onChange={(e) => setShowOnlyPending(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Solo in attesa
              </span>
            </label>
            
            {/* Status filter */}
            {!showOnlyPending && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Stato:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as StaffAbsenceStatus | 'ALL')}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="ALL">Tutti</option>
                  {Object.entries(absenceStatusConfig).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Absences List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredAbsences.length === 0 ? (
          <div className="text-center py-12">
            <UserMinus className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {showOnlyPending 
                ? 'Nessuna richiesta di assenza in attesa.' 
                : 'Nessuna richiesta di assenza trovata per questo periodo.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAbsences.map((absence) => {
              const statusConfig = absenceStatusConfig[absence.status as StaffAbsenceStatus];
              const isPending = absence.status === 'PENDING';
              // Get initials from name
              const nameParts = absence.requester.name?.split(' ') || [];
              const initials = nameParts.length >= 2 
                ? `${nameParts[0]?.[0] || ''}${nameParts[1]?.[0] || ''}`
                : (absence.requester.name?.[0] || 'U');
              
              return (
                <div key={absence.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* User & Absence Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                        {initials.toUpperCase()}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {absence.requester.name}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(absence.startDate), 'dd/MM/yyyy', { locale: it })}
                            {absence.endDate && new Date(absence.endDate).toDateString() !== new Date(absence.startDate).toDateString() && (
                              <> - {format(new Date(absence.endDate), 'dd/MM/yyyy', { locale: it })}</>
                            )}
                          </span>
                          {absence.isAllDay ? (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                              Giornata intera
                            </span>
                          ) : (
                            <span>
                              {format(new Date(absence.startDate), 'HH:mm')} - {format(new Date(absence.endDate || absence.startDate), 'HH:mm')}
                            </span>
                          )}
                        </div>
                        
                        {absence.reason && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                            <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            {absence.reason}
                          </p>
                        )}
                        
                        {absence.adminNotes && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            Note admin: {absence.adminNotes}
                          </p>
                        )}
                        
                        {absence.substitute && (
                          <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Sostituto: {absence.substitute.name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    {isPending && (
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <button
                          onClick={() => setResponseModal({
                            isOpen: true,
                            absenceId: absence.id,
                            action: 'approve',
                            userName: absence.requester.name || 'Staff',
                          })}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${colors.status.success.bg} hover:opacity-90`}
                        >
                          <Check className="h-4 w-4" />
                          Conferma
                        </button>
                        <button
                          onClick={() => setResponseModal({
                            isOpen: true,
                            absenceId: absence.id,
                            action: 'reject',
                            userName: absence.requester.name || 'Staff',
                          })}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${colors.status.error.bg} hover:opacity-90`}
                        >
                          <X className="h-4 w-4" />
                          Rifiuta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Response Modal */}
      {responseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setResponseModal(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {responseModal.action === 'approve' ? 'Conferma' : 'Rifiuta'} assenza
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Stai per {responseModal.action === 'approve' ? 'confermare' : 'rifiutare'} la richiesta di assenza di <strong>{responseModal.userName}</strong>.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note (opzionale)
              </label>
              <textarea
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Inserisci eventuali note..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setResponseModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => handleResponse(responseModal.action)}
                disabled={updateAbsenceStatus.isPending}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                  responseModal.action === 'approve' 
                    ? `${colors.status.success.bg} hover:opacity-90` 
                    : `${colors.status.error.bg} hover:opacity-90`
                }`}
              >
                {updateAbsenceStatus.isPending ? 'Elaborazione...' : 
                  responseModal.action === 'approve' ? 'Conferma' : 'Rifiuta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
