'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import { colors } from '@/lib/theme/colors';
import { 
  Bell, 
  Lock, 
  Palette, 
  Globe, 
  Shield,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Mail,
  MessageSquare,
  Calendar,
  Volume2,
  Eye,
  EyeOff,
  Check,
  X,
  FileText,
  AlertCircle,
  UserPlus,
  Users,
  ClipboardCheck,
  BookOpen,
  LogOut,
  Trash2,
  Play
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { 
  isNotificationSoundEnabled, 
  setNotificationSoundEnabled, 
  playTestSound 
} from '@/lib/utils/notificationSound';

type Theme = 'light' | 'dark' | 'system';

/**
 * Apply theme to document
 */
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
};

// Notification category groupings for better UX
const NOTIFICATION_CATEGORIES = {
  account: {
    label: 'Account e Registrazione',
    icon: UserPlus,
    types: ['ACCOUNT_ACTIVATED', 'NEW_REGISTRATION', 'PROFILE_COMPLETED']
  },
  contracts: {
    label: 'Contratti',
    icon: FileText,
    types: ['CONTRACT_ASSIGNED', 'CONTRACT_SIGNED', 'CONTRACT_REMINDER', 'CONTRACT_EXPIRED', 'CONTRACT_CANCELLED']
  },
  events: {
    label: 'Eventi e Calendario',
    icon: Calendar,
    types: ['EVENT_INVITATION', 'EVENT_REMINDER', 'EVENT_UPDATED', 'EVENT_CANCELLED']
  },
  simulations: {
    label: 'Simulazioni',
    icon: ClipboardCheck,
    types: ['SIMULATION_ASSIGNED', 'SIMULATION_REMINDER', 'SIMULATION_READY', 'SIMULATION_STARTED', 'SIMULATION_RESULTS', 'SIMULATION_COMPLETED']
  },
  materials: {
    label: 'Materiali',
    icon: BookOpen,
    types: ['MATERIAL_AVAILABLE']
  },
  messages: {
    label: 'Messaggi',
    icon: MessageSquare,
    types: ['MESSAGE_RECEIVED']
  },
  groups: {
    label: 'Gruppi',
    icon: Users,
    types: ['GROUP_MEMBER_ADDED', 'GROUP_REFERENT_ASSIGNED']
  }
} as const;

/**
 * Unified settings page - accessible by all authenticated users
 * Shows user settings and preferences with full functionality
 */
