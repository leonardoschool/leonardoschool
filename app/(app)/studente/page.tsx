'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { auth } from '@/lib/firebase/config';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import {
  User,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  PenTool,
  BookOpen,
  BarChart3,
  Settings,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ExternalLink,
  Shield,
  Download,
  Eye,
  X,
  FolderOpen,
} from 'lucide-react';
import Link from 'next/link';

type ContractStatus = 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED';

export default function StudentDashboard() {
  const [showContractModal, setShowContractModal] = useState(false);

  // Get current user
  const { data: user, isLoading: userLoading, error: userError } = trpc.auth.me.useQuery();

  // Get student's contract - only if user is a student with student data
  const { data: contract } = trpc.contracts.getMyContract.useQuery(
    undefined,
    { 
      enabled: !!user?.student,
      retry: false, // Don't retry on error
    }
  );

  // Get signed contract details when modal is opened
  const { data: signedContractDetails, isLoading: signedContractLoading } = trpc.contracts.getSignedContract.useQuery(
    { contractId: contract?.id || '' },
    {
      enabled: !!contract?.id && contract?.status === 'SIGNED' && showContractModal,
    }
  );

  // Handle error or no user - sign out and redirect to login
  useEffect(() => {
    if (userError || (!userLoading && !user)) {
      // User not found or auth error - sign out from Firebase and redirect to login
      const handleLogout = async () => {
        try {
          await auth.signOut();
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
          console.error('Logout error:', e);
        } finally {
          window.location.href = '/auth/login';
        }
      };
      handleLogout();
    }
  }, [userError, userLoading, user]);

  const handleDownloadContract = () => {
    if (!signedContractDetails) return;

    // Generate HTML content for PDF
    const logoUrl = `${window.location.origin}/images/NEW_LOGO_2026/Logo_sito.png`;
    const studentName = signedContractDetails.student.user.name.replace(/\s+/g, '_');
    const contractName = signedContractDetails.template.name.replace(/\s+/g, '_');
    const fileName = `Contratto_${contractName}_${studentName}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${fileName}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo-container { background: #8B1A1A; padding: 20px 40px; border-radius: 8px; margin-bottom: 20px; }
          .logo-container img { max-width: 300px; height: auto; }
          h1 { text-align: center; color: #333; margin: 0; font-size: 24px; padding-top: 15px; border-top: 2px solid #8B1A1A; }
          .contract-content { margin: 30px 0; text-align: justify; }
          .signature-section { margin-top: 50px; page-break-inside: avoid; }
          .signature-image { max-width: 200px; height: auto; border-bottom: 1px solid #333; background: white; padding: 10px; }
          .meta-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 30px; font-size: 12px; }
          .meta-info p { margin: 5px 0; }
          @media print { 
            body { padding: 20px; }
            .logo-container { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <img src="${logoUrl}" alt="Leonardo School" />
          </div>
          <h1>${signedContractDetails.template.name}</h1>
        </div>
        <div class="contract-content">
          ${sanitizeHtml(signedContractDetails.contentSnapshot)}
        </div>
        <div class="signature-section">
          <p><strong>Firma dello studente:</strong></p>
          ${signedContractDetails.signatureData ? `<img src="${signedContractDetails.signatureData}" alt="Firma" class="signature-image" />` : '<p>-</p>'}
          <p><strong>Nome:</strong> ${signedContractDetails.student.user.name}</p>
          <p><strong>Data firma:</strong> ${signedContractDetails.signedAt ? new Date(signedContractDetails.signedAt).toLocaleString('it-IT') : '-'}</p>
        </div>
        <div class="meta-info">
          <p><strong>ID Contratto:</strong> ${signedContractDetails.id}</p>
          <p><strong>Data assegnazione:</strong> ${new Date(signedContractDetails.assignedAt).toLocaleString('it-IT')}</p>
          <p><strong>Email studente:</strong> ${signedContractDetails.student.user.email}</p>
        </div>
      </body>
      </html>
    `;

    // Create blob and open print dialog
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
  };

  const getAccountStatusInfo = () => {
    if (!user) return null;

    // Account attivo e contratto firmato
    if (user.isActive && contract?.status === 'SIGNED') {
      return {
        icon: CheckCircle,
        title: 'Account Attivo',
        description: 'Il tuo account è attivo e puoi accedere a tutti i servizi',
        color: 'success' as const,
        showContract: false,
      };
    }

    // Contratto firmato, in attesa di attivazione
    if (contract?.status === 'SIGNED' && !user.isActive) {
      return {
        icon: Clock,
        title: 'In Attesa di Attivazione',
        description: 'Hai firmato il contratto. Il tuo account verrà attivato a breve dall\'amministrazione.',
        color: 'warning' as const,
        showContract: true,
      };
    }

    // Contratto da firmare
    if (contract?.status === 'PENDING') {
      return {
        icon: PenTool,
        title: 'Contratto da Firmare',
        description: 'Ti è stato assegnato un contratto. Firmalo per completare l\'iscrizione.',
        color: 'info' as const,
        showContract: true,
      };
    }

    // Nessun contratto assegnato
    if (!contract) {
      return {
        icon: Clock,
        title: 'In Attesa di Contratto',
        description: 'Il tuo profilo è completo. L\'amministrazione ti assegnerà presto un contratto.',
        color: 'warning' as const,
        showContract: false,
      };
    }

    return null;
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Da Firmare',
          className: `${colors.status.warning.softBg} ${colors.status.warning.text}`,
        };
      case 'SIGNED':
        return {
          label: 'Firmato',
          className: `${colors.status.success.softBg} ${colors.status.success.text}`,
        };
      case 'EXPIRED':
        return {
          label: 'Scaduto',
          className: `${colors.status.error.softBg} ${colors.status.error.text}`,
        };
      case 'CANCELLED':
        return {
          label: 'Annullato',
          className: `${colors.status.error.softBg} ${colors.status.error.text}`,
        };
      default:
        return {
          label: status,
          className: `${colors.background.secondary} ${colors.text.secondary}`,
        };
    }
  };

  // Only show loading for user query, contract can load in background
  const isLoading = userLoading;

  // Handle loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen ${colors.background.primary} flex items-center justify-center`}>
        <div className="text-center">
          <Spinner size="lg" />
          <p className={`mt-4 ${colors.text.secondary}`}>Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className={`min-h-screen ${colors.background.primary} flex items-center justify-center`}>
        <div className="text-center">
          <Spinner size="lg" />
          <p className={`mt-4 ${colors.text.secondary}`}>Reindirizzamento al login...</p>
        </div>
      </div>
    );
  }

  const statusInfo = getAccountStatusInfo();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary} flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl ${colors.primary.bg} flex items-center justify-center`}>
              <User className="w-5 h-5 text-white" />
            </div>
            Dashboard
          </h1>
          <p className={`mt-2 ${colors.text.secondary}`}>
            Benvenuto, <span className="font-medium">{user?.name}</span>!
          </p>
        </div>
      </div>

      {/* Status Alert */}
      {statusInfo && (
        <div className={`rounded-2xl p-6 border ${
          statusInfo.color === 'success' ? `${colors.status.success.bgLight} ${colors.status.success.border}` :
          statusInfo.color === 'warning' ? `${colors.status.warning.bgLight} ${colors.status.warning.border}` :
          statusInfo.color === 'info' ? `${colors.status.info.bgLight} ${colors.status.info.border}` :
          `${colors.status.error.bgLight} ${colors.status.error.border}`
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              statusInfo.color === 'success' ? colors.status.success.softBg :
              statusInfo.color === 'warning' ? colors.status.warning.softBg :
              statusInfo.color === 'info' ? colors.status.info.softBg :
              colors.status.error.softBg
            }`}>
              <statusInfo.icon className={`w-6 h-6 ${
                statusInfo.color === 'success' ? colors.status.success.text :
                statusInfo.color === 'warning' ? colors.status.warning.text :
                statusInfo.color === 'info' ? colors.status.info.text :
                colors.status.error.text
              }`} />
            </div>
            <div className="flex-1">
              <h2 className={`text-lg font-semibold ${
                statusInfo.color === 'success' ? colors.status.success.text :
                statusInfo.color === 'warning' ? colors.status.warning.text :
                statusInfo.color === 'info' ? colors.status.info.text :
                colors.status.error.text
              }`}>
                {statusInfo.title}
              </h2>
              <p className={`mt-1 ${colors.text.secondary}`}>
                {statusInfo.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contract Section */}
      {contract && (
        <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.xl} overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${colors.border.primary} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colors.primary.bg} flex items-center justify-center`}>
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h2 className={`font-semibold ${colors.text.primary}`}>Il Tuo Contratto</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(contract.status as ContractStatus).className}`}>
              {getStatusBadge(contract.status as ContractStatus).label}
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Contract Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                <p className={`text-sm ${colors.text.muted} mb-1`}>Corso</p>
                <p className={`font-semibold ${colors.text.primary}`}>{contract.template?.name}</p>
              </div>
              
              {contract.template?.price && (
                <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                  <p className={`text-sm ${colors.text.muted} mb-1`}>Importo</p>
                  <p className={`font-semibold ${colors.text.primary}`}>
                    {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(contract.template.price)}
                  </p>
                </div>
              )}
              
              {contract.template?.duration && (
                <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                  <p className={`text-sm ${colors.text.muted} mb-1`}>Durata</p>
                  <p className={`font-semibold ${colors.text.primary}`}>{contract.template.duration}</p>
                </div>
              )}

              <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                <p className={`text-sm ${colors.text.muted} mb-1`}>Assegnato il</p>
                <p className={`font-semibold ${colors.text.primary}`}>
                  {new Date(contract.assignedAt).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Description */}
            {contract.template?.description && (
              <p className={colors.text.secondary}>{contract.template.description}</p>
            )}

            {/* Expiration Warning */}
            {contract.status === 'PENDING' && contract.expiresAt && (
              <div className={`p-4 rounded-xl ${colors.status.warning.softBg} border ${colors.status.warning.border}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${colors.status.warning.text}`} />
                  <p className={`font-medium ${colors.status.warning.text}`}>
                    Scadenza firma: {new Date(contract.expiresAt).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Signed Info */}
            {contract.status === 'SIGNED' && contract.signedAt && (
              <div className={`p-4 rounded-xl ${colors.status.success.softBg} border ${colors.status.success.border}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-5 h-5 ${colors.status.success.text}`} />
                  <p className={`font-medium ${colors.status.success.text}`}>
                    Firmato il {new Date(contract.signedAt).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            {contract.status === 'PENDING' && contract.signToken && (
              <div className={`pt-4 border-t ${colors.border.primary}`}>
                <a
                  href={`/contratto/${contract.signToken}`}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl ${colors.primary.gradient} text-white font-medium shadow-lg hover:shadow-xl transition-all`}
                >
                  <PenTool className="w-5 h-5" />
                  Visualizza e Firma Contratto
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* View/Download Signed Contract */}
            {contract.status === 'SIGNED' && (
              <div className={`pt-4 border-t ${colors.border.primary}`}>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowContractModal(true)}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl ${colors.primary.gradient} text-white font-medium shadow-lg hover:shadow-xl transition-all`}
                  >
                    <Eye className="w-5 h-5" />
                    Visualizza Contratto
                  </button>
                  <button
                    onClick={() => {
                      setShowContractModal(true);
                      // Small delay to ensure contract is loaded
                      setTimeout(() => {
                        if (signedContractDetails) {
                          handleDownloadContract();
                        }
                      }, 500);
                    }}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-red-600 text-red-600 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-all`}
                  >
                    <Download className="w-5 h-5" />
                    Scarica PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Info Card */}
      <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.xl} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${colors.border.primary}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${colors.primary.bg} flex items-center justify-center`}>
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className={`font-semibold ${colors.text.primary}`}>I Tuoi Dati</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className={`w-5 h-5 ${colors.text.muted}`} />
                <div>
                  <p className={`text-sm ${colors.text.muted}`}>Email</p>
                  <p className={`font-medium ${colors.text.primary}`}>{user?.email}</p>
                </div>
              </div>
              
              {user?.student?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className={`w-5 h-5 ${colors.text.muted}`} />
                  <div>
                    <p className={`text-sm ${colors.text.muted}`}>Telefono</p>
                    <p className={`font-medium ${colors.text.primary}`}>{user.student.phone}</p>
                  </div>
                </div>
              )}
              
              {user?.student?.fiscalCode && (
                <div className="flex items-center gap-3">
                  <CreditCard className={`w-5 h-5 ${colors.text.muted}`} />
                  <div>
                    <p className={`text-sm ${colors.text.muted}`}>Codice Fiscale</p>
                    <p className={`font-medium ${colors.text.primary} font-mono`}>{user.student.fiscalCode}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {user?.student?.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 ${colors.text.muted}`} />
                  <div>
                    <p className={`text-sm ${colors.text.muted}`}>Data di Nascita</p>
                    <p className={`font-medium ${colors.text.primary}`}>
                      {new Date(user.student.dateOfBirth).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
              
              {user?.student?.address && (
                <div className="flex items-center gap-3">
                  <MapPin className={`w-5 h-5 ${colors.text.muted}`} />
                  <div>
                    <p className={`text-sm ${colors.text.muted}`}>Indirizzo</p>
                    <p className={`font-medium ${colors.text.primary}`}>
                      {user.student.address}, {user.student.postalCode} {user.student.city} ({user.student.province})
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions (only if active) */}
      {user?.isActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.lg} p-6 hover:shadow-xl transition-shadow cursor-pointer group`}>
            <div className={`w-12 h-12 rounded-xl ${colors.subjects.biologia.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className={`font-semibold ${colors.text.primary} mb-1`}>Simulazioni</h3>
            <p className={`text-sm ${colors.text.secondary}`}>Inizia una nuova simulazione d&apos;esame</p>
          </div>

          <Link href="/studente/materiali" className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.lg} p-6 hover:shadow-xl transition-shadow cursor-pointer group`}>
            <div className={`w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className={`font-semibold ${colors.text.primary} mb-1`}>Materiale Didattico</h3>
            <p className={`text-sm ${colors.text.secondary}`}>PDF, video e risorse per studiare</p>
          </Link>

          <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.lg} p-6 hover:shadow-xl transition-shadow cursor-pointer group`}>
            <div className={`w-12 h-12 rounded-xl ${colors.subjects.matematica.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className={`font-semibold ${colors.text.primary} mb-1`}>Statistiche</h3>
            <p className={`text-sm ${colors.text.secondary}`}>Analizza le tue performance</p>
          </div>

          <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.lg} p-6 hover:shadow-xl transition-shadow cursor-pointer group`}>
            <div className={`w-12 h-12 rounded-xl ${colors.subjects.chimica.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h3 className={`font-semibold ${colors.text.primary} mb-1`}>Impostazioni</h3>
            <p className={`text-sm ${colors.text.secondary}`}>Gestisci il tuo profilo</p>
          </div>
        </div>
      )}

      {/* Account Status Footer */}
      <div className={`text-center py-4 border-t ${colors.border.primary}`}>
        <div className="flex items-center justify-center gap-2">
          <Shield className={`w-4 h-4 ${user?.isActive ? colors.status.success.text : colors.text.muted}`} />
          <span className={`text-sm ${colors.text.muted}`}>
            Stato account: {' '}
            <span className={`font-medium ${user?.isActive ? colors.status.success.text : colors.status.warning.text}`}>
              {user?.isActive ? 'Attivo' : 'In attesa di attivazione'}
            </span>
          </span>
        </div>
      </div>

      {/* Contract View Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${colors.background.card} rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b ${colors.border.primary} flex items-center justify-between flex-shrink-0`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${colors.status.success.softBg} flex items-center justify-center`}>
                  <FileText className={`w-5 h-5 ${colors.status.success.text}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${colors.text.primary}`}>
                    {signedContractDetails?.template.name || 'Contratto'}
                  </h3>
                  <p className={`text-sm ${colors.text.secondary}`}>Contratto firmato</p>
                </div>
              </div>
              <button
                onClick={() => setShowContractModal(false)}
                className={`p-2 rounded-lg hover:${colors.background.secondary} transition-colors text-gray-600 dark:text-gray-400`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {signedContractLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="md" />
                </div>
              ) : signedContractDetails ? (
                <div className="space-y-6">
                  {/* Contract Content */}
                  <div 
                    className={`prose prose-sm max-w-none dark:prose-invert ${colors.text.primary}`}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(signedContractDetails.contentSnapshot) }}
                  />

                  {/* Signature */}
                  {signedContractDetails.signatureData && (
                    <div className={`border-t ${colors.border.primary} pt-6`}>
                      <h4 className={`font-semibold ${colors.text.primary} mb-4`}>Firma</h4>
                      <div className="p-4 rounded-xl bg-white inline-block border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={signedContractDetails.signatureData} 
                          alt="Firma" 
                          className="max-w-[300px] h-auto"
                        />
                      </div>
                      <p className={`mt-3 text-sm ${colors.text.secondary}`}>
                        Firmato il {new Date(signedContractDetails.signedAt!).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className={`p-4 rounded-xl ${colors.background.secondary} text-sm`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className={colors.text.muted}>ID Contratto:</span>{' '}
                        <span className={`font-mono ${colors.text.secondary}`}>{signedContractDetails.id.slice(0, 8)}...</span>
                      </div>
                      <div>
                        <span className={colors.text.muted}>Assegnato il:</span>{' '}
                        <span className={colors.text.secondary}>
                          {new Date(signedContractDetails.assignedAt).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={colors.text.secondary}>Impossibile caricare il contratto</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t ${colors.border.primary} flex justify-end gap-3 flex-shrink-0`}>
              <button
                onClick={() => setShowContractModal(false)}
                className={`px-4 py-2 rounded-xl ${colors.background.secondary} font-medium`}
              >
                Chiudi
              </button>
              <button
                onClick={handleDownloadContract}
                disabled={!signedContractDetails}
                className={`px-4 py-2 rounded-xl ${colors.primary.gradient} text-white font-medium flex items-center gap-2 disabled:opacity-50`}
              >
                <Download className="w-4 h-4" />
                Scarica PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
