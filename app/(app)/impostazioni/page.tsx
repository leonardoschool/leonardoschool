'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { PageLoader } from '@/components/ui/loaders';
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
  Volume2
} from 'lucide-react';
import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

/**
 * Apply theme to document
 */
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
};

/**
 * Unified settings page - accessible by all authenticated users
 * Shows user settings and preferences
 */
export default function ImpostazioniPage() {
  const { user, loading } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Load saved theme preference on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    setCurrentTheme(savedTheme);
  }, []);

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  };

  if (loading || !mounted) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>Impostazioni</h1>
          <p className={`mt-2 ${colors.text.secondary}`}>Gestisci le tue preferenze e configurazioni</p>
        </div>

        {/* Theme Settings */}
        <SettingsSection 
          icon={Palette} 
          title="Aspetto" 
          description="Personalizza l'aspetto dell'applicazione"
        >
          <div className="space-y-4">
            <p className={`text-sm font-medium ${colors.text.primary}`}>Tema</p>
            <div className="grid grid-cols-3 gap-3">
              <ThemeOption
                value="light"
                label="Chiaro"
                icon={Sun}
                selected={currentTheme === 'light'}
                onSelect={() => handleThemeChange('light')}
              />
              <ThemeOption
                value="dark"
                label="Scuro"
                icon={Moon}
                selected={currentTheme === 'dark'}
                onSelect={() => handleThemeChange('dark')}
              />
              <ThemeOption
                value="system"
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
            <SettingsToggle
              icon={Mail}
              label="Notifiche email"
              description="Ricevi aggiornamenti via email"
              defaultChecked={true}
            />
            <SettingsToggle
              icon={MessageSquare}
              label="Nuovi messaggi"
              description="Notifiche per nuovi messaggi"
              defaultChecked={true}
            />
            <SettingsToggle
              icon={Calendar}
              label="Promemoria eventi"
              description="Ricevi promemoria per gli eventi in calendario"
              defaultChecked={true}
            />
            <SettingsToggle
              icon={Volume2}
              label="Suoni notifiche"
              description="Riproduci suoni per le notifiche"
              defaultChecked={false}
            />
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
              onClick={() => {/* TODO: implement */}}
            />
            <SettingsLink
              icon={Shield}
              label="Autenticazione a due fattori"
              description="Aggiungi un ulteriore livello di sicurezza"
              onClick={() => {/* TODO: implement */}}
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
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Lingua</label>
              <select 
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.card} ${colors.text.primary} focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                defaultValue="it"
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Formato data</label>
              <select 
                className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.card} ${colors.text.primary} focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                defaultValue="dd/mm/yyyy"
              >
                <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                <option value="yyyy-mm-dd">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </SettingsSection>
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
  icon: React.ComponentType<{ className?: string }>, 
  title: string, 
  description: string,
  children: React.ReactNode 
}) {
  return (
    <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${colors.primary.softBg}`}>
          <Icon className={`w-5 h-5 ${colors.primary.text}`} />
        </div>
        <div>
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>{title}</h2>
          <p className={`text-sm ${colors.text.secondary}`}>{description}</p>
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
  value: string, 
  label: string, 
  icon: React.ComponentType<{ className?: string }>,
  selected: boolean,
  onSelect: () => void 
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
        selected 
          ? `${colors.primary.border} ${colors.primary.softBg}` 
          : `${colors.border.primary} ${colors.effects.hover.bgSubtle}`
      }`}
    >
      <Icon className={`w-6 h-6 ${selected ? colors.primary.text : colors.icon.secondary}`} />
      <span className={`text-sm font-medium ${selected ? colors.primary.text : colors.text.primary}`}>{label}</span>
    </button>
  );
}

function SettingsToggle({ 
  icon: Icon, 
  label, 
  description, 
  defaultChecked 
}: { 
  icon: React.ComponentType<{ className?: string }>, 
  label: string, 
  description: string,
  defaultChecked: boolean 
}) {
  const [checked, setChecked] = useState(defaultChecked);
  
  return (
    <div className={`flex items-center justify-between py-3 border-b ${colors.border.primary} last:border-0`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${colors.icon.secondary}`} />
        <div>
          <p className={`text-sm font-medium ${colors.text.primary}`}>{label}</p>
          <p className={`text-xs ${colors.text.muted}`}>{description}</p>
        </div>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? colors.primary.bg : 'bg-gray-300 dark:bg-gray-600'
        }`}
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
  onClick 
}: { 
  icon: React.ComponentType<{ className?: string }>, 
  label: string, 
  description: string,
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between py-3 px-2 rounded-lg ${colors.effects.hover.bgSubtle} transition-colors`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${colors.icon.secondary}`} />
        <div className="text-left">
          <p className={`text-sm font-medium ${colors.text.primary}`}>{label}</p>
          <p className={`text-xs ${colors.text.muted}`}>{description}</p>
        </div>
      </div>
      <ChevronRight className={`w-5 h-5 ${colors.icon.secondary}`} />
    </button>
  );
}
