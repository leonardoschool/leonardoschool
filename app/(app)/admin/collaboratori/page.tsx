/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: 'any' types used for complex tRPC query results with nested collaborator data
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { 
  Users,
  Search,
  UserCheck,
  UserX,
  FileText,
  Mail,
  Shield,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

// Modal di conferma custom
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Conferma',
  variant = 'danger',
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}) {
  if (!isOpen) return null;

  const variantColors = {
    danger: {
      icon: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      button: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
  };

  const colorScheme = variantColors[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${colors.background.card} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${colorScheme.icon} flex items-center justify-center flex-shrink-0`}>
            <AlertTriangle className={`w-6 h-6 ${colorScheme.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${colors.text.primary}`}>{title}</h3>
            <p className={`mt-2 ${colors.text.secondary}`}>{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-xl ${colors.background.secondary} font-medium hover:opacity-80 transition-opacity disabled:opacity-50`}
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-xl ${colorScheme.button} font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="xs" variant="white" />
                Attendere...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCollaboratorsPage() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string; userName: string }>({
    isOpen: false,
    userId: '',
    userName: '',
  });

  // Get all collaborators
  const { data: collaborators, isLoading, refetch } = trpc.collaborators.getAll.useQuery();
  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  // Mutations
  const toggleActiveMutation = trpc.collaborators.toggleActive.useMutation({
    onSuccess: () => {
      refetch();
      showSuccess('Stato aggiornato');
    },
    onError: handleMutationError,
  });

  const updatePermissionsMutation = trpc.collaborators.updatePermissions.useMutation({
    onSuccess: () => {
      refetch();
      showSuccess('Permessi aggiornati');
    },
    onError: handleMutationError,
  });

  const createContractMutation = trpc.collaborators.createContract.useMutation({
    onSuccess: () => {
      refetch();
      showSuccess('Contratto creato');
    },
    onError: handleMutationError,
  });

  const deleteUserMutation = trpc.users.deleteUser.useMutation({
    onSuccess: () => {
      refetch();
      utils.users.getAll.invalidate();
      utils.users.getStats.invalidate();
      setDeleteModal({ isOpen: false, userId: '', userName: '' });
      showSuccess('Collaboratore eliminato');
    },
    onError: handleMutationError,
  });

  const filteredCollaborators = collaborators?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleToggleActive = (userId: string, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ userId, isActive: !currentStatus });
  };

  const handleCreateContract = (collaboratorId: string) => {
    createContractMutation.mutate({ collaboratorId });
  };

  const openDeleteModal = (userId: string, userName: string) => {
    setDeleteModal({ isOpen: true, userId, userName });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
              Collaboratori
            </h1>
            <p className={colors.text.secondary}>
              Gestisci i collaboratori e i loro permessi
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${colors.background.secondary} ${colors.text.secondary}`}>
            <span className="font-semibold">{collaborators?.length || 0}</span> collaboratori
          </div>
        </div>

        {/* Search */}
        <div className={`${colors.background.card} rounded-xl p-4 border ${colors.border.primary} mb-6`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.icon.secondary}`} />
            <input
              type="text"
              placeholder="Cerca collaboratori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-[#a8012b]/20`}
            />
          </div>
        </div>

        {/* Collaborators List */}
        <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} overflow-hidden`}>
          {isLoading ? (
            <div className="p-8 text-center">
              <Spinner size="lg" />
              <p className={`mt-4 ${colors.text.secondary}`}>Caricamento...</p>
            </div>
          ) : filteredCollaborators.length === 0 ? (
            <div className="p-8 text-center">
              <Users className={`w-12 h-12 mx-auto ${colors.text.muted} mb-3`} />
              <p className={colors.text.secondary}>
                Nessun collaboratore trovato
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCollaborators.map((user: any) => {
                const collaborator = user.collaborator;
                const isExpanded = expandedId === user.id;
                const latestContract = collaborator?.contracts?.[0];

                return (
                  <div key={user.id} className={`${colors.effects.hover.bgSubtle} transition-colors`}>
                    {/* Main row */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : user.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold text-lg`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${colors.text.primary} truncate`}>
                              {user.name}
                            </h3>
                            {user.isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Attivo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                <Clock className="w-3 h-3 mr-1" />
                                In attesa
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className={`flex items-center gap-1 text-sm ${colors.text.secondary}`}>
                              <Mail className="w-3.5 h-3.5" />
                              {user.email}
                            </span>
                            {collaborator?.specialization && (
                              <span className={`text-sm ${colors.text.muted}`}>
                                {collaborator.specialization}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Contract status */}
                        {latestContract && (
                          <div className="hidden sm:block">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              latestContract.status === 'SIGNED' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : latestContract.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              <FileText className="w-3 h-3 mr-1" />
                              {latestContract.status === 'SIGNED' ? 'Firmato' : 
                               latestContract.status === 'PENDING' ? 'Da firmare' : 
                               latestContract.status}
                            </span>
                          </div>
                        )}

                        {/* Expand icon */}
                        {isExpanded ? (
                          <ChevronUp className={`w-5 h-5 ${colors.icon.secondary}`} />
                        ) : (
                          <ChevronDown className={`w-5 h-5 ${colors.icon.secondary}`} />
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className={`px-4 pb-4 border-t ${colors.border.primary} pt-4 bg-gray-50 dark:bg-slate-800/50`}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Personal info */}
                          <div>
                            <h4 className={`font-semibold ${colors.text.primary} mb-3 flex items-center gap-2`}>
                              <Users className="w-4 h-4" />
                              Informazioni Personali
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className={colors.text.secondary}>Profilo completo:</span>
                                <span className={colors.text.primary}>
                                  {user.profileCompleted ? 'Sì' : 'No'}
                                </span>
                              </div>
                              {collaborator?.phone && (
                                <div className="flex justify-between">
                                  <span className={colors.text.secondary}>Telefono:</span>
                                  <span className={colors.text.primary}>{collaborator.phone}</span>
                                </div>
                              )}
                              {collaborator?.city && (
                                <div className="flex justify-between">
                                  <span className={colors.text.secondary}>Città:</span>
                                  <span className={colors.text.primary}>{collaborator.city} ({collaborator.province})</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className={colors.text.secondary}>Data registrazione:</span>
                                <span className={colors.text.primary}>
                                  {new Date(user.createdAt).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Permissions */}
                          <div>
                            <h4 className={`font-semibold ${colors.text.primary} mb-3 flex items-center gap-2`}>
                              <Shield className="w-4 h-4" />
                              Permessi
                            </h4>
                            <div className="space-y-2">
                              {[
                                { key: 'canManageQuestions', label: 'Gestione Domande' },
                                { key: 'canManageMaterials', label: 'Gestione Materiali' },
                                { key: 'canViewStats', label: 'Visualizza Statistiche' },
                                { key: 'canViewStudents', label: 'Visualizza Studenti' },
                              ].map(({ key, label }) => (
                                <label key={key} className="flex items-center justify-between">
                                  <span className={`text-sm ${colors.text.secondary}`}>{label}</span>
                                  <input
                                    type="checkbox"
                                    checked={collaborator?.[key as keyof typeof collaborator] as boolean ?? true}
                                    onChange={(e) => {
                                      if (collaborator) {
                                        updatePermissionsMutation.mutate({
                                          collaboratorId: collaborator.id,
                                          [key]: e.target.checked,
                                        });
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-[#a8012b] focus:ring-[#a8012b]"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className={`mt-6 pt-4 border-t ${colors.border.primary} flex flex-wrap gap-3`}>
                          <button
                            onClick={() => handleToggleActive(user.id, user.isActive)}
                            disabled={toggleActiveMutation.isPending}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                              user.isActive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="w-4 h-4" />
                                Disattiva Account
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4" />
                                Attiva Account
                              </>
                            )}
                          </button>

                          {!latestContract && collaborator && (
                            <button
                              onClick={() => handleCreateContract(collaborator.id)}
                              disabled={createContractMutation.isPending}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${colors.primary.bg} text-white hover:opacity-90 transition-opacity`}
                            >
                              <Plus className="w-4 h-4" />
                              Genera Contratto
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(user.id, user.name);
                            }}
                            disabled={deleteUserMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Elimina Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, userId: '', userName: '' })}
        onConfirm={() => deleteUserMutation.mutate({ userId: deleteModal.userId })}
        title="Elimina Collaboratore"
        message={`Sei sicuro di voler eliminare definitivamente l'account di "${deleteModal.userName}"? Questa azione è irreversibile.`}
        confirmLabel="Elimina"
        variant="danger"
        isLoading={deleteUserMutation.isPending}
      />
    </div>
  );
}
