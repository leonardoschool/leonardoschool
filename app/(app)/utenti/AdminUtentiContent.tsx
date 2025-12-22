/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: 'any' types used for complex tRPC query results with nested includes
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { Portal } from '@/components/ui/Portal';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import {
  Users,
  Search,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCheck,
  UserX,
  Trash2,
  Mail,
  Calendar,
  Shield,
  UserCog,
  GraduationCap,
  AlertTriangle,
  Send,
  FileText,
  Eye,
  FileQuestion,
  FilePen,
  Hourglass,
  Ban,
  FileX,
  X,
  User,
  FileEdit,
  BookOpen,
  Plus,
  Target,
  MessageSquare,
  FolderOpen,
} from 'lucide-react';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';

type RoleFilter = 'ALL' | 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
type StatusFilter = 'all' | 'active' | 'inactive' | 'pending_profile' | 'pending_contract' | 'pending_sign' | 'pending_activation' | 'no_signed_contract';

const statusOptions: { value: StatusFilter; label: string; shortLabel: string; icon: any; color: string; bg: string; activeColor: string }[] = [
  { value: 'all', label: 'Tutti', shortLabel: 'Tutti', icon: Users, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', activeColor: 'bg-gray-600' },
  { value: 'pending_profile', label: 'Attesa profilo', shortLabel: 'Profilo', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', activeColor: 'bg-amber-600' },
  { value: 'pending_contract', label: 'Attesa contratto', shortLabel: 'Contratto', icon: FileQuestion, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', activeColor: 'bg-orange-600' },
  { value: 'pending_sign', label: 'Attesa firma', shortLabel: 'Firma', icon: FilePen, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', activeColor: 'bg-blue-600' },
  { value: 'pending_activation', label: 'Attesa attivazione', shortLabel: 'Attivaz.', icon: Hourglass, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', activeColor: 'bg-purple-600' },
  { value: 'active', label: 'Attivi', shortLabel: 'Attivi', icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', activeColor: 'bg-green-600' },
  { value: 'inactive', label: 'Disattivati', shortLabel: 'Disatt.', icon: Ban, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', activeColor: 'bg-red-600' },
  { value: 'no_signed_contract', label: 'Senza contratto firmato', shortLabel: 'No Firma', icon: FileX, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30', activeColor: 'bg-rose-600' },
];

// Role dropdown component
function RoleDropdown({
  currentRole,
  onSelect,
}: {
  currentRole: 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
  onSelect: (role: 'ADMIN' | 'COLLABORATOR' | 'STUDENT') => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles = [
    { value: 'ADMIN' as const, label: 'Admin', icon: Shield, bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400', ring: 'ring-red-400' },
    { value: 'COLLABORATOR' as const, label: 'Collaboratore', icon: UserCog, bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-400' },
    { value: 'STUDENT' as const, label: 'Studente', icon: GraduationCap, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-400' },
  ];

  const current = roles.find(r => r.value === currentRole)!;
  const CurrentIcon = current.icon;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${current.bg} ${current.color} hover:ring-2 ${current.ring} hover:ring-offset-1`}
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        <span>{current.label}</span>
        <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full mt-1.5 rounded-xl shadow-lg border ${colors.border.primary} ${colors.background.card} z-[100] min-w-[150px] overflow-hidden`}>
          {roles.filter(r => r.value !== currentRole).map((role) => {
            const RoleIcon = role.icon;
            return (
              <button
                key={role.value}
                onClick={() => {
                  onSelect(role.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 transition-all hover:bg-gray-100 dark:hover:bg-gray-800`}
              >
                <div className={`w-7 h-7 rounded-lg ${role.bg} flex items-center justify-center`}>
                  <RoleIcon className={`w-3.5 h-3.5 ${role.color}`} />
                </div>
                <span className={`font-medium ${role.color}`}>{role.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Modal di conferma custom
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warning,
  confirmLabel = 'Conferma',
  variant = 'danger',
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  warning?: string;
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
      icon: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      button: `${colors.primary.gradient} text-white`,
    },
  };

  const colorScheme = variantColors[variant];

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className={`${colors.background.card} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${colorScheme.icon} flex items-center justify-center flex-shrink-0`}>
            <AlertTriangle className={`w-6 h-6 ${colorScheme.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${colors.text.primary}`}>{title}</h3>
            <p className={`mt-2 ${colors.text.secondary}`}>{message}</p>
            {warning && (
              <div className="mt-4 p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">{warning}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-white font-medium bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
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
    </Portal>
  );
}

// Modal assegna contratto avanzato con step
function AssignContractModal({
  isOpen,
  onClose,
  onAssign,
  templates,
  isLoading,
  targetId,
  targetType,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: { templateId: string; customContent?: string; customPrice?: number; adminNotes?: string; expiresInDays: number }) => void;
  templates: any[];
  isLoading: boolean;
  targetId: string;
  targetType: 'STUDENT' | 'COLLABORATOR';
}) {
  const [step, setStep] = useState<'select' | 'customize'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customContent, setCustomContent] = useState('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [showPreview, setShowPreview] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<'ALL' | 'STUDENT' | 'COLLABORATOR'>(targetType);

  // Filter templates based on selected filter
  const filteredTemplates = templates?.filter(t => 
    templateFilter === 'ALL' || t.targetRole === templateFilter
  ) || [];

  // Fetch preview when template is selected
  const { data: preview, isLoading: previewLoading } = trpc.contracts.getContractPreview.useQuery(
    {
      templateId: selectedTemplate!,
      ...(targetType === 'STUDENT' ? { studentId: targetId } : { collaboratorId: targetId }),
    },
    { enabled: !!selectedTemplate && !!targetId && step === 'customize' }
  );

  // Reset handler for when modal closes - called from parent via onClose callback
  const resetState = () => {
    setStep('select');
    setSelectedTemplate(null);
    setCustomContent('');
    setCustomPrice('');
    setTemplateFilter(targetType);
    setAdminNotes('');
    setExpiresInDays(7);
    setShowPreview(false);
  };

  // Handle close with reset
  const handleClose = () => {
    resetState();
    onClose();
  };

  // Sync content from preview when it loads
  // Using a ref to track previous preview to avoid unnecessary updates
  const prevPreviewRef = useRef<typeof preview>(null);
  
  useEffect(() => {
    if (preview && preview !== prevPreviewRef.current) {
      prevPreviewRef.current = preview;
      // Only update if values are different to avoid re-render loops
      if (customContent !== preview.previewContent) {
        setCustomContent(preview.previewContent);
      }
      const newPrice = preview.template.price?.toString() || '';
      if (customPrice !== newPrice) {
        setCustomPrice(newPrice);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setStep('customize');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedTemplate(null);
    setCustomContent('');
    setCustomPrice('');
  };

  const handleAssign = () => {
    if (!selectedTemplate) return;
    onAssign({
      templateId: selectedTemplate,
      customContent: customContent || undefined,
      customPrice: customPrice ? parseFloat(customPrice) : undefined,
      adminNotes: adminNotes || undefined,
      expiresInDays,
    });
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
        <div className={`${colors.background.card} rounded-2xl w-full max-w-4xl my-8 shadow-2xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className={`p-6 border-b ${colors.border.primary} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-bold ${colors.text.primary}`}>
                {step === 'select' ? 'Seleziona Template' : 'Personalizza Contratto'}
              </h3>
              <p className={`${colors.text.secondary} text-sm mt-1`}>
                {step === 'select' 
                  ? 'Scegli il template del contratto da assegnare'
                  : `Template: ${preview?.template.name || 'Caricamento...'}`
                }
              </p>
            </div>
            <button
              onClick={handleClose}
              className={`p-2 rounded-lg hover:${colors.background.secondary} text-gray-600 dark:text-gray-400`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mt-4">
            <div className={`flex items-center gap-2 ${step === 'select' ? colors.primary.text : colors.text.muted}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'select' ? colors.primary.gradient + ' text-white' : colors.background.secondary
              }`}>1</div>
              <span className="text-sm font-medium">Seleziona</span>
            </div>
            <div className={`flex-1 h-0.5 ${colors.background.secondary}`} />
            <div className={`flex items-center gap-2 ${step === 'customize' ? colors.primary.text : colors.text.muted}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'customize' ? colors.primary.gradient + ' text-white' : colors.background.secondary
              }`}>2</div>
              <span className="text-sm font-medium">Personalizza</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'select' ? (
            <>
              {/* Filter buttons */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-sm ${colors.text.muted}`}>Filtra:</span>
                <button
                  onClick={() => setTemplateFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    templateFilter === 'ALL'
                      ? `${colors.primary.bg} text-white`
                      : `${colors.background.secondary} ${colors.text.secondary} hover:opacity-80`
                  }`}
                >
                  Tutti ({templates?.length || 0})
                </button>
                <button
                  onClick={() => setTemplateFilter('STUDENT')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    templateFilter === 'STUDENT'
                      ? 'bg-blue-600 text-white'
                      : `${colors.background.secondary} ${colors.text.secondary} hover:opacity-80`
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Studenti ({templates?.filter(t => t.targetRole === 'STUDENT').length || 0})
                  </span>
                </button>
                <button
                  onClick={() => setTemplateFilter('COLLABORATOR')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    templateFilter === 'COLLABORATOR'
                      ? 'bg-purple-600 text-white'
                      : `${colors.background.secondary} ${colors.text.secondary} hover:opacity-80`
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <UserCog className="w-3.5 h-3.5" />
                    Collaboratori ({templates?.filter(t => t.targetRole === 'COLLABORATOR').length || 0})
                  </span>
                </button>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className={`p-5 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${colors.border.primary} hover:border-red-400`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold text-lg ${colors.text.primary}`}>{template.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        template.targetRole === 'STUDENT' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      }`}>
                        {template.targetRole === 'STUDENT' ? 'Studente' : 'Collaboratore'}
                      </span>
                    </div>
                    {template.description && (
                      <p className={`text-sm ${colors.text.secondary} mt-2 line-clamp-2`}>{template.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      {template.price ? (
                        <p className={`font-bold ${colors.primary.text}`}>
                          {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(template.price)}
                        </p>
                      ) : (
                        <span className={colors.text.muted}>Prezzo da definire</span>
                      )}
                      {template.duration && (
                        <span className={`text-sm ${colors.text.muted}`}>{template.duration}</span>
                      )}
                    </div>
                  </button>
                ))}                {!filteredTemplates.length && (
                  <div className="col-span-2 text-center py-12">
                    <FileText className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
                    <p className={colors.text.muted}>
                      {templates?.length ? 'Nessun template per questo filtro.' : 'Nessun template disponibile.'}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : preview ? (
                <>
                  {/* User Info Summary */}
                  <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                    <h4 className={`font-semibold mb-3 flex items-center gap-2 ${colors.text.primary}`}>
                      <User className="w-4 h-4" />
                      Dati Utente
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className={colors.text.muted}>Nome:</span>
                        <p className={`font-medium ${colors.text.primary}`}>{preview.user.name}</p>
                      </div>
                      <div>
                        <span className={colors.text.muted}>Email:</span>
                        <p className={`font-medium truncate ${colors.text.primary}`}>{preview.user.email}</p>
                      </div>
                      <div>
                        <span className={colors.text.muted}>Cod. Fiscale:</span>
                        <p className={`font-medium ${colors.text.primary}`}>{preview.user.fiscalCode || '-'}</p>
                      </div>
                      <div>
                        <span className={colors.text.muted}>Telefono:</span>
                        <p className={`font-medium ${colors.text.primary}`}>{preview.user.phone || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contract Content Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`font-semibold flex items-center gap-2 ${colors.text.primary}`}>
                        <FileEdit className="w-4 h-4" />
                        Contenuto Contratto
                      </label>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`text-sm px-3 py-1 rounded-lg ${colors.background.secondary} ${colors.text.primary}`}
                      >
                        {showPreview ? 'Modifica' : 'Anteprima'}
                      </button>
                    </div>
                    {showPreview ? (
                      <div 
                        className={`p-4 rounded-xl border ${colors.border.primary} prose prose-sm max-w-none dark:prose-invert overflow-auto max-h-64`}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(customContent) }}
                      />
                    ) : (
                      <textarea
                        value={customContent}
                        onChange={(e) => setCustomContent(e.target.value)}
                        rows={10}
                        className={`w-full px-4 py-3 rounded-xl ${colors.background.input} ${colors.text.primary} ${colors.border.primary} border focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm`}
                        placeholder="Contenuto del contratto..."
                      />
                    )}
                    <p className={`text-xs ${colors.text.muted} mt-1`}>
                      I placeholder come {'{{NOME_COMPLETO}}'} sono già stati sostituiti con i dati dell&apos;utente.
                    </p>
                  </div>

                  {/* Price and Duration */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${colors.text.primary}`}>
                        Prezzo (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl ${colors.background.input} ${colors.text.primary} ${colors.border.primary} border focus:ring-2 focus:ring-red-500`}
                        placeholder="Es: 1500.00"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${colors.text.primary}`}>
                        Scadenza firma (giorni)
                      </label>
                      <select
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(Number(e.target.value))}
                        className={`w-full px-4 py-3 rounded-xl ${colors.background.input} ${colors.text.primary} ${colors.border.primary} border focus:ring-2 focus:ring-red-500`}
                      >
                        <option value={3}>3 giorni</option>
                        <option value={7}>7 giorni</option>
                        <option value={14}>14 giorni</option>
                        <option value={30}>30 giorni</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${colors.text.primary}`}>
                        Durata (opzionale)
                      </label>
                      <input
                        type="text"
                        value={preview.template.duration || ''}
                        disabled
                        className={`w-full px-4 py-3 rounded-xl ${colors.background.secondary} ${colors.text.primary} ${colors.border.primary} border cursor-not-allowed`}
                        placeholder="Es: 12 mesi"
                      />
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${colors.text.primary}`}>
                      Note Admin (non visibili all&apos;utente)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={2}
                      className={`w-full px-4 py-3 rounded-xl ${colors.background.input} ${colors.text.primary} ${colors.border.primary} border focus:ring-2 focus:ring-red-500`}
                      placeholder="Note interne..."
                    />
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${colors.border.primary} flex gap-3 flex-shrink-0`}>
          {step === 'customize' && (
            <button
              onClick={handleBack}
              className={`px-6 py-3 rounded-xl ${colors.background.secondary} ${colors.text.primary} font-medium`}
            >
              ← Indietro
            </button>
          )}
          <button
            onClick={handleClose}
            className={`flex-1 px-4 py-3 rounded-xl ${colors.background.secondary} ${colors.text.primary} font-medium`}
          >
            Annulla
          </button>
          {step === 'customize' && (
            <button
              onClick={handleAssign}
              disabled={!selectedTemplate || isLoading || previewLoading}
              className={`flex-1 px-4 py-3 rounded-xl ${colors.primary.gradient} text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <Spinner size="xs" variant="white" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Assegna e Invia
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

// Modal gestione materie collaboratore
function ManageSubjectsModal({
  isOpen,
  onClose,
  collaboratorId,
  collaboratorName,
}: {
  isOpen: boolean;
  onClose: () => void;
  collaboratorId: string;
  collaboratorName: string;
}) {
  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [primarySubject, setPrimarySubject] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', color: '#6B7280' });

  // Fetch all subjects
  const { data: allSubjects, isLoading: loadingSubjects } = trpc.users.getSubjects.useQuery();

  // Fetch current assignments
  const { data: currentAssignments, isLoading: loadingAssignments } = trpc.users.getCollaboratorSubjects.useQuery(
    { collaboratorId },
    { enabled: isOpen }
  );

  // Mutations
  const assignMutation = trpc.users.assignSubjects.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      utils.users.getCollaboratorSubjects.invalidate();
      showSuccess('Materie assegnate', 'Le materie sono state assegnate con successo.');
      onClose();
    },
    onError: handleMutationError,
  });

  const createSubjectMutation = trpc.users.createSubject.useMutation({
    onSuccess: (newSub) => {
      utils.users.getSubjects.invalidate();
      setSelectedSubjects([...selectedSubjects, newSub.id]);
      setShowCreateForm(false);
      setNewSubject({ name: '', code: '', color: '#6B7280' });
      showSuccess('Materia creata', `La materia "${newSub.name}" è stata creata.`);
    },
    onError: handleMutationError,
  });

  // Initialize selected subjects from current assignments
  useEffect(() => {
    if (currentAssignments) {
      setSelectedSubjects(currentAssignments.map(a => a.subjectId));
      const primary = currentAssignments.find(a => a.isPrimary);
      setPrimarySubject(primary?.subjectId || null);
    }
  }, [currentAssignments]);

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        // If removing the primary, clear it
        if (primarySubject === subjectId) {
          setPrimarySubject(null);
        }
        return prev.filter(id => id !== subjectId);
      }
      return [...prev, subjectId];
    });
  };

  const handleSave = () => {
    assignMutation.mutate({
      collaboratorId,
      subjectIds: selectedSubjects,
      primarySubjectId: primarySubject || undefined,
    });
  };

  const handleCreateSubject = () => {
    if (!newSubject.name || !newSubject.code) return;
    createSubjectMutation.mutate(newSubject);
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className={`${colors.background.card} rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col`}>
          {/* Header */}
          <div className={`p-6 border-b ${colors.border.primary}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-xl font-bold ${colors.text.primary}`}>Gestione Materie</h3>
                <p className={`${colors.text.secondary} text-sm mt-1`}>{collaboratorName}</p>
              </div>
              <button onClick={onClose} className={`p-2 rounded-lg hover:${colors.background.secondary} text-gray-600 dark:text-gray-400`}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {loadingSubjects || loadingAssignments ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Subject list */}
                <div className="space-y-2">
                  {allSubjects?.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject.id);
                    const isPrimary = primarySubject === subject.id;
                    
                    return (
                      <div
                        key={subject.id}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected 
                            ? `border-green-500 ${colors.background.secondary}` 
                            : `${colors.border.primary} hover:border-gray-400`
                        }`}
                        onClick={() => handleToggleSubject(subject.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: subject.color || '#6B7280' }}
                            >
                              {subject.code?.slice(0, 2)}
                            </div>
                            <div>
                              <p className={`font-medium ${colors.text.primary}`}>{subject.name}</p>
                              <p className={`text-xs ${colors.text.muted}`}>{subject.code}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrimarySubject(isPrimary ? null : subject.id);
                                }}
                                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                                  isPrimary 
                                    ? 'bg-yellow-500 text-white' 
                                    : `${colors.background.secondary} ${colors.text.muted} hover:bg-yellow-100 dark:hover:bg-yellow-900/30`
                                }`}
                              >
                                {isPrimary ? '★ Principale' : 'Imposta principale'}
                              </button>
                            )}
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-green-500 bg-green-500' : colors.border.primary
                            }`}>
                              {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Create new subject */}
                {showCreateForm ? (
                  <div className={`p-4 rounded-xl ${colors.background.secondary} space-y-3`}>
                    <h4 className={`font-medium ${colors.text.primary}`}>Nuova Materia</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nome materia"
                        value={newSubject.name}
                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        className={`px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input}`}
                      />
                      <input
                        type="text"
                        placeholder="Codice (es. BIO)"
                        value={newSubject.code}
                        onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })}
                        maxLength={10}
                        className={`px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input}`}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className={`text-sm ${colors.text.secondary}`}>Colore:</label>
                      <input
                        type="color"
                        value={newSubject.color}
                        onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className={`flex-1 px-4 py-2 rounded-lg ${colors.background.card} ${colors.text.secondary}`}
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleCreateSubject}
                        disabled={!newSubject.name || !newSubject.code || createSubjectMutation.isPending}
                        className={`flex-1 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white disabled:opacity-50`}
                      >
                        {createSubjectMutation.isPending ? <Spinner size="xs" variant="white" /> : 'Crea'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className={`w-full p-3 rounded-xl border-2 border-dashed ${colors.border.primary} ${colors.text.muted} hover:border-gray-400 transition-colors flex items-center justify-center gap-2`}
                  >
                    <Plus className="w-4 h-4" />
                    Crea nuova materia
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${colors.border.primary} flex gap-3`}>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl ${colors.background.secondary} ${colors.text.primary} font-medium`}
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={assignMutation.isPending}
              className={`flex-1 px-4 py-3 rounded-xl ${colors.primary.gradient} text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {assignMutation.isPending ? (
                <Spinner size="xs" variant="white" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Salva ({selectedSubjects.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default function AdminUtentiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const searchParam = searchParams.get('search');
    const roleParam = searchParams.get('role');
    const statusParam = searchParams.get('status');
    
    if (searchParam) {
      setSearch(decodeURIComponent(searchParam));
    }
    
    // Set role filter from URL
    if (roleParam && ['ALL', 'ADMIN', 'COLLABORATOR', 'STUDENT'].includes(roleParam)) {
      setRole(roleParam as RoleFilter);
    }
    
    // Set status filter from URL
    if (statusParam && statusOptions.some(opt => opt.value === statusParam)) {
      setStatus(statusParam as StatusFilter);
    }
    
    // Reset page when filters change from URL
    setPage(1);
  }, [searchParams]);

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'toggleActive' | 'changeRole' | 'revokeContract';
    userId: string;
    userName: string;
    currentActive?: boolean;
    newRole?: 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
    contractId?: string;
    hasSignedContract?: boolean;
    userRole?: string;
  }>({
    isOpen: false,
    type: 'delete',
    userId: '',
    userName: '',
  });

  const [contractModal, setContractModal] = useState<{
    isOpen: boolean;
    targetId: string;
    targetType: 'STUDENT' | 'COLLABORATOR';
  }>({
    isOpen: false,
    targetId: '',
    targetType: 'STUDENT',
  });

  const [viewUserModal, setViewUserModal] = useState<{
    isOpen: boolean;
    user: any | null;
  }>({
    isOpen: false,
    user: null,
  });

  const [simulationsModal, setSimulationsModal] = useState<{
    isOpen: boolean;
    assignments: any[];
    results: any[];
    studentName: string;
  }>({
    isOpen: false,
    assignments: [],
    results: [],
    studentName: '',
  });

  const [materialsModal, setMaterialsModal] = useState<{
    isOpen: boolean;
    materials: any[];
    studentName: string;
  }>({
    isOpen: false,
    materials: [],
    studentName: '',
  });

  const [subjectsModal, setSubjectsModal] = useState<{
    isOpen: boolean;
    collaboratorId: string;
    collaboratorName: string;
  }>({
    isOpen: false,
    collaboratorId: '',
    collaboratorName: '',
  });

  const utils = trpc.useUtils();

  // Get current user to hide self
  const { data: currentUser } = trpc.auth.me.useQuery();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  // Fetch users
  const { data: usersData, isLoading } = trpc.users.getAll.useQuery({
    search: search || undefined,
    role,
    status: status === 'all' ? 'ALL' 
      : status === 'active' ? 'ACTIVE' 
      : status === 'inactive' ? 'INACTIVE' 
      : status === 'pending_profile' ? 'PENDING_PROFILE'
      : status === 'pending_contract' ? 'PENDING_CONTRACT'
      : status === 'pending_sign' ? 'PENDING_SIGN'
      : status === 'pending_activation' ? 'PENDING_ACTIVATION'
      : 'ALL',
    page,
    limit: 15,
  });

  // Fetch stats - filtered by selected role (for breakdown by status)
  const { data: stats } = trpc.users.getStats.useQuery({ role });
  
  // Fetch global stats (always ALL roles) for total count
  const { data: globalStats } = trpc.users.getStats.useQuery({ role: 'ALL' });

  // Fetch contract templates
  const { data: templates } = trpc.contracts.getTemplates.useQuery();

  // Mutations
  const toggleActiveMutation = trpc.users.toggleActive.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      utils.users.getStats.invalidate();
      closeConfirmModal();
      showSuccess('Stato aggiornato', 'Lo stato dell\'utente è stato aggiornato.');
    },
    onError: handleMutationError,
  });

  const changeRoleMutation = trpc.users.changeRole.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      utils.users.getStats.invalidate();
      closeConfirmModal();
      showSuccess('Ruolo aggiornato', 'Il ruolo dell\'utente è stato aggiornato.');
    },
    onError: handleMutationError,
  });

  const deleteUserMutation = trpc.users.deleteUser.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      utils.users.getStats.invalidate();
      closeConfirmModal();
      showSuccess('Utente eliminato', 'L\'utente è stato eliminato con successo.');
    },
    onError: handleMutationError,
  });

  const assignContractMutation = trpc.contracts.assignContract.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      setContractModal({ isOpen: false, targetId: '', targetType: 'STUDENT' });
      showSuccess('Contratto assegnato', 'Il contratto è stato assegnato con successo.');
    },
    onError: handleMutationError,
  });

  const revokeContractMutation = trpc.contracts.revokeContract.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      utils.users.getStats.invalidate();
      closeConfirmModal();
      showSuccess('Contratto revocato', 'Il contratto è stato revocato con successo.');
    },
    onError: handleMutationError,
  });

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const openDeleteModal = (userId: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      userId,
      userName,
    });
  };

  const openToggleActiveModal = (userId: string, userName: string, currentActive: boolean, hasSignedContract: boolean = true, userRole: string = 'STUDENT') => {
    setConfirmModal({
      isOpen: true,
      type: 'toggleActive',
      userId,
      userName,
      currentActive,
      hasSignedContract,
      userRole,
    });
  };

  const openChangeRoleModal = (userId: string, userName: string, newRole: 'ADMIN' | 'COLLABORATOR' | 'STUDENT') => {
    setConfirmModal({
      isOpen: true,
      type: 'changeRole',
      userId,
      userName,
      newRole,
    });
  };

  const openRevokeContractModal = (contractId: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'revokeContract',
      userId: '',
      userName,
      contractId,
    });
  };

  const handleConfirm = () => {
    switch (confirmModal.type) {
      case 'delete':
        deleteUserMutation.mutate({ userId: confirmModal.userId });
        break;
      case 'toggleActive':
        toggleActiveMutation.mutate({ userId: confirmModal.userId });
        break;
      case 'changeRole':
        if (confirmModal.newRole) {
          changeRoleMutation.mutate({ userId: confirmModal.userId, newRole: confirmModal.newRole });
        }
        break;
      case 'revokeContract':
        if (confirmModal.contractId) {
          revokeContractMutation.mutate({ contractId: confirmModal.contractId });
        }
        break;
    }
  };

  const handleAssignContract = (data: { 
    templateId: string; 
    customContent?: string; 
    customPrice?: number; 
    adminNotes?: string; 
    expiresInDays: number 
  }) => {
    if (contractModal.targetId) {
      if (contractModal.targetType === 'COLLABORATOR') {
        assignContractMutation.mutate({
          collaboratorId: contractModal.targetId,
          templateId: data.templateId,
          expiresInDays: data.expiresInDays,
          customContent: data.customContent,
          customPrice: data.customPrice,
          adminNotes: data.adminNotes,
        });
      } else {
        assignContractMutation.mutate({
          studentId: contractModal.targetId,
          templateId: data.templateId,
          expiresInDays: data.expiresInDays,
          customContent: data.customContent,
          customPrice: data.customPrice,
          adminNotes: data.adminNotes,
        });
      }
    }
  };

  const getModalConfig = () => {
    switch (confirmModal.type) {
      case 'delete':
        return {
          title: 'Elimina Account',
          message: `Sei sicuro di voler eliminare definitivamente l'account di "${confirmModal.userName}"? Questa azione è irreversibile.`,
          confirmLabel: 'Elimina',
          variant: 'danger' as const,
          isLoading: deleteUserMutation.isPending,
        };
      case 'toggleActive':
        // Check if activating user without signed contract (non-admin)
        const isActivatingWithoutContract = !confirmModal.currentActive && !confirmModal.hasSignedContract && confirmModal.userRole !== 'ADMIN';
        return {
          title: confirmModal.currentActive ? 'Disattiva Account' : 'Attiva Account',
          message: confirmModal.currentActive
            ? `Sei sicuro di voler disattivare l'account di "${confirmModal.userName}"?`
            : `Sei sicuro di voler attivare l'account di "${confirmModal.userName}"?`,
          warning: isActivatingWithoutContract 
            ? `⚠️ Attenzione: ${confirmModal.userName} non ha ancora firmato il contratto. Attivando l'account, l'utente potrà accedere alla piattaforma senza aver firmato il contratto.`
            : undefined,
          confirmLabel: confirmModal.currentActive ? 'Disattiva' : (isActivatingWithoutContract ? 'Attiva comunque' : 'Attiva'),
          variant: confirmModal.currentActive ? 'warning' as const : (isActivatingWithoutContract ? 'warning' as const : 'info' as const),
          isLoading: toggleActiveMutation.isPending,
        };
      case 'changeRole':
        const roleLabels = { ADMIN: 'Amministratore', COLLABORATOR: 'Collaboratore', STUDENT: 'Studente' };
        return {
          title: 'Cambia Ruolo',
          message: `Sei sicuro di voler cambiare il ruolo di "${confirmModal.userName}" a ${roleLabels[confirmModal.newRole!]}?`,
          confirmLabel: 'Cambia Ruolo',
          variant: 'info' as const,
          isLoading: changeRoleMutation.isPending,
        };
      case 'revokeContract':
        return {
          title: 'Revoca Contratto',
          message: `Sei sicuro di voler revocare il contratto per "${confirmModal.userName}"? L'utente dovrà firmare un nuovo contratto.`,
          confirmLabel: 'Revoca Contratto',
          variant: 'warning' as const,
          isLoading: revokeContractMutation.isPending,
        };
      default:
        return { title: '', message: '', confirmLabel: '', variant: 'info' as const, isLoading: false };
    }
  };

  const getRoleBadge = (userRole: string) => {
    switch (userRole) {
      case 'ADMIN':
        return { label: 'Admin', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: Shield };
      case 'COLLABORATOR':
        return { label: 'Collaboratore', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: UserCog };
      default:
        return { label: 'Studente', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: GraduationCap };
    }
  };

  const getStatusBadge = (user: any) => {
    // Return hex colors for inline styles (both light and dark mode compatible)
    if (user.isActive) {
      return { label: 'Attivo', color: '#15803d', bg: '#dcfce7' }; // green-700, green-100
    }
    if (!user.profileCompleted) {
      return { label: 'Profilo incompleto', color: '#a16207', bg: '#fef9c3' }; // yellow-700, yellow-100
    }
    // Check contract status for students/collaborators
    const hasContract = user.student?.contracts?.length > 0 || user.collaborator?.contracts?.length > 0;
    const contract = user.student?.contracts?.[0] || user.collaborator?.contracts?.[0];
    
    if (!hasContract && user.role !== 'ADMIN') {
      return { label: 'Attesa contratto', color: '#1d4ed8', bg: '#dbeafe' }; // blue-700, blue-100
    }
    if (contract?.status === 'PENDING') {
      return { label: 'Attesa firma', color: '#1d4ed8', bg: '#dbeafe' }; // blue-700, blue-100
    }
    if (contract?.status === 'SIGNED') {
      return { label: 'Attesa attivazione', color: '#a16207', bg: '#fef9c3' }; // yellow-700, yellow-100
    }
    return { label: 'Disattivato', color: '#b91c1c', bg: '#fee2e2' }; // red-700, red-100
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  // Show all users including current user
  const filteredUsers = usersData?.users || [];

  const modalConfig = getModalConfig();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold flex items-center gap-3 ${colors.text.primary}`}>
          <Users className="w-8 h-8" />
          Gestione Utenti
        </h1>
        <p className={`mt-1 ${colors.text.secondary}`}>
          Visualizza tutti gli utenti, assegna ruoli, gestisci contratti e account
        </p>
      </div>

      {/* Stats + Role Filters Combined */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Tutti */}
        <button
          onClick={() => { setRole('ALL'); setPage(1); }}
          className={`${colors.background.card} rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${
            role === 'ALL' ? 'ring-2 ring-gray-500 ring-offset-2 ring-offset-gray-900' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-700 dark:text-gray-400" />
            </div>
            <div className="text-left">
              <p className={`text-xs ${colors.text.muted}`}>Totale</p>
              <p className={`text-xl font-bold ${colors.text.primary}`}>{globalStats?.total || 0}</p>
            </div>
          </div>
        </button>

        {/* Admin */}
        <button
          onClick={() => { setRole('ADMIN'); setPage(1); }}
          className={`${colors.background.card} rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${
            role === 'ADMIN' ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-left">
              <p className={`text-xs ${colors.text.muted}`}>Admin</p>
              <p className="text-xl font-bold text-red-600">{stats?.admins || 0}</p>
            </div>
          </div>
        </button>

        {/* Collaboratori */}
        <button
          onClick={() => { setRole('COLLABORATOR'); setPage(1); }}
          className={`${colors.background.card} rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${
            role === 'COLLABORATOR' ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-left">
              <p className={`text-xs ${colors.text.muted}`}>Collaboratori</p>
              <p className="text-xl font-bold text-purple-600">{stats?.collaborators || 0}</p>
            </div>
          </div>
        </button>

        {/* Studenti */}
        <button
          onClick={() => { setRole('STUDENT'); setPage(1); }}
          className={`${colors.background.card} rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${
            role === 'STUDENT' ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className={`text-xs ${colors.text.muted}`}>Studenti</p>
              <p className="text-xl font-bold text-blue-600">{stats?.students || 0}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Search + Status Filters */}
      <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
            />
          </div>

          {/* Status Filter Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              const getCount = () => {
                switch (option.value) {
                  case 'all': return role === 'ALL' ? (globalStats?.total || 0) : (stats?.total || 0);
                  case 'pending_profile': return stats?.pendingProfile || 0;
                  case 'pending_contract': return stats?.pendingContract || 0;
                  case 'pending_sign': return stats?.pendingSign || 0;
                  case 'pending_activation': return stats?.pendingActivation || 0;
                  case 'active': return stats?.active || 0;
                  case 'inactive': return stats?.inactive || 0;
                  case 'no_signed_contract': return stats?.noSignedContract || 0;
                  default: return 0;
                }
              };
              const count = getCount();
              const isSelected = status === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setStatus(option.value);
                    setPage(1);
                  }}
                  title={option.label}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? `${option.activeColor} text-white shadow-md ring-2 ring-offset-2 ring-offset-gray-900 ring-white/30`
                      : `${option.bg} ${option.color} hover:opacity-80`
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{option.shortLabel}</span>
                  <span className={`min-w-[20px] h-5 px-1 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className={`${colors.background.card} rounded-xl shadow-sm overflow-visible`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
            <p className={`mt-4 ${colors.text.secondary}`}>Caricamento utenti...</p>
          </div>
        ) : !filteredUsers.length ? (
          <div className="p-12 text-center">
            <Users className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
            <p className={colors.text.secondary}>Nessun utente trovato</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user: any) => {
                const roleBadge = getRoleBadge(user.role);
                const statusBadge = getStatusBadge(user);
                const RoleIcon = roleBadge.icon;
                
                // Check if this is the current user (self)
                const isSelf = user.id === currentUser?.id;
                
                const isStudentOrCollab = user.role === 'STUDENT' || user.role === 'COLLABORATOR';
                const hasProfileCompleted = user.profileCompleted;
                const targetId = user.student?.id || user.collaborator?.id;
                const targetType = user.role === 'COLLABORATOR' ? 'COLLABORATOR' as const : 'STUDENT' as const;
                const studentContract = user.student?.contracts?.[0];
                const collabContract = user.collaborator?.contracts?.[0];
                const lastContract = studentContract || collabContract;
                const hasActiveContract = lastContract && (lastContract.status === 'PENDING' || lastContract.status === 'SIGNED');
                const hasPendingContract = lastContract?.status === 'PENDING';
                const canAssignContract = isStudentOrCollab && hasProfileCompleted && !hasActiveContract && targetId && !isSelf;
                const hasSignedContract = lastContract?.status === 'SIGNED';
                const contractId = lastContract?.id;

                return (
                  <div key={user.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-12 h-12 rounded-full ${roleBadge.bg} flex items-center justify-center text-lg font-semibold ${roleBadge.color} flex-shrink-0`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium ${colors.text.primary} truncate`}>{user.name}</p>
                          <p className={`text-sm ${colors.text.muted} truncate`}>{user.email}</p>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
                        style={{ backgroundColor: statusBadge.bg, color: statusBadge.color }}
                      >
                        {statusBadge.label}
                      </span>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge.bg} ${roleBadge.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleBadge.label}
                      </span>
                      <span className={`text-xs ${colors.text.muted}`}>
                        Reg. {formatDate(user.createdAt)}
                      </span>
                      {/* Show collaborator subjects in mobile */}
                      {user.role === 'COLLABORATOR' && user.collaborator?.subjects && user.collaborator.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {user.collaborator.subjects.slice(0, 3).map((cs: any) => (
                            <span 
                              key={cs.id} 
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${cs.isPrimary ? 'ring-1 ring-purple-500' : ''}`}
                              style={{ 
                                backgroundColor: cs.subject.color + '20', 
                                color: cs.subject.color 
                              }}
                              title={cs.isPrimary ? `${cs.subject.name} (Principale)` : cs.subject.name}
                            >
                              {cs.subject.code}
                            </span>
                          ))}
                          {user.collaborator.subjects.length > 3 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.background.secondary} ${colors.text.muted}`}>
                              +{user.collaborator.subjects.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {/* View profile - always available */}
                      {isStudentOrCollab && (
                        <button
                          onClick={() => setViewUserModal({ isOpen: true, user })}
                          className={`p-2 rounded-lg ${colors.background.secondary} hover:opacity-80 transition-opacity`}
                          title="Visualizza profilo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {hasSignedContract && contractId && (
                        <button
                          onClick={() => window.open(`/api/contracts/${contractId}/view`, '_blank')}
                          className={`p-2 rounded-lg ${colors.status.success.softBg} ${colors.status.success.text}`}
                          title="Visualizza contratto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {hasPendingContract && contractId && (
                        <>
                          <button
                            onClick={() => window.open(`/api/contracts/${contractId}/view`, '_blank')}
                            className={`p-2 rounded-lg ${colors.status.info.softBg} ${colors.status.info.text}`}
                            title="Visualizza contratto in attesa"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => openRevokeContractModal(contractId, user.name)}
                              className={`p-2 rounded-lg ${colors.status.warning.softBg} ${colors.status.warning.text}`}
                              title="Revoca contratto"
                            >
                              <FileX className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                      {canAssignContract && (
                        <button
                          onClick={() => setContractModal({ isOpen: true, targetId: targetId!, targetType })}
                          className={`p-2 rounded-lg ${colors.status.info.softBg} ${colors.status.info.text}`}
                          title="Assegna contratto"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {/* Manage subjects for collaborators */}
                      {user.role === 'COLLABORATOR' && user.isActive && user.collaborator?.id && (
                        <button
                          onClick={() => setSubjectsModal({
                            isOpen: true,
                            collaboratorId: user.collaborator.id,
                            collaboratorName: user.name,
                          })}
                          className={`p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400`}
                          title="Gestisci materie"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                      )}
                      {/* Contact user - available for all active users except self and admins */}
                      {!isSelf && user.isActive && user.role !== 'ADMIN' && (
                        <button
                          onClick={() => router.push(`/messaggi?nuovo=${user.id}`)}
                          className={`p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}
                          title="Contatta utente"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      {user.profileCompleted && !isSelf && (
                        <button
                          onClick={() => openToggleActiveModal(user.id, user.name, user.isActive, lastContract?.status === 'SIGNED', user.role)}
                          className={`p-2 rounded-lg ${user.isActive ? colors.status.warning.softBg : colors.status.success.softBg} ${user.isActive ? colors.status.warning.text : colors.status.success.text}`}
                          title={user.isActive ? 'Disattiva' : 'Attiva'}
                        >
                          {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          onClick={() => openDeleteModal(user.id, user.name)}
                          className={`p-2 rounded-lg ${colors.status.error.softBg} ${colors.status.error.text}`}
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Role change dropdown for mobile - disabled for self */}
                      {!isSelf && (
                        <div className="ml-auto">
                          <RoleDropdown
                            currentRole={user.role}
                            onSelect={(newRole) => {
                              if (newRole !== user.role) {
                                openChangeRoleModal(user.id, user.name, newRole);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block pb-16 overflow-x-auto overflow-y-visible">
              <table className="w-full min-w-[900px]">
                <thead className={`${colors.background.secondary} border-b ${colors.border.primary}`}>
                  <tr>
                    <th className={`text-left px-4 py-4 font-semibold text-sm ${colors.text.primary}`}>Utente</th>
                    <th className={`text-left px-4 py-4 font-semibold text-sm ${colors.text.primary}`}>Gruppi</th>
                    <th className={`text-left px-4 py-4 font-semibold text-sm ${colors.text.primary}`} style={{ overflow: 'visible' }}>Ruolo</th>
                    <th className={`text-left px-4 py-4 font-semibold text-sm whitespace-nowrap ${colors.text.primary}`}>Registrazione</th>
                    <th className={`text-left px-4 py-4 font-semibold text-sm ${colors.text.primary}`}>Stato</th>
                    <th className={`text-right px-4 py-4 font-semibold text-sm ${colors.text.primary}`}>Azioni</th>
                  </tr>
                </thead>
                <tbody className="overflow-visible">
                  {filteredUsers.map((user: any) => {
                    const roleBadge = getRoleBadge(user.role);
                    const statusBadge = getStatusBadge(user);
                    const RoleIcon = roleBadge.icon;
                    
                    // Check if this is the current user (self)
                    const isSelf = user.id === currentUser?.id;
                    
                    const isStudentOrCollab = user.role === 'STUDENT' || user.role === 'COLLABORATOR';
                    const hasProfileCompleted = user.profileCompleted;
                    const targetId = user.student?.id || user.collaborator?.id;
                    const targetType = user.role === 'COLLABORATOR' ? 'COLLABORATOR' as const : 'STUDENT' as const;
                    const studentContract = user.student?.contracts?.[0];
                    const collabContract = user.collaborator?.contracts?.[0];
                    const lastContract = studentContract || collabContract;
                    const hasActiveContract = lastContract && (lastContract.status === 'PENDING' || lastContract.status === 'SIGNED');
                    const hasPendingContract = lastContract?.status === 'PENDING';
                    const canAssignContract = isStudentOrCollab && hasProfileCompleted && !hasActiveContract && targetId && !isSelf;
                    const hasSignedContract = lastContract?.status === 'SIGNED';
                    const contractId = lastContract?.id;

                    return (
                      <tr key={user.id} className={`border-b ${colors.border.primary} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${roleBadge.bg} flex items-center justify-center text-lg font-semibold ${roleBadge.color} flex-shrink-0`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium ${colors.text.primary} truncate max-w-[140px]`}>{user.name}</p>
                              {/* Show matricola for students, fiscal code for collaborators */}
                              {user.role === 'STUDENT' && user.student?.matricola && (
                                <p className={`text-xs ${colors.text.muted} truncate max-w-[140px]`}>
                                  {user.student.matricola}
                                </p>
                              )}
                              {user.role === 'COLLABORATOR' && user.collaborator?.fiscalCode && (
                                <p className={`text-xs ${colors.text.muted} truncate max-w-[140px]`}>
                                  {user.collaborator.fiscalCode}
                                </p>
                              )}
                              {/* Show collaborator subjects */}
                              {user.role === 'COLLABORATOR' && user.collaborator?.subjects && user.collaborator.subjects.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {user.collaborator.subjects.slice(0, 3).map((cs: any) => (
                                    <span 
                                      key={cs.id} 
                                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${cs.isPrimary ? 'ring-1 ring-purple-500' : ''}`}
                                      style={{ 
                                        backgroundColor: cs.subject.color + '20', 
                                        color: cs.subject.color 
                                      }}
                                      title={cs.isPrimary ? `${cs.subject.name} (Principale)` : cs.subject.name}
                                    >
                                      {cs.subject.code}
                                    </span>
                                  ))}
                                  {user.collaborator.subjects.length > 3 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.background.secondary} ${colors.text.muted}`}>
                                      +{user.collaborator.subjects.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {/* For students/collaborators: show groups; for admins: show email */}
                          {user.role === 'ADMIN' ? (
                            <div className={`flex items-center gap-2 text-sm ${colors.text.secondary}`}>
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate max-w-[160px]">{user.email}</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {(() => {
                                const groups = user.role === 'STUDENT' 
                                  ? user.student?.groupMemberships?.map((g: any) => g.group) || []
                                  : user.collaborator?.groupMemberships?.map((g: any) => g.group) || [];
                                
                                if (groups.length === 0) {
                                  return (
                                    <span className={`text-xs ${colors.text.muted} italic`}>
                                      Nessun gruppo
                                    </span>
                                  );
                                }
                                
                                const sortedGroups = [...groups].sort((a: any, b: any) => a.name.localeCompare(b.name));
                                const displayGroups = sortedGroups.slice(0, 3);
                                const remaining = sortedGroups.length - 3;
                                
                                return (
                                  <>
                                    {displayGroups.map((group: any) => (
                                      <span
                                        key={group.id}
                                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                        style={{
                                          backgroundColor: (group.color || '#6b7280') + '20',
                                          color: group.color || '#6b7280',
                                        }}
                                        title={group.name}
                                      >
                                        {group.name.length > 12 ? group.name.substring(0, 10) + '...' : group.name}
                                      </span>
                                    ))}
                                    {remaining > 0 && (
                                      <span 
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.background.secondary} ${colors.text.muted}`}
                                        title={sortedGroups.slice(3).map((g: any) => g.name).join(', ')}
                                      >
                                        +{remaining}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 overflow-visible">
                          {/* Role dropdown - disabled for self */}
                          {isSelf ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge.bg} ${roleBadge.color}`}>
                              <RoleIcon className="w-3 h-3" />
                              {roleBadge.label}
                            </span>
                          ) : (
                            <RoleDropdown
                              currentRole={user.role}
                              onSelect={(newRole) => {
                                if (newRole !== user.role) {
                                  openChangeRoleModal(user.id, user.name, newRole);
                                }
                              }}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-2 text-sm whitespace-nowrap ${colors.text.secondary}`}>
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>{formatDate(user.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                            style={{ backgroundColor: statusBadge.bg, color: statusBadge.color }}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View User Profile - Always show for students/collaborators */}
                            {isStudentOrCollab && (
                              <button
                                onClick={() => setViewUserModal({ isOpen: true, user })}
                                className={`p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:opacity-80 transition-opacity`}
                                title="Visualizza profilo"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                              </button>
                            )}
                            {hasSignedContract && contractId && (
                              <button
                                onClick={() => window.open(`/api/contracts/${contractId}/view`, '_blank')}
                                className={`p-1.5 rounded-lg ${colors.status.success.softBg} ${colors.status.success.text} hover:opacity-80 transition-opacity`}
                                title="Visualizza contratto firmato"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasPendingContract && contractId && (
                              <>
                                <button
                                  onClick={() => window.open(`/api/contracts/${contractId}/view`, '_blank')}
                                  className={`p-1.5 rounded-lg ${colors.status.info.softBg} ${colors.status.info.text} hover:opacity-80 transition-opacity`}
                                  title="Visualizza contratto in attesa"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openRevokeContractModal(contractId, user.name)}
                                  className={`p-1.5 rounded-lg ${colors.status.warning.softBg} ${colors.status.warning.text} hover:opacity-80 transition-opacity`}
                                  title="Revoca contratto"
                                >
                                  <FileX className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {canAssignContract && (
                              <button
                                onClick={() => setContractModal({ isOpen: true, targetId: targetId!, targetType })}
                                className={`p-1.5 rounded-lg ${colors.status.info.softBg} ${colors.status.info.text} hover:opacity-80 transition-opacity`}
                                title="Assegna contratto"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* Manage subjects for collaborators */}
                            {user.role === 'COLLABORATOR' && user.isActive && user.collaborator?.id && (
                              <button
                                onClick={() => setSubjectsModal({
                                  isOpen: true,
                                  collaboratorId: user.collaborator.id,
                                  collaboratorName: user.name,
                                })}
                                className={`p-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:opacity-80 transition-opacity`}
                                title="Gestisci materie"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* Contact user - available for all active users except admins */}
                            {user.isActive && user.role !== 'ADMIN' && (
                              <button
                                onClick={() => router.push(`/messaggi?nuovo=${user.id}`)}
                                className={`p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:opacity-80 transition-opacity`}
                                title="Contatta utente"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {user.profileCompleted && (
                              <button
                                onClick={() => openToggleActiveModal(user.id, user.name, user.isActive, lastContract?.status === 'SIGNED', user.role)}
                                className={`p-1.5 rounded-lg transition-opacity hover:opacity-80 ${
                                  user.isActive
                                    ? `${colors.status.warning.softBg} ${colors.status.warning.text}`
                                    : `${colors.status.success.softBg} ${colors.status.success.text}`
                                }`}
                                title={user.isActive ? 'Disattiva' : 'Attiva'}
                              >
                                {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button
                              onClick={() => openDeleteModal(user.id, user.name)}
                              className={`p-1.5 rounded-lg ${colors.status.error.softBg} ${colors.status.error.text} hover:opacity-80 transition-opacity`}
                              title="Elimina account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersData && usersData.pagination.totalPages > 1 && (
              <div className={`px-6 py-4 border-t ${colors.border.primary} flex items-center justify-between`}>
                <p className={`text-sm ${colors.text.secondary}`}>
                  Pagina {usersData.pagination.page} di {usersData.pagination.totalPages}
                  {' '}({usersData.pagination.total} utenti)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`p-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(usersData.pagination.totalPages, p + 1))}
                    disabled={page === usersData.pagination.totalPages}
                    className={`p-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleConfirm}
        {...modalConfig}
      />

      {/* Assign Contract Modal */}
      <AssignContractModal
        isOpen={contractModal.isOpen}
        onClose={() => setContractModal({ isOpen: false, targetId: '', targetType: 'STUDENT' })}
        onAssign={handleAssignContract}
        templates={templates || []}
        isLoading={assignContractMutation.isPending}
        targetId={contractModal.targetId}
        targetType={contractModal.targetType}
      />

      {/* View User Profile Modal */}
      {viewUserModal.isOpen && viewUserModal.user && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className={`${colors.background.card} rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between p-6 border-b ${colors.border.primary}`}>
              <h2 className={`text-xl font-bold ${colors.text.primary}`}>Profilo Utente</h2>
              <button
                onClick={() => setViewUserModal({ isOpen: false, user: null })}
                className={`p-2 rounded-lg ${colors.background.secondary} hover:opacity-80 text-gray-600 dark:text-gray-400`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full ${colors.primary.softBg} flex items-center justify-center text-2xl font-bold ${colors.primary.text}`}>
                  {viewUserModal.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${colors.text.primary}`}>{viewUserModal.user.name}</h3>
                  <p className={`text-sm ${colors.text.secondary}`}>{viewUserModal.user.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                    viewUserModal.user.role === 'STUDENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    viewUserModal.user.role === 'COLLABORATOR' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                  }`}>
                    {viewUserModal.user.role === 'STUDENT' ? 'Studente' : 
                     viewUserModal.user.role === 'COLLABORATOR' ? 'Collaboratore' : 'Admin'}
                  </span>
                </div>
              </div>

              {/* Profile Status */}
              <div className={`p-4 rounded-xl ${viewUserModal.user.profileCompleted ? colors.status.success.softBg : colors.status.warning.softBg}`}>
                <div className="flex items-center gap-2">
                  {viewUserModal.user.profileCompleted ? (
                    <>
                      <CheckCircle className={`w-5 h-5 ${colors.status.success.text}`} />
                      <span className={`font-medium ${colors.status.success.text}`}>Profilo Completo</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className={`w-5 h-5 ${colors.status.warning.text}`} />
                      <span className={`font-medium ${colors.status.warning.text}`}>Profilo Incompleto</span>
                    </>
                  )}
                </div>
                {!viewUserModal.user.profileCompleted && (
                  <p className={`text-sm mt-1 ${colors.status.warning.text} opacity-80`}>
                    L&apos;utente deve completare il profilo prima di poter ricevere un contratto.
                  </p>
                )}
              </div>

              {/* Profile Data */}
              {(() => {
                const profile = viewUserModal.user.student || viewUserModal.user.collaborator;
                const isStudent = viewUserModal.user.role === 'STUDENT';
                if (!profile) {
                  return (
                    <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                      <p className={`text-sm ${colors.text.muted}`}>Nessun profilo associato</p>
                    </div>
                  );
                }

                const fields = [
                  // Show matricola for students as first field
                  ...(isStudent ? [{ label: 'Matricola', value: (profile as any).matricola }] : []),
                  { label: 'Codice Fiscale', value: profile.fiscalCode },
                  { label: 'Data di Nascita', value: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('it-IT') : null },
                  { label: 'Telefono', value: profile.phone },
                  { label: 'Indirizzo', value: profile.address },
                  { label: 'Città', value: profile.city },
                  { label: 'Provincia', value: profile.province },
                  { label: 'CAP', value: profile.postalCode },
                ];

                return (
                  <div className="space-y-3">
                    <h4 className={`font-semibold ${colors.text.primary}`}>Dati Profilo</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {fields.map((field) => (
                        <div key={field.label} className={`p-3 rounded-lg ${colors.background.secondary}`}>
                          <p className={`text-xs ${colors.text.muted} mb-1`}>{field.label}</p>
                          <p className={`text-sm font-medium ${field.value ? colors.text.primary : colors.status.error.text}`}>
                            {field.value || 'Mancante'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Account Status */}
              <div className="space-y-3">
                <h4 className={`font-semibold ${colors.text.primary}`}>Stato Account</h4>
                <div className="flex gap-3">
                  <div className={`flex-1 p-3 rounded-lg ${colors.background.secondary}`}>
                    <p className={`text-xs ${colors.text.muted} mb-1`}>Account</p>
                    <p className={`text-sm font-medium ${viewUserModal.user.isActive ? colors.status.success.text : colors.status.error.text}`}>
                      {viewUserModal.user.isActive ? 'Attivo' : 'Non Attivo'}
                    </p>
                  </div>
                  <div className={`flex-1 p-3 rounded-lg ${colors.background.secondary}`}>
                    <p className={`text-xs ${colors.text.muted} mb-1`}>Registrato il</p>
                    <p className={`text-sm font-medium ${colors.text.primary}`}>
                      {new Date(viewUserModal.user.createdAt).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Groups & Classes Info */}
              {(() => {
                const user = viewUserModal.user;
                
                // For students: show groups and class they belong to
                if (user.role === 'STUDENT' && user.student) {
                  const groups = user.student.groupMemberships?.map((g: { group: { id: string; name: string; color: string | null } }) => g.group) || [];
                  const studentClass = user.student.class;
                  
                  if (groups.length === 0 && !studentClass) {
                    return (
                      <div className="space-y-3">
                        <h4 className={`font-semibold ${colors.text.primary}`}>Gruppi e Classe</h4>
                        <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                          <p className={`text-sm ${colors.text.muted}`}>Non assegnato a nessun gruppo o classe</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      <h4 className={`font-semibold ${colors.text.primary}`}>Gruppi e Classe</h4>
                      <div className="flex flex-wrap gap-2">
                        {studentClass && (
                          <span
                            className="px-3 py-1.5 rounded-full text-sm font-medium bg-purple-600 text-white"
                          >
                            📚 {studentClass.name}
                          </span>
                        )}
                        {groups.map((group: { id: string; name: string; color: string | null }) => (
                          <span
                            key={group.id}
                            className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: group.color || '#6366f1' }}
                          >
                            {group.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                // For collaborators: show groups membership and referent groups
                if (user.role === 'COLLABORATOR' && user.collaborator) {
                  const memberOfGroups = user.collaborator.groupMemberships?.map((g: { group: { id: string; name: string; color: string | null } }) => g.group) || [];
                  const referenceGroups = user.collaborator.referenceGroups || [];
                  
                  const hasAnyAssignment = memberOfGroups.length > 0 || referenceGroups.length > 0;
                  
                  if (!hasAnyAssignment) {
                    return (
                      <div className="space-y-3">
                        <h4 className={`font-semibold ${colors.text.primary}`}>Gruppi</h4>
                        <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                          <p className={`text-sm ${colors.text.muted}`}>Non assegnato a nessun gruppo</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      <h4 className={`font-semibold ${colors.text.primary}`}>Gruppi</h4>
                      <div className="space-y-2">
                        {referenceGroups.length > 0 && (
                          <div>
                            <p className={`text-xs ${colors.text.muted} mb-1`}>Referente di:</p>
                            <div className="flex flex-wrap gap-2">
                              {referenceGroups.map((group: { id: string; name: string; color: string | null }) => (
                                <span
                                  key={group.id}
                                  className="px-3 py-1.5 rounded-full text-sm font-medium text-white flex items-center gap-1"
                                  style={{ backgroundColor: group.color || '#6366f1' }}
                                >
                                  ⭐ {group.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {memberOfGroups.length > 0 && (
                          <div>
                            <p className={`text-xs ${colors.text.muted} mb-1`}>Membro di:</p>
                            <div className="flex flex-wrap gap-2">
                              {memberOfGroups.map((group: { id: string; name: string; color: string | null }) => (
                                <span
                                  key={group.id}
                                  className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                                  style={{ backgroundColor: group.color || '#6366f1' }}
                                >
                                  {group.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                
                return null;
              })()}

              {/* Simulazioni e Materiali Assegnati (solo studenti) - Badge Cliccabili */}
              {viewUserModal.user.role === 'STUDENT' && viewUserModal.user.student && (
                <div>
                  <h4 className={`font-semibold ${colors.text.primary} mb-4`}>Contenuti Assegnati</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Badge Simulazioni */}
                    <button
                      onClick={() => {
                        const assignments = viewUserModal.user.student.simulationAssignments || [];
                        const results = viewUserModal.user.student.simulationResults || [];
                        console.log('📚 Simulazioni:', { assignments, results }); // Debug
                        setSimulationsModal({
                          isOpen: true,
                          assignments,
                          results,
                          studentName: viewUserModal.user.name,
                        });
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${colors.primary.softBg} hover:scale-105 transition-transform shadow-sm`}
                    >
                      <div className={`p-2 rounded-lg ${colors.primary.bg}`}>
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs ${colors.text.muted} mb-0.5`}>Simulazioni</p>
                        <p className={`text-2xl font-bold ${colors.primary.text}`}>
                          {viewUserModal.user.student.simulationAssignments?.length || 0}
                        </p>
                      </div>
                    </button>

                    {/* Badge Materiali */}
                    <button
                      onClick={() => {
                        const materials = viewUserModal.user.student.materialAccess || [];
                        setMaterialsModal({
                          isOpen: true,
                          materials,
                          studentName: viewUserModal.user.name,
                        });
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 hover:scale-105 transition-transform shadow-sm"
                    >
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800/50">
                        <FolderOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs ${colors.text.muted} mb-0.5`}>Materiali</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {viewUserModal.user.student.materialAccess?.length || 0}
                        </p>
                      </div>
                    </button>

                    {/* Badge Simulazioni Completate */}
                    {viewUserModal.user.student.simulationResults && viewUserModal.user.student.simulationResults.length > 0 && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 shadow-sm">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/50">
                          <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className={`text-xs ${colors.text.muted} mb-0.5`}>Completate</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {viewUserModal.user.student.simulationResults.length}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Contract Info */}
              {(() => {
                const contract = viewUserModal.user.student?.contracts?.[0] || viewUserModal.user.collaborator?.contracts?.[0];
                if (!contract) {
                  return (
                    <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                      <p className={`text-sm ${colors.text.muted}`}>Nessun contratto assegnato</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <h4 className={`font-semibold ${colors.text.primary}`}>Ultimo Contratto</h4>
                    <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium ${colors.text.primary}`}>{contract.template?.name || 'Contratto'}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          contract.status === 'SIGNED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          contract.status === 'PENDING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {contract.status === 'SIGNED' ? 'Firmato' : 
                           contract.status === 'PENDING' ? 'In Attesa' : contract.status}
                        </span>
                      </div>
                      {contract.signedAt && (
                        <p className={`text-sm ${colors.text.secondary}`}>
                          Firmato il {new Date(contract.signedAt).toLocaleDateString('it-IT')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className={`p-6 border-t ${colors.border.primary} flex gap-3`}>
              {viewUserModal.user.role === 'STUDENT' && viewUserModal.user.student && (
                <button
                  onClick={() => {
                    router.push(`/studenti/${viewUserModal.user.student!.id}/simulazioni`);
                    setViewUserModal({ isOpen: false, user: null });
                  }}
                  className={`flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
                >
                  <Target className="w-4 h-4" />
                  Vedi Simulazioni
                </button>
              )}
              <button
                onClick={() => setViewUserModal({ isOpen: false, user: null })}
                className={`flex-1 py-3 rounded-lg ${colors.background.secondary} ${colors.text.primary} font-medium hover:opacity-80 transition-opacity`}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Simulazioni Modal */}
      {simulationsModal.isOpen && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setSimulationsModal({ isOpen: false, assignments: [], results: [], studentName: '' })}>
            <div className={`${colors.background.card} rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-6 border-b ${colors.border.primary}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-2xl font-bold ${colors.text.primary}`}>Simulazioni Assegnate</h2>
                    <p className={`text-sm ${colors.text.muted} mt-1`}>{simulationsModal.studentName}</p>
                  </div>
                  <button
                    onClick={() => setSimulationsModal({ isOpen: false, assignments: [], results: [], studentName: '' })}
                    className={`p-2 rounded-lg ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                {simulationsModal.assignments.length > 0 ? (
                  <div className="space-y-3">
                    {simulationsModal.assignments.map((assignment: any) => {
                      // Find the corresponding result for this simulation
                      const result = simulationsModal.results?.find(
                        (r: any) => r.simulationId === assignment.simulation?.id
                      );
                      
                      return (
                        <div key={assignment.id} className={`p-4 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className={`w-5 h-5 ${colors.primary.text}`} />
                                <h3 className={`font-semibold ${colors.text.primary}`}>{assignment.simulation?.title || 'Simulazione'}</h3>
                              </div>
                              <div className="space-y-1">
                                <p className={`text-sm ${colors.text.muted}`}>
                                  <span className="font-medium">Assegnata:</span> {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </p>
                                {assignment.dueDate && (
                                  <p className={`text-sm ${colors.text.muted}`}>
                                    <span className="font-medium">Scadenza:</span> {new Date(assignment.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </p>
                                )}
                                {assignment.startDate && (
                                  <p className={`text-sm ${colors.text.muted}`}>
                                    <span className="font-medium">Inizio:</span> {new Date(assignment.startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {result ? (
                                <>
                                  <div className={`px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
                                    Completata
                                  </div>
                                  <div className={`text-2xl font-bold ${result.percentageScore && result.percentageScore >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {result.percentageScore?.toFixed(0)}%
                                  </div>
                                  <p className={`text-xs ${colors.text.muted}`}>
                                    {result.completedAt ? new Date(result.completedAt).toLocaleDateString('it-IT') : ''}
                                  </p>
                                </>
                              ) : (
                                <div className={`px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`}>
                                  Non completata
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-center py-12`}>
                    <BookOpen className={`w-12 h-12 mx-auto mb-3 ${colors.text.muted}`} />
                    <p className={`text-lg font-medium ${colors.text.primary}`}>Nessuna simulazione assegnata</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Materiali Modal */}
      {materialsModal.isOpen && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setMaterialsModal({ isOpen: false, materials: [], studentName: '' })}>
            <div className={`${colors.background.card} rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-6 border-b ${colors.border.primary}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-2xl font-bold ${colors.text.primary}`}>Materiali Assegnati</h2>
                    <p className={`text-sm ${colors.text.muted} mt-1`}>{materialsModal.studentName}</p>
                  </div>
                  <button
                    onClick={() => setMaterialsModal({ isOpen: false, materials: [], studentName: '' })}
                    className={`p-2 rounded-lg ${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                {materialsModal.materials.length > 0 ? (
                  <div className="space-y-3">
                    {materialsModal.materials.map((mat: any) => (
                      <div key={mat.id} className={`p-4 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg bg-green-100 dark:bg-green-900/30`}>
                            <FolderOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold ${colors.text.primary} mb-1`}>{mat.material?.title || 'Materiale'}</h3>
                            <div className="flex items-center gap-3 text-sm">
                              {mat.material?.type && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}>
                                  {mat.material.type}
                                </span>
                              )}
                              <span className={colors.text.muted}>
                                Assegnato il {mat.grantedAt ? new Date(mat.grantedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-12`}>
                    <FolderOpen className={`w-12 h-12 mx-auto mb-3 ${colors.text.muted}`} />
                    <p className={`text-lg font-medium ${colors.text.primary}`}>Nessun materiale assegnato</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Manage Subjects Modal */}
      {subjectsModal.isOpen && (
        <ManageSubjectsModal
          isOpen={subjectsModal.isOpen}
          onClose={() => setSubjectsModal({ isOpen: false, collaboratorId: '', collaboratorName: '' })}
          collaboratorId={subjectsModal.collaboratorId}
          collaboratorName={subjectsModal.collaboratorName}
        />
      )}
    </div>
  );
}
