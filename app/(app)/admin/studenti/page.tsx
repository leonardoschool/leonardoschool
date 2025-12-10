'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  UserCheck,
  UserX,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  Download,
  X,
} from 'lucide-react';

type StudentStatus = 'all' | 'active' | 'inactive' | 'pending_profile' | 'pending_contract' | 'pending_activation';

const statusOptions: { value: StudentStatus; label: string; color: string }[] = [
  { value: 'all', label: 'Tutti', color: colors.neutral.gray500 },
  { value: 'pending_profile', label: 'In attesa profilo', color: colors.status.warning.text },
  { value: 'pending_contract', label: 'In attesa contratto', color: colors.status.info.text },
  { value: 'pending_activation', label: 'In attesa attivazione', color: colors.status.warning.text },
  { value: 'active', label: 'Attivi', color: colors.status.success.text },
  { value: 'inactive', label: 'Disattivati', color: colors.status.error.text },
];

export default function StudentsManagementPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StudentStatus>('all');
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [viewContractId, setViewContractId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Fetch students
  const { data: studentsData, isLoading } = trpc.contracts.getAllStudents.useQuery({
    search: search || undefined,
    status,
    page,
    limit: 10,
  });

  // Fetch contract templates
  const { data: templates } = trpc.contracts.getTemplates.useQuery();

  // Fetch signed contract details when viewing
  const { data: viewContract, isLoading: viewContractLoading } = trpc.contracts.getSignedContractAdmin.useQuery(
    { contractId: viewContractId || '' },
    { enabled: !!viewContractId }
  );

  // Mutations
  const assignContractMutation = trpc.contracts.assignContract.useMutation({
    onSuccess: () => {
      utils.contracts.getAllStudents.invalidate();
      setShowAssignModal(false);
      setSelectedStudent(null);
      setSelectedTemplate(null);
    },
  });

  const activateStudentMutation = trpc.contracts.activateStudent.useMutation({
    onSuccess: () => {
      utils.contracts.getAllStudents.invalidate();
    },
  });

  const deactivateStudentMutation = trpc.contracts.deactivateStudent.useMutation({
    onSuccess: () => {
      utils.contracts.getAllStudents.invalidate();
    },
  });

  const getStudentStatus = (student: any) => {
    if (student.user.isActive) {
      return { label: 'Attivo', color: colors.status.success.text, bg: colors.status.success.softBg };
    }
    if (!student.user.profileCompleted) {
      return { label: 'Profilo incompleto', color: colors.status.warning.text, bg: colors.status.warning.softBg };
    }
    if (student.contracts?.length > 0) {
      const lastContract = student.contracts[0];
      if (lastContract.status === 'PENDING') {
        return { label: 'Attesa firma', color: colors.status.info.text, bg: colors.status.info.softBg };
      }
      if (lastContract.status === 'SIGNED') {
        return { label: 'Attesa attivazione', color: colors.status.warning.text, bg: colors.status.warning.softBg };
      }
    }
    return { label: 'Attesa contratto', color: colors.neutral.gray500, bg: colors.neutral.gray100 };
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const handleAssignContract = () => {
    if (!selectedStudent || !selectedTemplate) return;
    assignContractMutation.mutate({
      studentId: selectedStudent,
      templateId: selectedTemplate,
      expiresInDays: 7,
    });
  };

  const handleActivate = (studentId: string, skipContract: boolean = false) => {
    activateStudentMutation.mutate({ studentId, skipContractCheck: skipContract });
  };

  const handleDeactivate = (studentId: string) => {
    deactivateStudentMutation.mutate({ studentId });
  };

  const handleDownloadContract = () => {
    if (!viewContract) return;

    const logoUrl = `${window.location.origin}/images/NEW_LOGO_2026/Logo_sito.png`;
    const studentName = viewContract.student.user.name.replace(/\s+/g, '_');
    const contractName = viewContract.template.name.replace(/\s+/g, '_');
    const fileName = `Contratto_${contractName}_${studentName}.pdf`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Contratto - ${viewContract.template.name} - ${viewContract.student.user.name}</title>
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
          <h1>${viewContract.template.name}</h1>
        </div>
        <div class="contract-content">
          ${viewContract.contentSnapshot}
        </div>
        <div class="signature-section">
          <p><strong>Firma dello studente:</strong></p>
          ${viewContract.signatureData ? `<img src="${viewContract.signatureData}" alt="Firma" class="signature-image" />` : '<p>-</p>'}
          <p><strong>Nome:</strong> ${viewContract.student.user.name}</p>
          <p><strong>Data firma:</strong> ${viewContract.signedAt ? new Date(viewContract.signedAt).toLocaleString('it-IT') : '-'}</p>
        </div>
        <div class="meta-info">
          <p><strong>ID Contratto:</strong> ${viewContract.id}</p>
          <p><strong>Data assegnazione:</strong> ${new Date(viewContract.assignedAt).toLocaleString('it-IT')}</p>
          <p><strong>Email studente:</strong> ${viewContract.student.user.email}</p>
        </div>
        <script>
          // Set document title for PDF filename
          document.title = '${fileName.replace('.pdf', '')}';
        </script>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8" />
            Gestione Studenti
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Visualizza, gestisci contratti e attiva gli account degli studenti
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
            <input
              type="text"
              placeholder="Cerca per nome, email o codice fiscale..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
            />
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setStatus(option.value);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === option.value
                    ? `${colors.primary.gradient} text-white`
                    : `${colors.background.secondary} hover:${colors.background.tertiary}`
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center`}>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className={`text-sm ${colors.text.secondary}`}>Totale</p>
              <p className="text-xl font-bold">{studentsData?.pagination.total || 0}</p>
            </div>
          </div>
        </div>
        <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${colors.status.success.softBg} flex items-center justify-center`}>
              <CheckCircle className={`w-5 h-5 ${colors.status.success.text}`} />
            </div>
            <div>
              <p className={`text-sm ${colors.text.secondary}`}>Attivi</p>
              <p className="text-xl font-bold text-green-600">-</p>
            </div>
          </div>
        </div>
        <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${colors.status.warning.softBg} flex items-center justify-center`}>
              <Clock className={`w-5 h-5 ${colors.status.warning.text}`} />
            </div>
            <div>
              <p className={`text-sm ${colors.text.secondary}`}>In attesa</p>
              <p className="text-xl font-bold text-amber-600">-</p>
            </div>
          </div>
        </div>
        <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${colors.status.info.softBg} flex items-center justify-center`}>
              <FileText className={`w-5 h-5 ${colors.status.info.text}`} />
            </div>
            <div>
              <p className={`text-sm ${colors.text.secondary}`}>Da firmare</p>
              <p className="text-xl font-bold text-blue-600">-</p>
            </div>
          </div>
        </div>
        <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${colors.status.error.softBg} flex items-center justify-center`}>
              <AlertTriangle className={`w-5 h-5 ${colors.status.error.text}`} />
            </div>
            <div>
              <p className={`text-sm ${colors.text.secondary}`}>Da attivare</p>
              <p className="text-xl font-bold text-red-600">-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className={`${colors.background.card} rounded-xl shadow-sm overflow-hidden`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <div className={`w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto`}></div>
            <p className={`mt-4 ${colors.text.secondary}`}>Caricamento studenti...</p>
          </div>
        ) : !studentsData?.students.length ? (
          <div className="p-12 text-center">
            <Users className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
            <p className={colors.text.secondary}>Nessuno studente trovato</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${colors.background.secondary} border-b ${colors.border.primary}`}>
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold text-sm">Studente</th>
                    <th className="text-left px-6 py-4 font-semibold text-sm">Contatto</th>
                    <th className="text-left px-6 py-4 font-semibold text-sm">Registrazione</th>
                    <th className="text-left px-6 py-4 font-semibold text-sm">Contratto</th>
                    <th className="text-left px-6 py-4 font-semibold text-sm">Stato</th>
                    <th className="text-right px-6 py-4 font-semibold text-sm">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsData.students.map((student) => {
                    const statusInfo = getStudentStatus(student);
                    const contract = student.contracts?.[0];

                    return (
                      <tr key={student.id} className={`border-b ${colors.border.primary} hover:${colors.background.secondary} transition-colors`}>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{student.user.name}</p>
                            <p className={`text-sm ${colors.text.secondary}`}>{student.fiscalCode || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4" />
                              <span>{student.user.email}</span>
                            </div>
                            {student.phone && (
                              <div className={`flex items-center gap-2 text-sm ${colors.text.secondary}`}>
                                <Phone className="w-4 h-4" />
                                <span>{student.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(student.user.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {contract ? (
                            <div className="text-sm">
                              <p className="font-medium">{contract.template?.name}</p>
                              <p className={colors.text.secondary}>
                                {contract.status === 'PENDING' ? 'In attesa firma' : 
                                 contract.status === 'SIGNED' ? 'Firmato' : contract.status}
                              </p>
                            </div>
                          ) : (
                            <span className={`text-sm ${colors.text.muted}`}>-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg}`} style={{ color: statusInfo.color }}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Signed Contract Button */}
                            {contract?.status === 'SIGNED' && (
                              <button
                                onClick={() => setViewContractId(contract.id)}
                                className={`p-2 rounded-lg ${colors.status.success.softBg} ${colors.status.success.text} hover:opacity-80 transition-opacity`}
                                title="Visualizza contratto firmato"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {/* Assign Contract Button */}
                            {student.user.profileCompleted && !contract && (
                              <button
                                onClick={() => {
                                  setSelectedStudent(student.id);
                                  setShowAssignModal(true);
                                }}
                                className={`p-2 rounded-lg ${colors.status.info.softBg} ${colors.status.info.text} hover:opacity-80 transition-opacity`}
                                title="Assegna contratto"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {/* Activate Button */}
                            {!student.user.isActive && student.user.profileCompleted && (
                              <button
                                onClick={() => handleActivate(student.id, !contract)}
                                disabled={activateStudentMutation.isPending}
                                className={`p-2 rounded-lg ${colors.status.success.softBg} ${colors.status.success.text} hover:opacity-80 transition-opacity`}
                                title="Attiva account"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                            {/* Deactivate Button */}
                            {student.user.isActive && (
                              <button
                                onClick={() => handleDeactivate(student.id)}
                                disabled={deactivateStudentMutation.isPending}
                                className={`p-2 rounded-lg ${colors.status.error.softBg} ${colors.status.error.text} hover:opacity-80 transition-opacity`}
                                title="Disattiva account"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {studentsData.pagination.totalPages > 1 && (
              <div className={`px-6 py-4 border-t ${colors.border.primary} flex items-center justify-between`}>
                <p className={`text-sm ${colors.text.secondary}`}>
                  Pagina {studentsData.pagination.page} di {studentsData.pagination.totalPages}
                  {' '}({studentsData.pagination.total} studenti)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`p-2 rounded-lg ${colors.background.secondary} disabled:opacity-50 disabled:cursor-not-allowed hover:${colors.background.tertiary}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(studentsData.pagination.totalPages, p + 1))}
                    disabled={page === studentsData.pagination.totalPages}
                    className={`p-2 rounded-lg ${colors.background.secondary} disabled:opacity-50 disabled:cursor-not-allowed hover:${colors.background.tertiary}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign Contract Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${colors.background.card} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
            <h3 className="text-xl font-bold mb-4">Assegna Contratto</h3>
            <p className={`${colors.text.secondary} mb-6`}>
              Seleziona il template del contratto da assegnare allo studente.
            </p>

            <div className="space-y-3 mb-6">
              {templates?.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
                    selectedTemplate === template.id
                      ? `border-red-500 ${colors.primary.softBg}`
                      : `${colors.border.primary} hover:border-red-300`
                  }`}
                >
                  <p className="font-semibold">{template.name}</p>
                  {template.description && (
                    <p className={`text-sm ${colors.text.secondary} mt-1`}>{template.description}</p>
                  )}
                  {template.price && (
                    <p className={`text-sm font-medium ${colors.primary.text} mt-2`}>
                      {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(template.price)}
                    </p>
                  )}
                </button>
              ))}

              {!templates?.length && (
                <p className={`text-center py-8 ${colors.text.muted}`}>
                  Nessun template disponibile. Crea prima un template contratto.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStudent(null);
                  setSelectedTemplate(null);
                }}
                className={`flex-1 px-4 py-3 rounded-xl ${colors.background.secondary} font-medium`}
              >
                Annulla
              </button>
              <button
                onClick={handleAssignContract}
                disabled={!selectedTemplate || assignContractMutation.isPending}
                className={`flex-1 px-4 py-3 rounded-xl ${colors.primary.gradient} text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {assignContractMutation.isPending ? 'Invio...' : 'Assegna e Invia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Contract Modal */}
      {viewContractId && (
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
                    {viewContract?.template.name || 'Contratto'}
                  </h3>
                  <p className={`text-sm ${colors.text.secondary}`}>
                    {viewContract?.student.user.name} - {viewContract?.student.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewContractId(null)}
                className={`p-2 rounded-lg hover:${colors.background.secondary} transition-colors`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {viewContractLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : viewContract ? (
                <div className="space-y-6">
                  {/* Contract Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                      <p className={`text-sm ${colors.text.muted} mb-1`}>Stato</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        viewContract.status === 'SIGNED' 
                          ? `${colors.status.success.softBg} ${colors.status.success.text}`
                          : viewContract.status === 'PENDING'
                          ? `${colors.status.warning.softBg} ${colors.status.warning.text}`
                          : `${colors.status.error.softBg} ${colors.status.error.text}`
                      }`}>
                        {viewContract.status === 'SIGNED' ? 'Firmato' : 
                         viewContract.status === 'PENDING' ? 'In attesa' : viewContract.status}
                      </span>
                    </div>
                    <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                      <p className={`text-sm ${colors.text.muted} mb-1`}>Assegnato il</p>
                      <p className={`font-semibold ${colors.text.primary}`}>
                        {new Date(viewContract.assignedAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    {viewContract.signedAt && (
                      <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
                        <p className={`text-sm ${colors.text.muted} mb-1`}>Firmato il</p>
                        <p className={`font-semibold ${colors.text.primary}`}>
                          {new Date(viewContract.signedAt).toLocaleString('it-IT')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Contract Content */}
                  <div className={`border ${colors.border.primary} rounded-xl p-6`}>
                    <div 
                      className={`prose prose-sm max-w-none dark:prose-invert ${colors.text.primary}`}
                      dangerouslySetInnerHTML={{ __html: viewContract.contentSnapshot }}
                    />
                  </div>

                  {/* Signature */}
                  {viewContract.signatureData && (
                    <div className={`border-t ${colors.border.primary} pt-6`}>
                      <h4 className={`font-semibold ${colors.text.primary} mb-4`}>Firma dello studente</h4>
                      <div className="p-4 rounded-xl bg-white inline-block border border-gray-200">
                        <img 
                          src={viewContract.signatureData} 
                          alt="Firma" 
                          className="max-w-[300px] h-auto"
                        />
                      </div>
                    </div>
                  )}

                  {/* Admin Notes */}
                  {viewContract.adminNotes && (
                    <div className={`p-4 rounded-xl ${colors.status.info.softBg} border ${colors.status.info.border}`}>
                      <p className={`text-sm font-medium ${colors.status.info.text} mb-1`}>Note admin:</p>
                      <p className={colors.text.secondary}>{viewContract.adminNotes}</p>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className={`p-4 rounded-xl ${colors.background.secondary} text-sm`}>
                    <p className={colors.text.muted}>
                      ID Contratto: <span className={`font-mono ${colors.text.secondary}`}>{viewContract.id}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className={colors.text.secondary}>Impossibile caricare il contratto</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t ${colors.border.primary} flex justify-end gap-3 flex-shrink-0`}>
              <button
                onClick={() => setViewContractId(null)}
                className={`px-4 py-2 rounded-xl ${colors.background.secondary} font-medium`}
              >
                Chiudi
              </button>
              <button
                onClick={handleDownloadContract}
                disabled={!viewContract}
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
