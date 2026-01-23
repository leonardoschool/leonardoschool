'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { PageLoader } from '@/components/ui/loaders';
import { colors } from '@/lib/theme/colors';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Shield, 
  Edit2,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Building2,
  GraduationCap,
  Briefcase,
  Users,
  Download,
  Heart,
  Home
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';
import { generateContractPdf } from '@/lib/utils/contractPdf';
import { useToast } from '@/components/ui/Toast';

/**
 * Gets the profile data based on user role
 */
function getProfileForRole(
  role: string,
  studentProfile: unknown,
  collaboratorProfile: unknown
): unknown {
  const profileByRole: Record<string, unknown> = {
    STUDENT: studentProfile,
    COLLABORATOR: collaboratorProfile,
  };
  return profileByRole[role] ?? null;
}

/**
 * Gets the contract data based on user role
 */
function getContractForRole(
  role: string,
  studentContract: unknown,
  collaboratorContract: unknown
): unknown {
  const contractByRole: Record<string, unknown> = {
    STUDENT: studentContract,
    COLLABORATOR: collaboratorContract,
  };
  return contractByRole[role] ?? null;
}

/**
 * Unified profile page - accessible by all authenticated users
 * Shows user's profile information based on their role
 * Displays pending contracts if any
 */
export default function ProfiloPage() {
  const { user, loading, emailVerified } = useAuth();
  
  // Fetch complete user data with profile based on role
  const { data: studentProfile, isLoading: studentLoading } = trpc.students.getProfile.useQuery(undefined, {
    enabled: !!user && user.role === 'STUDENT',
  });
  
  const { data: collaboratorProfile, isLoading: collaboratorLoading } = trpc.collaborators.getProfile.useQuery(undefined, {
    enabled: !!user && user.role === 'COLLABORATOR',
  });

  // Fetch pending contract for students
  const { data: studentContract, isLoading: studentContractLoading } = trpc.contracts.getMyContract.useQuery(
    undefined,
    { enabled: !!user && user.role === 'STUDENT' }
  );

  // Fetch pending contract for collaborators
  const { data: collaboratorContract, isLoading: collaboratorContractLoading } = trpc.contracts.getMyCollaboratorContract.useQuery(
    undefined,
    { enabled: !!user && user.role === 'COLLABORATOR' }
  );

  // Fetch group memberships for students
  const { data: groupsData } = trpc.groups.getMyGroups.useQuery(undefined, {
    enabled: !!user && user.role === 'STUDENT',
  });

  // Fetch parent/guardian data for students
  const { data: parentGuardian, isLoading: parentLoading } = trpc.students.getMyParentGuardian.useQuery(undefined, {
    enabled: !!user && user.role === 'STUDENT',
  });

  // Check if admin has requested parent data
  const { data: parentDataRequirement } = trpc.students.getParentDataRequirement.useQuery(undefined, {
    enabled: !!user && user.role === 'STUDENT',
  });

  const isStudentLoading = user?.role === 'STUDENT' && (studentLoading || studentContractLoading || parentLoading);
  const isCollaboratorLoading = user?.role === 'COLLABORATOR' && (collaboratorLoading || collaboratorContractLoading);
  const isLoading = loading || isStudentLoading || isCollaboratorLoading;

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  // Select profile and contract based on role using helpers
  const profile = getProfileForRole(user.role, studentProfile, collaboratorProfile);
  const pendingContract = getContractForRole(user.role, studentContract, collaboratorContract);
  
  // Role info
  const roleConfig = {
    ADMIN: { label: 'Amministratore', icon: '👑', color: colors.roles.admin },
    COLLABORATOR: { label: 'Collaboratore', icon: '🤝', color: colors.roles.collaborator },
    STUDENT: { label: 'Studente', icon: '📚', color: colors.roles.student },
  };
  
  const roleInfo = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.STUDENT;

  return (
    <div className="min-h-screen py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Pending Contract Alert */}
        {(pendingContract as { status?: string })?.status === 'PENDING' && (
          <ContractAlert contract={pendingContract} />
        )}
        
        {/* Header Card */}
        <div className={`${colors.background.card} rounded-xl sm:rounded-2xl shadow-lg border ${colors.border.primary} overflow-hidden`}>
          {/* Gradient Banner */}
          <div className={`h-24 sm:h-32 ${colors.primary.gradient}`} />
          
          {/* Profile Info */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 -mt-12 sm:-mt-16">
              {/* Avatar */}
              <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full ${colors.primary.bg} flex items-center justify-center ${colors.text.secondary} text-3xl sm:text-4xl font-bold border-4 ${colors.background.card} shadow-lg flex-shrink-0`}>
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              
              {/* Name & Role */}
              <div className="flex-1 text-center sm:text-left pb-2 min-w-0">
                <h1 className={`text-xl sm:text-2xl font-bold ${colors.text.primary} truncate`}>{user.name}</h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color.softBg} ${roleInfo.color.text}`}>
                    {roleInfo.icon} {roleInfo.label}
                  </span>
                  {user.role === 'STUDENT' && (profile as { matricola?: string })?.matricola && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono ${colors.background.secondary} ${colors.text.secondary}`}>
                      {(profile as { matricola: string }).matricola}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Edit Button */}
              <Link 
                href="/auth/complete-profile?edit=true"
                className={`px-3 sm:px-4 py-2 rounded-lg ${colors.primary.bg} text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity text-sm sm:text-base`}
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Modifica Profilo</span>
                <span className="sm:hidden">Modifica</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Signed Contract Info - if contract is signed */}
        {(pendingContract as { status?: string })?.status === 'SIGNED' && (
          <SignedContractCard contract={pendingContract} />
        )}

        {/* Main Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Account Info */}
          <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-4 sm:p-6`}>
            <h2 className={`text-base sm:text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
              <Shield className="w-5 h-5" />
              Informazioni Account
            </h2>
            <div className="space-y-3 sm:space-y-4">
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
              {user.lastLoginAt && (
                <InfoRow 
                  icon={Clock} 
                  label="Ultimo accesso" 
                  value={new Date(user.lastLoginAt).toLocaleDateString('it-IT', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} 
                />
              )}
            </div>
          </div>

          {/* Profile Details */}
          {profile && (
            <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-4 sm:p-6`}>
              <h2 className={`text-base sm:text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                <User className="w-5 h-5" />
                Dati Personali
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <InfoRow 
                  icon={Phone} 
                  label="Telefono" 
                  value={(profile as { phone?: string }).phone || 'Non specificato'} 
                />
                <InfoRow 
                  icon={CreditCard} 
                  label="Codice Fiscale" 
                  value={(profile as { fiscalCode?: string }).fiscalCode || 'Non specificato'} 
                />
                {(profile as { dateOfBirth?: Date }).dateOfBirth && (
                  <InfoRow 
                    icon={Calendar} 
                    label="Data di nascita" 
                    value={new Date((profile as { dateOfBirth: Date }).dateOfBirth).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} 
                  />
                )}
                {((profile as { address?: string }).address || (profile as { city?: string }).city) && (
                  <InfoRow 
                    icon={MapPin} 
                    label="Indirizzo" 
                    value={formatAddress(profile as { address?: string; city?: string; province?: string; postalCode?: string })} 
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role-specific sections */}
        {user.role === 'STUDENT' && (
          <>
            {/* Parent Data Request Alert */}
            {parentDataRequirement?.requestedByAdmin && !parentGuardian && (
              <ParentDataRequestAlert requestedAt={'requestedAt' in (parentDataRequirement ?? {}) ? (parentDataRequirement as { requestedAt?: Date | string | null }).requestedAt : null} />
            )}
            
            <StudentSection 
              profile={studentProfile} 
              groups={(groupsData as { id?: string; name?: string; color?: string | null }[] | undefined) || []} 
            />
            
            {/* Parent/Guardian Section */}
            <ParentGuardianSection 
              parentGuardian={parentGuardian}
              requiresParentData={parentDataRequirement?.requestedByAdmin ?? false}
            />
          </>
        )}
        
        {user.role === 'COLLABORATOR' && (
          <CollaboratorSection profile={collaboratorProfile} />
        )}
        
        {user.role === 'ADMIN' && (
          <AdminSection />
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatusCard 
            label="Stato Account" 
            value={user.isActive ? 'Attivo' : 'In attesa'} 
            status={user.isActive ? 'success' : 'warning'} 
            icon={user.isActive ? CheckCircle : Clock}
          />
          <StatusCard 
            label="Email Verificata" 
            value={emailVerified ? 'Sì' : 'No'} 
            status={emailVerified ? 'success' : 'warning'} 
            icon={emailVerified ? CheckCircle : AlertTriangle}
          />
          <StatusCard 
            label="Profilo Completo" 
            value={user.profileCompleted ? 'Sì' : 'No'} 
            status={user.profileCompleted ? 'success' : 'warning'} 
            icon={user.profileCompleted ? CheckCircle : AlertTriangle}
          />
        </div>
      </div>
    </div>
  );
}

// Format full address from profile fields
function formatAddress(profile: { address?: string; city?: string; province?: string; postalCode?: string }) {
  const parts = [
    profile.address,
    profile.city,
    profile.province ? `(${profile.province})` : null,
    profile.postalCode
  ].filter(Boolean);
  return parts.join(', ') || 'Non specificato';
}

// Contract Alert Component - shown for pending contracts
interface ContractAlertProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly contract: any;
}

function ContractAlert({ contract }: ContractAlertProps) {
  if (!contract?.id || !contract?.signToken || !contract?.template) return null;
  const daysLeft = contract.expiresAt 
    ? Math.ceil((new Date(contract.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className={`${colors.status.warning.bgLight} border-2 ${colors.status.warning.border} rounded-xl p-4 sm:p-6`}>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className={`p-3 rounded-full ${colors.status.warning.bg} text-white flex-shrink-0`}>
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
            Contratto da firmare
          </h3>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Hai un contratto &quot;{contract.template.name}&quot; in attesa di firma.
            {contract.template.price && (
              <span className="font-medium"> Importo: €{contract.template.price.toFixed(2)}</span>
            )}
          </p>
          {daysLeft !== null && daysLeft > 0 && (
            <p className={`mt-1 text-sm ${daysLeft <= 3 ? 'text-red-600 dark:text-red-400 font-medium' : colors.text.muted}`}>
              <Clock className="w-4 h-4 inline mr-1" />
              {daysLeft === 1 ? 'Scade domani' : `Scade tra ${daysLeft} giorni`}
            </p>
          )}
        </div>
        <Link 
          href={`/contratto/${contract.signToken}`}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-lg ${colors.primary.bg} text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
        >
          <FileText className="w-4 h-4" />
          Firma ora
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// Signed Contract Card
interface SignedContractCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly contract: any;
}

function SignedContractCard({ contract }: SignedContractCardProps) {
  const { showSuccess, showError } = useToast();
  
  if (!contract?.id || !contract?.template) return null;

  const handleDownload = () => {
    // Check if contract has required data for PDF generation
    if (!contract.contentSnapshot) {
      showError('Errore', 'Il contenuto del contratto non è disponibile per il download.');
      return;
    }

    try {
      // Build the PDF data structure
      // Determine user data from student or collaborator
      const getUserData = () => {
        if (contract.student) {
          return { user: { name: contract.student.user.name, email: contract.student.user.email } };
        }
        if (contract.collaborator) {
          return { user: { name: contract.collaborator.user.name, email: contract.collaborator.user.email } };
        }
        return undefined;
      };
      const userData = getUserData();

      const pdfData = {
        id: contract.id,
        contentSnapshot: contract.contentSnapshot,
        signatureData: contract.signatureData,
        signedAt: contract.signedAt,
        assignedAt: contract.assignedAt,
        template: {
          name: contract.template.name,
        },
        student: userData,
      };

      generateContractPdf(pdfData);
      showSuccess('Download avviato', 'Il contratto si aprirà in una nuova finestra per il salvataggio.');
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      showError('Errore', 'Impossibile generare il PDF del contratto.');
    }
  };
  
  return (
    <div className={`${colors.status.success.bgLight} border ${colors.status.success.border} rounded-xl p-4 sm:p-5`}>
      <div className="flex flex-col sm:flex-row items-start gap-3">
        <div className={`p-2 rounded-full ${colors.status.success.bg} text-white flex-shrink-0`}>
          <CheckCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${colors.text.primary}`}>
            Contratto Attivo
          </h3>
          <p className={`mt-1 text-sm ${colors.text.secondary}`}>
            {contract.template.name}
            {contract.template.duration && ` • ${contract.template.duration}`}
          </p>
          {contract.signedAt && (
            <p className={`mt-1 text-xs ${colors.text.muted}`}>
              Firmato il {new Date(contract.signedAt).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          )}
        </div>
        {/* Download button - only show if contract is signed, has content, AND admin enabled download */}
        {contract.status === 'SIGNED' && contract.contentSnapshot && contract.canDownload && (
          <button
            onClick={handleDownload}
            className={`w-full sm:w-auto mt-2 sm:mt-0 px-3 py-2 rounded-lg border ${colors.status.success.border} ${colors.status.success.text} font-medium flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm`}
          >
            <Download className="w-4 h-4" />
            Scarica PDF
          </button>
        )}
      </div>
    </div>
  );
}

// Alert shown to students when admin has requested parent/guardian data
interface ParentDataRequestAlertProps {
  readonly requestedAt?: Date | string | null;
}

function ParentDataRequestAlert({ requestedAt }: ParentDataRequestAlertProps) {
  return (
    <div className={`${colors.status.error.bgLight} border-2 ${colors.status.error.border} rounded-xl p-4 sm:p-6 animate-pulse`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${colors.status.error.bg}`}>
          <AlertTriangle className={`w-5 h-5 text-white`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-bold ${colors.status.error.text}`}>
            ⚠️ Account Bloccato - Azione Richiesta
          </h3>
          <p className={`mt-1 ${colors.text.secondary}`}>
            <strong>Il tuo account è temporaneamente sospeso</strong> fino all&apos;inserimento dei dati del genitore/tutore legale richiesti dall&apos;amministrazione.
            Per riattivare il tuo account, compila i dati cliccando sul pulsante qui sotto.
          </p>
          {requestedAt && (
            <p className={`mt-2 text-sm ${colors.text.muted}`}>
              Richiesta effettuata il {new Date(requestedAt).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          )}
          <Link 
            href="/auth/complete-profile"
            className={`mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg ${colors.status.error.bg} text-white font-semibold hover:opacity-90 transition-opacity shadow-lg`}
          >
            <Edit2 className="w-4 h-4" />
            Compila dati genitore per sbloccare
          </Link>
        </div>
      </div>
    </div>
  );
}

// Parent/Guardian section for students
interface ParentGuardianData {
  id?: string;
  relationship?: string;
  firstName?: string;
  lastName?: string;
  fiscalCode?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  studentId?: string;
}

interface ParentGuardianSectionProps {
  readonly parentGuardian: ParentGuardianData | null | undefined;
  readonly requiresParentData: boolean;
}

function ParentGuardianSection({ 
  parentGuardian, 
  requiresParentData 
}: ParentGuardianSectionProps) {
  // Map relationship codes to Italian labels
  const relationshipLabels: Record<string, string> = {
    MOTHER: 'Madre',
    FATHER: 'Padre',
    LEGAL_GUARDIAN: 'Tutore Legale',
    OTHER: 'Altro',
  };

  // If no parent data and not required, don't show anything
  if (!parentGuardian && !requiresParentData) return null;
  
  // If no parent data but required, show a prompt
  if (!parentGuardian && requiresParentData) {
    return (
      <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-4 sm:p-6`}>
        <h2 className={`text-base sm:text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <Heart className="w-5 h-5" />
          Genitore/Tutore Legale
        </h2>
        <p className={`${colors.text.secondary}`}>
          I dati del genitore/tutore legale non sono ancora stati inseriti.
        </p>
        <Link 
          href="/auth/complete-profile?parentData=true"
          className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white font-medium hover:opacity-90 transition-opacity`}
        >
          <Edit2 className="w-4 h-4" />
          Aggiungi dati genitore
        </Link>
      </div>
    );
  }

  // Format address if available
  const formatParentAddress = () => {
    if (!parentGuardian) return null;
    const parts = [
      parentGuardian.address,
      parentGuardian.city,
      parentGuardian.province ? `(${parentGuardian.province})` : null,
      parentGuardian.postalCode
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const formattedAddress = formatParentAddress();

  return (
    <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-4 sm:p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-base sm:text-lg font-semibold ${colors.text.primary} flex items-center gap-2`}>
          <Heart className="w-5 h-5" />
          Genitore/Tutore Legale
        </h2>
        <Link 
          href="/auth/complete-profile?parentData=true"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${colors.primary.softBg} ${colors.primary.text} font-medium hover:opacity-80 transition-opacity`}
        >
          <Edit2 className="w-3.5 h-3.5" />
          Modifica
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoRow 
          icon={User} 
          label="Parentela" 
          value={relationshipLabels[parentGuardian?.relationship || ''] || parentGuardian?.relationship || '-'} 
        />
        <InfoRow 
          icon={User} 
          label="Nome completo" 
          value={`${parentGuardian?.firstName} ${parentGuardian?.lastName}`} 
        />
        <InfoRow 
          icon={CreditCard} 
          label="Codice Fiscale" 
          value={parentGuardian?.fiscalCode || '-'} 
        />
        <InfoRow 
          icon={Phone} 
          label="Telefono" 
          value={parentGuardian?.phone || '-'} 
        />
        {parentGuardian?.email && (
          <InfoRow 
            icon={Mail} 
            label="Email" 
            value={parentGuardian.email} 
          />
        )}
        {formattedAddress && (
          <div className="sm:col-span-2">
            <InfoRow 
              icon={Home} 
              label="Indirizzo" 
              value={formattedAddress} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Student-specific section
interface StudentSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly profile: any;
  readonly groups: ReadonlyArray<{ id?: string; name?: string; color?: string | null }>;
}

// Student-specific section
function StudentSection({ profile, groups }: StudentSectionProps) {
  if (!profile && groups.length === 0) return null;
  
  return (
    <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-4 sm:p-6`}>
      <h2 className={`text-base sm:text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
        <GraduationCap className="w-5 h-5" />
        Informazioni Studente
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {profile?.enrollmentDate && (
          <InfoRow 
            icon={Calendar} 
            label="Data Iscrizione" 
            value={new Date(profile.enrollmentDate).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })} 
          />
        )}
        {profile?.graduationYear && (
          <InfoRow 
            icon={GraduationCap} 
            label="Anno Previsto Diploma" 
            value={profile.graduationYear.toString()} 
          />
        )}
        {groups.length > 0 && (
          <div className="sm:col-span-2">
            <div className="flex items-start gap-3">
              <Users className={`w-5 h-5 ${colors.icon.secondary} mt-0.5 flex-shrink-0`} />
              <div className="min-w-0">
                <p className={`text-sm ${colors.text.muted}`}>Gruppi</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {groups.filter(g => g.id && g.name).map((group) => (
                    <span 
                      key={group.id}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium`}
                      style={{ 
                        backgroundColor: group.color ? `${group.color}20` : undefined,
                        color: group.color || undefined 
                      }}
                    >
                      {group.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Collaborator-specific section
interface CollaboratorSectionProps {
  readonly profile: { 
    hireDate?: Date; 
    specialization?: string | null;
    canManageQuestions?: boolean;
    canManageMaterials?: boolean;
    canViewStats?: boolean;
    canViewStudents?: boolean;
  } | null | undefined;
}

function CollaboratorSection({ profile }: CollaboratorSectionProps) {
  if (!profile) return null;
  
  const permissions = [
    { label: 'Gestione Domande', enabled: profile.canManageQuestions },
    { label: 'Gestione Materiali', enabled: profile.canManageMaterials },
    { label: 'Visualizza Statistiche', enabled: profile.canViewStats },
    { label: 'Visualizza Studenti', enabled: profile.canViewStudents },
  ].filter(p => p.enabled);
  
  return (
    <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-4 sm:p-6`}>
      <h2 className={`text-base sm:text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
        <Briefcase className="w-5 h-5" />
        Informazioni Collaboratore
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {profile.hireDate && (
          <InfoRow 
            icon={Calendar} 
            label="Data Assunzione" 
            value={new Date(profile.hireDate).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })} 
          />
        )}
        {profile.specialization && (
          <InfoRow 
            icon={Building2} 
            label="Specializzazione" 
            value={profile.specialization} 
          />
        )}
        {permissions.length > 0 && (
          <div className="sm:col-span-2">
            <div className="flex items-start gap-3">
              <Shield className={`w-5 h-5 ${colors.icon.secondary} mt-0.5 flex-shrink-0`} />
              <div className="min-w-0">
                <p className={`text-sm ${colors.text.muted}`}>Permessi</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {permissions.map((perm) => (
                    <span 
                      key={perm.label}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors.status.success.bgLight} ${colors.status.success.text}`}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {perm.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Admin section
function AdminSection() {
  return (
    <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-4 sm:p-6`}>
      <h2 className={`text-base sm:text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
        <Shield className="w-5 h-5" />
        Amministrazione
      </h2>
      <p className={`${colors.text.secondary}`}>
        Come amministratore hai accesso completo a tutte le funzionalità della piattaforma.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link 
          href="/utenti"
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm ${colors.primary.softBg} ${colors.primary.text} font-medium hover:opacity-80 transition-opacity`}
        >
          <Users className="w-4 h-4 mr-1.5" />
          Gestione Utenti
        </Link>
        <Link 
          href="/statistiche"
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm ${colors.primary.softBg} ${colors.primary.text} font-medium hover:opacity-80 transition-opacity`}
        >
          <Building2 className="w-4 h-4 mr-1.5" />
          Statistiche
        </Link>
      </div>
    </div>
  );
}

// Helper components
interface InfoRowProps {
  readonly icon: React.ComponentType<{ className?: string }>; 
  readonly label: string; 
  readonly value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`w-5 h-5 ${colors.icon.secondary} mt-0.5 flex-shrink-0`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${colors.text.muted}`}>{label}</p>
        <p className={`font-medium ${colors.text.primary} break-words`}>{value}</p>
      </div>
    </div>
  );
}

interface StatusCardProps {
  readonly label: string; 
  readonly value: string; 
  readonly status: 'success' | 'warning' | 'error';
  readonly icon: React.ComponentType<{ className?: string }>;
}

function StatusCard({ 
  label, 
  value, 
  status,
  icon: Icon
}: StatusCardProps) {
  const statusColors = {
    success: colors.status.success,
    warning: colors.status.warning,
    error: colors.status.error,
  };
  
  return (
    <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-3 sm:p-4`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${statusColors[status].text}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-xs sm:text-sm ${colors.text.muted}`}>{label}</p>
          <p className={`text-base sm:text-lg font-semibold ${statusColors[status].text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
