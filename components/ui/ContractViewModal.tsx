'use client';

import { colors } from '@/lib/theme/colors';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { FileText, X, Download } from 'lucide-react';

export interface ContractDetails {
  id: string;
  contentSnapshot: string;
  signatureData?: string | null;
  signedAt?: Date | string | null;
  assignedAt: Date | string;
  template: {
    name: string;
    price?: number | null;
  };
  student?: {
    user: {
      name: string;
      email: string;
    };
  };
}

interface ContractViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractDetails | null | undefined;
  isLoading?: boolean;
  onDownload?: () => void;
  title?: string;
  subtitle?: string;
}

/**
 * Reusable modal component for viewing signed contracts
 * Used in both student dashboard and admin panels
 */
export function ContractViewModal({
  isOpen,
  onClose,
  contract,
  isLoading = false,
  onDownload,
  title,
  subtitle = 'Contratto firmato',
}: ContractViewModalProps) {
  if (!isOpen) return null;

  const displayTitle = title || contract?.template.name || 'Contratto';

  return (
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
                {displayTitle}
              </h3>
              <p className={`text-sm ${colors.text.secondary}`}>{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : contract ? (
            <div className="space-y-6">
              {/* Contract Content - Always sanitized */}
              <div 
                className={`prose prose-sm max-w-none dark:prose-invert ${colors.text.primary}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(contract.contentSnapshot) }}
              />

              {/* Signature */}
              {contract.signatureData && (
                <div className={`border-t ${colors.border.primary} pt-6`}>
                  <h4 className={`font-semibold ${colors.text.primary} mb-4`}>
                    {contract.student ? 'Firma dello studente' : 'Firma'}
                  </h4>
                  <div className="p-4 rounded-xl bg-white inline-block border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={contract.signatureData} 
                      alt="Firma" 
                      className="max-w-[300px] h-auto"
                    />
                  </div>
                  {contract.signedAt && (
                    <p className={`mt-3 text-sm ${colors.text.secondary}`}>
                      Firmato il {new Date(contract.signedAt).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Meta Info */}
              <div className={`p-4 rounded-xl ${colors.background.secondary} text-sm`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className={colors.text.muted}>ID Contratto:</span>{' '}
                    <span className={`font-mono ${colors.text.secondary}`}>
                      {contract.id.slice(0, 8)}...
                    </span>
                  </div>
                  <div>
                    <span className={colors.text.muted}>Assegnato il:</span>{' '}
                    <span className={colors.text.secondary}>
                      {new Date(contract.assignedAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  {contract.student && (
                    <div>
                      <span className={colors.text.muted}>Email studente:</span>{' '}
                      <span className={colors.text.secondary}>
                        {contract.student.user.email}
                      </span>
                    </div>
                  )}
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
            onClick={onClose}
            className={`px-4 py-2 rounded-xl ${colors.background.secondary} ${colors.text.primary} font-medium`}
          >
            Chiudi
          </button>
          {onDownload && (
            <button
              onClick={onDownload}
              disabled={!contract}
              className={`px-4 py-2 rounded-xl ${colors.primary.gradient} text-white font-medium flex items-center gap-2 disabled:opacity-50`}
            >
              <Download className="w-4 h-4" />
              Scarica PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContractViewModal;
