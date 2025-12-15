'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { PageLoader } from '@/components/ui/loaders';
import { colors } from '@/lib/theme/colors';
import { User, Mail, Phone, Calendar, MapPin, CreditCard, Shield, Edit2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

/**
 * Unified profile page - accessible by all authenticated users
 * Shows user's profile information based on their role
 */
export default function ProfiloPage() {
  const { user, loading } = useAuth();
  
  // Fetch complete user data with profile based on role
  const { data: studentProfile, isLoading: studentLoading } = trpc.students.getProfile.useQuery(undefined, {
    enabled: !!user && user.role === 'STUDENT',
  });
  
  const { data: collaboratorProfile, isLoading: collaboratorLoading } = trpc.collaborators.getProfile.useQuery(undefined, {
    enabled: !!user && user.role === 'COLLABORATOR',
  });

  const isLoading = loading || (user?.role === 'STUDENT' && studentLoading) || (user?.role === 'COLLABORATOR' && collaboratorLoading);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  const profile = user.role === 'STUDENT' ? studentProfile : user.role === 'COLLABORATOR' ? collaboratorProfile : null;
  const roleLabel = user.role === 'ADMIN' ? 'Amministratore' : user.role === 'COLLABORATOR' ? 'Collaboratore' : 'Studente';
  const roleIcon = user.role === 'ADMIN' ? '👑' : user.role === 'COLLABORATOR' ? '🤝' : '📚';

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className={`${colors.background.card} rounded-2xl shadow-lg border ${colors.border.primary} overflow-hidden`}>
          {/* Gradient Banner */}
          <div className={`h-32 ${colors.primary.gradient}`} />
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16">
              {/* Avatar */}
              <div className={`w-32 h-32 rounded-full ${colors.primary.bg} flex items-center justify-center text-white text-4xl font-bold border-4 ${colors.background.card} shadow-lg`}>
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              
              {/* Name & Role */}
              <div className="flex-1 text-center sm:text-left pb-2">
                <h1 className={`text-2xl font-bold ${colors.text.primary}`}>{user.name}</h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${colors.primary.softBg} ${colors.primary.text}`}>
                    {roleIcon} {roleLabel}
                  </span>
                </div>
              </div>
              
              {/* Edit Button */}
              <button 
                className={`px-4 py-2 rounded-lg ${colors.primary.bg} text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity`}
                onClick={() => {/* TODO: implement edit */}}
              >
                <Edit2 className="w-4 h-4" />
                Modifica
              </button>
            </div>
          </div>
        </div>

        {/* Main Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Info */}
          <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-6`}>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
              <Shield className="w-5 h-5" />
              Informazioni Account
            </h2>
            <div className="space-y-4">
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={User} label="Nome completo" value={user.name || 'Non specificato'} />
              <InfoRow 
                icon={Calendar} 
                label="Membro dal" 
                value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('it-IT', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                }) : '-'} 
              />
            </div>
          </div>

          {/* Profile Details */}
          {profile && (
            <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-6`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                <User className="w-5 h-5" />
                Dati Personali
              </h2>
              <div className="space-y-4">
                <InfoRow icon={Phone} label="Telefono" value={(profile as { telefono?: string }).telefono || 'Non specificato'} />
                <InfoRow icon={CreditCard} label="Codice Fiscale" value={(profile as { codiceFiscale?: string }).codiceFiscale || 'Non specificato'} />
                {(profile as { dataNascita?: Date }).dataNascita && (
                  <InfoRow 
                    icon={Calendar} 
                    label="Data di nascita" 
                    value={new Date((profile as { dataNascita: Date }).dataNascita).toLocaleDateString('it-IT')} 
                  />
                )}
                {(profile as { indirizzo?: string }).indirizzo && (
                  <InfoRow icon={MapPin} label="Indirizzo" value={(profile as { indirizzo: string }).indirizzo} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatusCard 
            label="Stato Account" 
            value={user.isActive ? 'Attivo' : 'Non attivo'} 
            status={user.isActive ? 'success' : 'warning'} 
          />
          <StatusCard 
            label="Email Verificata" 
            value={user.emailVerified ? 'Sì' : 'No'} 
            status={user.emailVerified ? 'success' : 'warning'} 
          />
          <StatusCard 
            label="Profilo Completo" 
            value={user.profileCompleted ? 'Sì' : 'No'} 
            status={user.profileCompleted ? 'success' : 'warning'} 
          />
        </div>
      </div>
    </div>
  );
}

// Helper components
function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${colors.icon.secondary}`} />
      <div>
        <p className={`text-sm ${colors.text.muted}`}>{label}</p>
        <p className={`font-medium ${colors.text.primary}`}>{value}</p>
      </div>
    </div>
  );
}

function StatusCard({ label, value, status }: { label: string, value: string, status: 'success' | 'warning' | 'error' }) {
  const statusColors = {
    success: colors.status.success,
    warning: colors.status.warning,
    error: colors.status.error,
  };
  
  return (
    <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-4`}>
      <p className={`text-sm ${colors.text.muted}`}>{label}</p>
      <p className={`text-lg font-semibold ${statusColors[status].text}`}>{value}</p>
    </div>
  );
}