export default function ImpostazioniPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { handleMutationError } = useApiError();
  
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notificationSounds, setNotificationSounds] = useState(false);

  // Fetch notification preferences
  const { data: notificationPrefs, isLoading: prefsLoading, refetch: refetchPrefs } = 
    trpc.notifications.getPreferences.useQuery(undefined, {
      enabled: !!user,
    });

  // Update single preference mutation
  const updatePrefMutation = trpc.notifications.updatePreference.useMutation({
    onSuccess: () => {
      refetchPrefs();
    },
    onError: handleMutationError,
  });

  // Disable all emails mutation
  const disableAllEmailsMutation = trpc.notifications.disableAllEmails.useMutation({
    onSuccess: () => {
      showSuccess('Email disabilitate', 'Tutte le notifiche email sono state disabilitate.');
      refetchPrefs();
    },
    onError: handleMutationError,
  });

  // Reset preferences mutation
  const resetPrefsMutation = trpc.notifications.resetPreferences.useMutation({
    onSuccess: () => {
      showSuccess('Preferenze ripristinate', 'Le preferenze di notifica sono state ripristinate ai valori predefiniti.');
      refetchPrefs();
    },
    onError: handleMutationError,
  });

  // Load saved theme preference on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    setCurrentTheme(savedTheme);
    
    // Load notification sounds preference using the utility
    setNotificationSounds(isNotificationSoundEnabled());
  }, []);

  const handleThemeChange = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    
    const themeLabel = (() => {
      if (theme === 'light') return 'Chiaro';
      if (theme === 'dark') return 'Scuro';
      return 'Sistema';
    })();
    showSuccess('Tema aggiornato', `Tema impostato su "${themeLabel}".`);
  }, [showSuccess]);

  const handleSoundsChange = useCallback((enabled: boolean) => {
    setNotificationSounds(enabled);
    setNotificationSoundEnabled(enabled);
    if (enabled) {
      showSuccess('Suoni abilitati', 'I suoni per le notifiche sono stati attivati.');
    }
  }, [showSuccess]);

  const handleTestSound = useCallback(async () => {
    const played = await playTestSound(0.5);
    if (!played) {
      showError('Errore', 'Impossibile riprodurre il suono. Verifica che il browser supporti l\'audio.');
    }
  }, [showError]);

  const handleNotificationToggle = useCallback((notificationType: string, field: 'inAppEnabled' | 'emailEnabled', newValue: boolean) => {
    updatePrefMutation.mutate({
      notificationType: notificationType as never,
      [field]: newValue,
    });
  }, [updatePrefMutation]);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      showError('Errore', 'Impossibile effettuare il logout.');
    }
  }, [router, showError]);

  // Get preference for a specific type
  const getPref = useCallback((type: string) => {
    return notificationPrefs?.find(p => p.notificationType === type) || {
      notificationType: type,
      inAppEnabled: true,
      emailEnabled: true,
    };
  }, [notificationPrefs]);

  if (loading || !mounted) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${colors.text.primary}`}>Impostazioni</h1>
          <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${colors.text.secondary}`}>Gestisci le tue preferenze e configurazioni</p>
        </div>

        {/* Theme Settings */}
        <SettingsSection 
          icon={Palette} 
          title="Aspetto" 
          description="Personalizza l'aspetto dell'applicazione"
        >
          <div className="space-y-4">
            <p className={`text-sm font-medium ${colors.text.primary}`}>Tema</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <ThemeOption
                label="Chiaro"
                icon={Sun}
                selected={currentTheme === 'light'}
                onSelect={() => handleThemeChange('light')}
              />
              <ThemeOption
                label="Scuro"
                icon={Moon}
                selected={currentTheme === 'dark'}
                onSelect={() => handleThemeChange('dark')}
              />
              <ThemeOption
                label="Sistema"
                icon={Monitor}
                selected={currentTheme === 'system'}
                onSelect={() => handleThemeChange('system')}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection 
          icon={Bell} 
          title="Notifiche" 
          description="Configura le tue preferenze di notifica"
        >
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pb-4 border-b ${colors.border.primary}">
              <button
                onClick={() => disableAllEmailsMutation.mutate()}
                disabled={disableAllEmailsMutation.isPending}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${colors.border.primary} ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50`}
              >
                {disableAllEmailsMutation.isPending ? <Spinner size="xs" /> : <Mail className="w-4 h-4 inline mr-2" />}
                Disabilita tutte le email
              </button>
              <button
                onClick={() => resetPrefsMutation.mutate()}
                disabled={resetPrefsMutation.isPending}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${colors.border.primary} ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50`}
              >
                {resetPrefsMutation.isPending ? <Spinner size="xs" /> : null}
                Ripristina predefinite
              </button>
            </div>

            {/* Notification Sounds */}
            <div className={`flex items-center justify-between py-3 border-b ${colors.border.primary}`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Volume2 className={`w-5 h-5 ${colors.icon.secondary} flex-shrink-0`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${colors.text.primary}`}>Suoni notifiche</p>
                  <p className={`text-xs ${colors.text.muted}`}>Riproduci suoni per le notifiche</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {/* Test sound button */}
                <button
                  onClick={handleTestSound}
                  className={`p-1.5 rounded-lg ${colors.effects.hover.bgSubtle} transition-colors`}
                  title="Prova suono"
                >
                  <Play className={`w-4 h-4 ${colors.icon.secondary}`} />
                </button>
                {/* Toggle */}
                <button
                  onClick={() => handleSoundsChange(!notificationSounds)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    notificationSounds ? colors.primary.bg : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationSounds ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Notification Categories */}
            {prefsLoading ? (
              <div className="py-8 flex justify-center">
                <Spinner size="md" />
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <p className={`text-sm font-medium ${colors.text.primary}`}>Categorie di notifica</p>
                <p className={`text-xs ${colors.text.muted}`}>Scegli quali notifiche ricevere in-app e via email</p>
                
                <div className="space-y-3">
                  {Object.entries(NOTIFICATION_CATEGORIES).map(([key, category]) => {
                    const CategoryIcon = category.icon;
                    
                    return (
                      <NotificationCategoryRow
                        key={key}
                        icon={CategoryIcon}
                        label={category.label}
                        types={category.types}
                        getPref={getPref}
                        onToggle={handleNotificationToggle}
                        isUpdating={updatePrefMutation.isPending}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Privacy & Security */}
        <SettingsSection 
          icon={Shield} 
          title="Privacy e Sicurezza" 
          description="Gestisci la sicurezza del tuo account"
        >
          <div className="space-y-2">
            <SettingsLink
              icon={Lock}
              label="Cambia password"
              description="Aggiorna la password del tuo account"
              onClick={() => setShowPasswordModal(true)}
            />
            <SettingsLink
              icon={Shield}
              label="Autenticazione a due fattori"
              description="Aggiungi un ulteriore livello di sicurezza"
              badge="Prossimamente"
              onClick={() => showSuccess('Prossimamente', 'Questa funzionalità sarà disponibile a breve.')}
            />
          </div>
        </SettingsSection>

        {/* Language Settings */}
        <SettingsSection 
          icon={Globe} 
          title="Lingua e Regione" 
          description="Imposta lingua e formato regionale"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="language-select" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Lingua</label>
              <select 
                id="language-select"
                className={`w-full px-3 sm:px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.card} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b] focus:border-transparent text-sm sm:text-base`}
                defaultValue="it"
                onChange={(e) => {
                  if (e.target.value === 'en') {
                    showSuccess('Prossimamente', 'Il supporto per l\'inglese sarà disponibile a breve.');
                    e.target.value = 'it';
                  }
                }}
              >
                <option value="it">🇮🇹 Italiano</option>
                <option value="en">🇬🇧 English (Coming soon)</option>
              </select>
            </div>
            <div>
              <label htmlFor="date-format-select" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Formato data</label>
              <select 
                id="date-format-select"
                className={`w-full px-3 sm:px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.card} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b] focus:border-transparent text-sm sm:text-base`}
                defaultValue="dd/mm/yyyy"
              >
                <option value="dd/mm/yyyy">DD/MM/YYYY (31/12/2025)</option>
                <option value="dd-mm-yyyy">DD-MM-YYYY (31-12-2025)</option>
                <option value="yyyy-mm-dd">YYYY-MM-DD (2025-12-31)</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        {/* Account Actions */}
        <SettingsSection 
          icon={AlertCircle} 
          title="Azioni Account" 
          description="Gestisci il tuo account"
        >
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-between py-3 px-3 rounded-lg ${colors.effects.hover.bgSubtle} transition-colors`}
            >
              <div className="flex items-center gap-3">
                <LogOut className={`w-5 h-5 text-orange-500`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${colors.text.primary}`}>Esci dall&apos;account</p>
                  <p className={`text-xs ${colors.text.muted}`}>Disconnettiti da questo dispositivo</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 ${colors.icon.secondary}`} />
            </button>
            
            <button
              onClick={() => showSuccess('Contatta supporto', 'Per eliminare il tuo account, contatta il supporto all\'indirizzo info@leonardoschool.it')}
              className={`w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors`}
            >
              <div className="flex items-center gap-3">
                <Trash2 className={`w-5 h-5 text-red-500`} />
                <div className="text-left">
                  <p className={`text-sm font-medium text-red-600 dark:text-red-400`}>Elimina account</p>
                  <p className={`text-xs ${colors.text.muted}`}>Rimuovi permanentemente il tuo account</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-red-400`} />
            </button>
          </div>
        </SettingsSection>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
        )}
      </div>
    </div>
  );
}

// Helper Components
function SettingsSection({ 
  icon: Icon, 
  title, 
  description, 
  children 
}: { 
  readonly icon: React.ComponentType<{ className?: string }>; 
  readonly title: string; 
  readonly description: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-4 sm:p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${colors.primary.softBg}`}>
          <Icon className={`w-5 h-5 ${colors.primary.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`text-base sm:text-lg font-semibold ${colors.text.primary}`}>{title}</h2>
          <p className={`text-xs sm:text-sm ${colors.text.secondary}`}>{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ThemeOption({ 
  label, 
  icon: Icon, 
  selected, 
  onSelect 
}: { 
  readonly label: string; 
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-lg border-2 transition-all ${
        selected 
          ? `${colors.primary.border} ${colors.primary.softBg}` 
          : `${colors.border.primary} ${colors.effects.hover.bgSubtle}`
      }`}
    >
      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${selected ? colors.primary.text : colors.icon.secondary}`} />
      <span className={`text-xs sm:text-sm font-medium ${selected ? colors.primary.text : colors.text.primary}`}>{label}</span>
      {selected && <Check className={`w-3 h-3 sm:w-4 sm:h-4 ${colors.primary.text}`} />}
    </button>
  );
}

// Generic toggle component - kept for potential future use
function _SettingsToggle({ 
  icon: Icon, 
  label, 
  description, 
  checked,
  onChange,
  disabled = false
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b ${colors.border.primary} last:border-0`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Icon className={`w-5 h-5 ${colors.icon.secondary} flex-shrink-0`} />
        <div className="min-w-0">
          <p className={`text-sm font-medium ${colors.text.primary}`}>{label}</p>
          <p className={`text-xs ${colors.text.muted}`}>{description}</p>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${
          checked ? colors.primary.bg : 'bg-gray-300 dark:bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function SettingsLink({ 
  icon: Icon, 
  label, 
  description, 
  onClick,
  badge
}: { 
  readonly icon: React.ComponentType<{ className?: string }>; 
  readonly label: string; 
  readonly description: string;
  readonly onClick: () => void;
  readonly badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between py-3 px-2 sm:px-3 rounded-lg ${colors.effects.hover.bgSubtle} transition-colors`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`w-5 h-5 ${colors.icon.secondary} flex-shrink-0`} />
        <div className="text-left min-w-0">
          <p className={`text-sm font-medium ${colors.text.primary}`}>{label}</p>
          <p className={`text-xs ${colors.text.muted}`}>{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.status.info.bgLight} ${colors.status.info.text}`}>
            {badge}
          </span>
        )}
        <ChevronRight className={`w-5 h-5 ${colors.icon.secondary}`} />
      </div>
    </button>
  );
}

