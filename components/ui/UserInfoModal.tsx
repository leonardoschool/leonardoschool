'use client';

import { Portal } from '@/components/ui/Portal';
import { colors } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/loaders';
import {
  X,
  GraduationCap,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Users,
  BookOpen,
  Crown,
} from 'lucide-react';

export interface UserInfoModalProps {
  userId: string;
  userType: 'STUDENT' | 'COLLABORATOR';
  isOpen: boolean;
  onClose: () => void;
}

// Interfacce per i dati utente
interface SubjectData {
  id: string;
  name: string;
  code: string;
  color: string | null;
}

interface UserProfile {
  fiscalCode?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  specialization?: string | null;
  enrollmentDate?: Date | string | null;
  // Per studenti - classe come relazione
  class?: {
    id: string;
    name: string;
  } | null;
  groupMemberships?: Array<{
    group: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
  // Per collaboratori
  subjects?: Array<{ 
    id: string;
    subject: SubjectData;
    isPrimary: boolean;
  }>;
  referenceGroups?: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
}

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  emailVerified?: boolean;
  student?: UserProfile | null;
  collaborator?: UserProfile | null;
}

export function UserInfoModal({ userId, userType, isOpen, onClose }: UserInfoModalProps) {
  // Query per studente - usa getPublicInfo (accessibile a tutti gli utenti autenticati)
  const { 
    data: studentData, 
    isLoading: loadingStudent,
    error: studentError 
  } = trpc.students.getPublicInfo.useQuery(
    { id: userId },
    { enabled: isOpen && userType === 'STUDENT', retry: false }
  );

  // Query per collaboratore - usa getPublicInfo (accessibile a tutti gli utenti autenticati)
  const { 
    data: collaboratorData, 
    isLoading: loadingCollaborator,
    error: collaboratorError 
  } = trpc.collaborators.getPublicInfo.useQuery(
    { id: userId },
    { enabled: isOpen && userType === 'COLLABORATOR', retry: false }
  );

  if (!isOpen) return null;

  const isLoading = userType === 'STUDENT' ? loadingStudent : loadingCollaborator;
  const error = userType === 'STUDENT' ? studentError : collaboratorError;
  
  // Messaggio di errore user-friendly
  const getErrorMessage = (): string | null => {
    if (!error) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (error as any)?.data?.code;
    if (code === 'NOT_FOUND') {
      return userType === 'STUDENT' 
        ? 'Studente non trovato o non più disponibile.' 
        : 'Collaboratore non trovato o non più disponibile.';
    }
    if (code === 'FORBIDDEN' || code === 'UNAUTHORIZED') {
      return 'Non hai i permessi per visualizzare questo profilo.';
    }
    return 'Si è verificato un errore nel caricamento del profilo.';
  };
  
  const errorMessage = getErrorMessage();
  
  // Cast a UserData per semplificare l'accesso ai campi
  const rawData = userType === 'STUDENT' ? studentData : collaboratorData;
  const user = rawData as UserData | undefined;
  
  // Estrai i dati in base al tipo
  const profile: UserProfile | null | undefined = userType === 'STUDENT' 
    ? user?.student 
    : user?.collaborator;

  // Gruppi dell'utente
  const groups = profile?.groupMemberships?.map((gm) => gm.group) || [];

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
        onClick={onClose}
      >
        <div 
          className={`${colors.background.card} rounded-2xl w-full max-w-md shadow-2xl overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con sfondo colorato */}
          <div className={`relative p-6 ${
            userType === 'STUDENT' 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
              : 'bg-gradient-to-br from-purple-500 to-purple-600'
          }`}>
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="lg" variant="white" />
              </div>
            ) : errorMessage ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <X className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Errore
                  </h2>
                  <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-white/20 text-white font-medium">
                    {userType === 'STUDENT' ? 'Studente' : 'Collaboratore'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  {userType === 'STUDENT' ? (
                    <GraduationCap className="w-8 h-8 text-white" />
                  ) : (
                    <Briefcase className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {user?.name || 'N/A'}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {user?.email}
                  </p>
                  <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-white/20 text-white font-medium">
                    {userType === 'STUDENT' ? 'Studente' : 'Collaboratore'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Messaggio di errore */}
          {!isLoading && errorMessage && (
            <div className="p-6">
              <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
                <p className={`text-center ${colors.text.secondary}`}>
                  {errorMessage}
                </p>
              </div>
              <button
                onClick={onClose}
                className={`w-full mt-4 px-4 py-2.5 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:opacity-80 transition-opacity font-medium`}
              >
                Chiudi
              </button>
            </div>
          )}

          {/* Contenuto */}
          {!isLoading && user && !errorMessage && (
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Informazioni Personali */}
              <section>
                <h3 className={`text-sm font-semibold ${colors.text.secondary} uppercase tracking-wide mb-3`}>
                  Informazioni Personali
                </h3>
                <div className="space-y-3">
                  {/* Codice Fiscale */}
                  {profile?.fiscalCode && (
                    <InfoRow 
                      icon={<CreditCard className="w-4 h-4" />}
                      label="Codice Fiscale"
                      value={profile.fiscalCode}
                    />
                  )}

                  {/* Telefono */}
                  {profile?.phone && (
                    <InfoRow 
                      icon={<Phone className="w-4 h-4" />}
                      label="Telefono"
                      value={profile.phone}
                    />
                  )}

                  {/* Data di nascita */}
                  {profile?.dateOfBirth && (
                    <InfoRow 
                      icon={<Calendar className="w-4 h-4" />}
                      label="Data di nascita"
                      value={new Date(profile.dateOfBirth).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    />
                  )}

                  {/* Indirizzo */}
                  {(profile?.address || profile?.city) && (
                    <InfoRow 
                      icon={<MapPin className="w-4 h-4" />}
                      label="Indirizzo"
                      value={[
                        profile?.address,
                        [profile?.postalCode, profile?.city].filter(Boolean).join(' '),
                        profile?.province,
                      ].filter(Boolean).join(', ')}
                    />
                  )}
                </div>
              </section>

              {/* Info specifiche per tipo */}
              {userType === 'STUDENT' && (profile?.enrollmentDate || profile?.class) && (
                <section>
                  <h3 className={`text-sm font-semibold ${colors.text.secondary} uppercase tracking-wide mb-3`}>
                    Informazioni Scolastiche
                  </h3>
                  <div className="space-y-3">
                    {profile?.class && (
                      <InfoRow 
                        icon={<GraduationCap className="w-4 h-4" />}
                        label="Classe"
                        value={profile.class.name}
                      />
                    )}
                    {profile?.enrollmentDate && (
                      <InfoRow 
                        icon={<Calendar className="w-4 h-4" />}
                        label="Data iscrizione"
                        value={new Date(profile.enrollmentDate).toLocaleDateString('it-IT')}
                      />
                    )}
                  </div>
                </section>
              )}

              {userType === 'COLLABORATOR' && (profile?.specialization || (profile?.subjects && profile.subjects.length > 0)) && (
                <section>
                  <h3 className={`text-sm font-semibold ${colors.text.secondary} uppercase tracking-wide mb-3`}>
                    Informazioni Lavorative
                  </h3>
                  <div className="space-y-3">
                    {profile?.specialization && (
                      <InfoRow 
                        icon={<BookOpen className="w-4 h-4" />}
                        label="Specializzazione"
                        value={profile.specialization}
                      />
                    )}
                    {profile?.subjects && profile.subjects.length > 0 && (
                      <div className={`flex items-start gap-3 p-3 rounded-lg ${colors.background.secondary}`}>
                        <div className={`${colors.text.secondary} mt-0.5`}>
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${colors.text.muted} mb-1.5`}>Materie insegnate</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.subjects.map((s) => (
                              <span 
                                key={s.id}
                                className="text-xs px-2 py-1 rounded-full font-medium"
                                style={{
                                  backgroundColor: s.subject.color ? `${s.subject.color}20` : 'rgba(147, 51, 234, 0.1)',
                                  color: s.subject.color || '#9333ea',
                                }}
                              >
                                {s.subject.name}
                                {s.isPrimary && ' ⭐'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Gruppi di riferimento - solo per collaboratori */}
              {userType === 'COLLABORATOR' && profile?.referenceGroups && profile.referenceGroups.length > 0 && (
                <section>
                  <h3 className={`text-sm font-semibold ${colors.text.secondary} uppercase tracking-wide mb-3`}>
                    <Crown className="w-4 h-4 inline mr-2" />
                    Gruppi di Riferimento ({profile.referenceGroups.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.referenceGroups.map((g) => (
                      <span
                        key={g.id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{
                          backgroundColor: g.color ? `${g.color}20` : 'rgba(100,100,100,0.1)',
                          color: g.color || undefined,
                          border: `1px solid ${g.color || 'rgba(100,100,100,0.2)'}`,
                        }}
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Gruppi */}
              <section>
                <h3 className={`text-sm font-semibold ${colors.text.secondary} uppercase tracking-wide mb-3`}>
                  <Users className="w-4 h-4 inline mr-2" />
                  Gruppi ({groups.length})
                </h3>
                {groups.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g: { id: string; name: string; color: string | null }) => (
                      <span
                        key={g.id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{
                          backgroundColor: g.color ? `${g.color}20` : 'rgba(100,100,100,0.1)',
                          color: g.color || undefined,
                          border: `1px solid ${g.color || 'rgba(100,100,100,0.2)'}`,
                        }}
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${colors.text.muted} italic`}>
                    Non appartiene a nessun gruppo
                  </p>
                )}
              </section>

              {/* Stato account */}
              <section>
                <h3 className={`text-sm font-semibold ${colors.text.secondary} uppercase tracking-wide mb-3`}>
                  Stato Account
                </h3>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    user?.isActive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    {user?.isActive ? 'Attivo' : 'Non attivo'}
                  </span>
                  {user?.emailVerified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      <Mail className="w-3 h-3" />
                      Email verificata
                    </span>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Footer - solo quando non c'è errore */}
          {!errorMessage && (
            <div className={`p-4 border-t ${colors.border.primary}`}>
              <button
                onClick={onClose}
                className={`w-full py-2.5 rounded-lg ${colors.background.secondary} ${colors.text.primary} font-medium hover:opacity-80 transition-colors`}
              >
                Chiudi
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

// Componente helper per le righe di informazione
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${colors.background.secondary}`}>
      <div className={`${colors.text.secondary} mt-0.5`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${colors.text.muted} mb-0.5`}>{label}</p>
        <p className={`text-sm ${colors.text.primary} font-medium break-words`}>{value}</p>
      </div>
    </div>
  );
}

export default UserInfoModal;