function NotificationCategoryRow({
  icon: Icon,
  label,
  types,
  getPref,
  onToggle,
  isUpdating
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly types: readonly string[];
  readonly getPref: (type: string) => { notificationType: string; inAppEnabled: boolean; emailEnabled: boolean };
  readonly onToggle: (type: string, field: 'inAppEnabled' | 'emailEnabled', value: boolean) => void;
  readonly isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  
  // Check if all types in this category have the same value
  const allInAppEnabled = types.every(type => getPref(type).inAppEnabled);
  const allEmailEnabled = types.every(type => getPref(type).emailEnabled);
  const someInAppEnabled = types.some(type => getPref(type).inAppEnabled);
  const someEmailEnabled = types.some(type => getPref(type).emailEnabled);

  const handleCategoryToggle = (field: 'inAppEnabled' | 'emailEnabled') => {
    const currentAll = field === 'inAppEnabled' ? allInAppEnabled : allEmailEnabled;
    const newValue = !currentAll;
    types.forEach(type => {
      onToggle(type, field, newValue);
    });
  };

  return (
    <div className={`rounded-lg border ${colors.border.primary} overflow-hidden`}>
      <button 
        type="button"
        className={`w-full flex items-center justify-between p-3 cursor-pointer ${colors.effects.hover.bgSubtle} text-left`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-5 h-5 ${colors.icon.secondary} flex-shrink-0`} />
          <span className={`text-sm font-medium ${colors.text.primary}`}>{label}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* In-App Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); handleCategoryToggle('inAppEnabled'); }}
            disabled={isUpdating}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              (() => {
                if (allInAppEnabled) return `${colors.status.success.bgLight} ${colors.status.success.text}`;
                if (someInAppEnabled) return `${colors.status.warning.bgLight} ${colors.status.warning.text}`;
                return `${colors.background.secondary} ${colors.text.muted}`;
              })()
            }`}
            title="Notifiche in-app"
          >
            <Bell className="w-3 h-3" />
            <span className="hidden sm:inline">In-App</span>
          </button>
          
          {/* Email Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); handleCategoryToggle('emailEnabled'); }}
            disabled={isUpdating}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              (() => {
                if (allEmailEnabled) return `${colors.status.success.bgLight} ${colors.status.success.text}`;
                if (someEmailEnabled) return `${colors.status.warning.bgLight} ${colors.status.warning.text}`;
                return `${colors.background.secondary} ${colors.text.muted}`;
              })()
            }`}
            title="Notifiche email"
          >
            <Mail className="w-3 h-3" />
            <span className="hidden sm:inline">Email</span>
          </button>
          
          <ChevronRight className={`w-4 h-4 ${colors.icon.secondary} transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
      
      {expanded && (
        <div className={`border-t ${colors.border.primary} p-3 space-y-2 ${colors.background.secondary}`}>
          {types.map(type => {
            const pref = getPref(type);
            const typeLabel = formatNotificationType(type);
            
            return (
              <div key={type} className="flex items-center justify-between py-1">
                <span className={`text-xs ${colors.text.secondary}`}>{typeLabel}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggle(type, 'inAppEnabled', !pref.inAppEnabled)}
                    disabled={isUpdating}
                    className={`p-1 rounded transition-colors ${
                      pref.inAppEnabled 
                        ? `${colors.status.success.bgLight} ${colors.status.success.text}` 
                        : `${colors.background.tertiary} ${colors.text.muted}`
                    }`}
                    title="In-App"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onToggle(type, 'emailEnabled', !pref.emailEnabled)}
                    disabled={isUpdating}
                    className={`p-1 rounded transition-colors ${
                      pref.emailEnabled 
                        ? `${colors.status.success.bgLight} ${colors.status.success.text}` 
                        : `${colors.background.tertiary} ${colors.text.muted}`
                    }`}
                    title="Email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Format notification type for display
function formatNotificationType(type: string): string {
  const labels: Record<string, string> = {
    // Account
    ACCOUNT_ACTIVATED: 'Account attivato',
    NEW_REGISTRATION: 'Nuova registrazione',
    PROFILE_COMPLETED: 'Profilo completato',
    // Contracts
    CONTRACT_ASSIGNED: 'Contratto assegnato',
    CONTRACT_SIGNED: 'Contratto firmato',
    CONTRACT_REMINDER: 'Promemoria contratto',
    CONTRACT_EXPIRED: 'Contratto scaduto',
    CONTRACT_CANCELLED: 'Contratto annullato',
    // Events
    EVENT_INVITATION: 'Invito evento',
    EVENT_REMINDER: 'Promemoria evento',
    EVENT_UPDATED: 'Evento modificato',
    EVENT_CANCELLED: 'Evento annullato',
    // Simulations
    SIMULATION_ASSIGNED: 'Simulazione assegnata',
    SIMULATION_REMINDER: 'Promemoria simulazione',
    SIMULATION_READY: 'Simulazione pronta',
    SIMULATION_STARTED: 'Simulazione iniziata',
    SIMULATION_RESULTS: 'Risultati disponibili',
    SIMULATION_COMPLETED: 'Simulazione completata',
    // Materials
    MATERIAL_AVAILABLE: 'Nuovo materiale',
    // Messages
    MESSAGE_RECEIVED: 'Messaggio ricevuto',
    // Groups
    GROUP_MEMBER_ADDED: 'Aggiunto a gruppo',
    GROUP_REFERENT_ASSIGNED: 'Referente gruppo',
  };
  return labels[type] || type;
}

// Password Change Modal
function PasswordChangeModal({ onClose }: { readonly onClose: () => void }) {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showError('Errore', 'Le password non coincidono.');
      return;
    }
    
    if (newPassword.length < 8) {
      showError('Errore', 'La nuova password deve essere di almeno 8 caratteri.');
      return;
    }

    setIsLoading(true);
    try {
      // Firebase password change requires re-authentication
      const user = auth.currentUser;
      if (!user?.email) {
        throw new Error('Utente non autenticato');
      }

      // Import required Firebase functions
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      
      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      showSuccess('Password aggiornata', 'La tua password è stata modificata con successo.');
      onClose();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/wrong-password') {
          showError('Errore', 'La password attuale non è corretta.');
        } else if (firebaseError.code === 'auth/weak-password') {
          showError('Errore', 'La nuova password è troppo debole.');
        } else {
          showError('Errore', 'Impossibile modificare la password. Riprova più tardi.');
        }
      } else {
        showError('Errore', 'Impossibile modificare la password. Riprova più tardi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-md ${colors.background.card} rounded-xl shadow-xl p-4 sm:p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Cambia Password</h2>
          <button onClick={onClose} className={`p-2 rounded-lg ${colors.effects.hover.bgSubtle}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label htmlFor="current-password" className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
              Password attuale
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={`w-full px-3 py-2 pr-10 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b] focus:border-transparent`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${colors.icon.secondary}`}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* New Password */}
          <div>
            <label htmlFor="new-password" className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
              Nuova password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={`w-full px-3 py-2 pr-10 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b] focus:border-transparent`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${colors.icon.secondary}`}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className={`text-xs ${colors.text.muted} mt-1`}>Minimo 8 caratteri</p>
          </div>
          
          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
              Conferma nuova password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b] focus:border-transparent`}
            />
          </div>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} font-medium hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors`}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 px-4 py-2 rounded-lg ${colors.primary.bg} text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isLoading ? <Spinner size="sm" variant="white" /> : null}
              Salva
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
