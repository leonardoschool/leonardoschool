'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase/config';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import Preloader from '@/components/ui/Preloader';
import { ButtonLoader } from '@/components/ui/loaders';
import Checkbox from '@/components/ui/Checkbox';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { useToast } from '@/components/ui/Toast';
import { parseError } from '@/lib/utils/errorHandler';
import { 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Calendar, 
  Euro, 
  Pen,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Download
} from 'lucide-react';

export default function ContractSignPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { showSuccess, showError } = useToast();

  // Canvas per la firma
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lineWidth] = useState(2);

  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch contract by token
  const { data: contract, isLoading, error: fetchError } = trpc.contracts.getContractByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  // Sign mutation
  const signMutation = trpc.contracts.signContract.useMutation({
    onSuccess: async () => {
      setSuccess(true);
      showSuccess('Contratto firmato', 'Il contratto è stato firmato con successo!');
      
      // Sync auth cookies to clear the pending-contract cookie
      const user = auth.currentUser;
      if (user) {
        try {
          const firebaseToken = await user.getIdToken();
          await fetch('/api/auth/me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: firebaseToken }),
            cache: 'no-store',
          });
        } catch (error) {
          console.error('[ContractSign] Failed to sync auth cookies:', error);
        }
      }
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    },
    onError: (err) => {
      const parsed = parseError(err);
      setError(parsed.message);
      showError(parsed.title, parsed.message);
      setSigning(false);
    },
  });

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup canvas
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [lineWidth]);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x, y;
    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x, y;
    if ('touches' in e) {
      e.preventDefault();
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getSignatureData = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;

    return canvas.toDataURL('image/png');
  };

  // Funzione per scaricare il contratto come PDF/HTML
  const handleDownloadPDF = async () => {
    if (!contract) return;

    const contractName = contract.template?.name || 'Contratto';
    const contractPrice = contract.template?.price 
      ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(contract.template.price)
      : '-';
    const contractDuration = contract.template?.duration || '-';

    // Generate HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${contractName}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
            color: #1f2937;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #9f1239;
          }
          .header h1 {
            color: #9f1239;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .header p {
            color: #6b7280;
            margin: 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .info-box {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .info-box label {
            font-size: 12px;
            color: #6b7280;
            display: block;
            margin-bottom: 5px;
          }
          .info-box span {
            font-weight: 600;
            font-size: 16px;
          }
          .content {
            margin-bottom: 30px;
          }
          .content h2 {
            font-size: 18px;
            color: #374151;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${contractName}</h1>
          <p>${contract.template?.description || 'Contratto di collaborazione'}</p>
        </div>
        <div class="info-grid">
          <div class="info-box">
            <label>Importo</label>
            <span>${contractPrice}</span>
          </div>
          <div class="info-box">
            <label>Durata</label>
            <span>${contractDuration}</span>
          </div>
          <div class="info-box">
            <label>Data</label>
            <span>${new Date().toLocaleDateString('it-IT')}</span>
          </div>
        </div>
        <div class="content">
          <h2>Termini e Condizioni</h2>
          ${sanitizeHtml(contract.contentSnapshot)}
        </div>
        <div class="footer">
          <p>Documento generato da Leonardo School - ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
      </body>
      </html>
    `;

    // Create a blob from the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contractName.replace(/\s+/g, '_')}_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSign = async () => {
    if (!contract || !acceptedTerms || !hasSignature) return;

    const signatureData = getSignatureData();
    if (!signatureData) {
      setError('Inserisci la tua firma nel riquadro');
      return;
    }

    setSigning(true);
    setError(null);

    signMutation.mutate({
      contractId: contract.id,
      signatureData,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Preloader />
      </div>
    );
  }

  // Error state
  if (fetchError || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full ${colors.status.error.softBg} flex items-center justify-center mx-auto mb-4`}>
            <AlertCircle className={`w-8 h-8 ${colors.status.error.text}`} />
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${colors.text.primary}`}>Contratto non trovato</h1>
          <p className={`${colors.text.secondary} mb-6`}>
            {fetchError?.message || 'Il link non è valido o è scaduto. Contatta l\'amministrazione per assistenza.'}
          </p>
          <button
            onClick={() => router.push('/contattaci')}
            className={`px-6 py-3 rounded-lg ${colors.primary.gradient} text-white font-medium`}
          >
            Contattaci
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full ${colors.status.success.softBg} flex items-center justify-center mx-auto mb-4`}>
            <CheckCircle className={`w-8 h-8 ${colors.status.success.text}`} />
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${colors.text.primary}`}>Contratto firmato!</h1>
          <p className={`${colors.text.secondary} mb-6`}>
            Grazie per aver firmato il contratto. Riceverai una email di conferma.
            Il tuo account sarà attivato a breve dall&apos;amministrazione.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className={`px-6 py-3 rounded-lg ${colors.primary.gradient} text-white font-medium`}
          >
            Vai al Login
          </button>
        </div>
      </div>
    );
  }

  // Format dates - kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  // Calculate days remaining using a stable reference date
  // This is calculated once during render for display purposes
  const calculateDaysRemaining = () => {
    if (!contract.expiresAt) return null;
    const now = new Date();
    return Math.ceil((new Date(contract.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };
  const daysRemaining = calculateDaysRemaining();

  return (
    <div className={`min-h-screen ${colors.background.primary} py-8 px-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold ${colors.primary.gradient} bg-clip-text text-transparent mb-2`}>
            Firma il Contratto
          </h1>
          <p className={colors.text.secondary}>
            Leggi attentamente il contratto e firma per completare l&apos;iscrizione
          </p>
        </div>

        {/* Contract Info Card */}
        <div className={`${colors.background.card} rounded-2xl shadow-lg p-6 mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${colors.primary.softBg} flex items-center justify-center`}>
                <FileText className={`w-6 h-6 ${colors.primary.text}`} />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${colors.text.primary}`}>{contract.template?.name}</h2>
                <p className={`text-sm ${colors.text.secondary}`}>
                  {contract.template?.description || 'Contratto di iscrizione'}
                </p>
              </div>
            </div>
            {/* Only show download button if canDownload is true */}
            {contract.canDownload && (
              <button
                onClick={handleDownloadPDF}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:${colors.background.tertiary} border ${colors.border.primary} transition-colors`}
                title="Scarica contratto in PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Scarica PDF</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
              <div className="flex items-center gap-2 mb-1">
                <Euro className={`w-4 h-4 ${colors.text.secondary}`} />
                <span className={`text-sm ${colors.text.secondary}`}>Importo</span>
              </div>
              <p className={`font-semibold text-lg ${colors.text.primary}`}>{formatPrice(contract.template?.price ?? null)}</p>
            </div>
            <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className={`w-4 h-4 ${colors.text.secondary}`} />
                <span className={`text-sm ${colors.text.secondary}`}>Durata</span>
              </div>
              <p className={`font-semibold text-lg ${colors.text.primary}`}>{contract.template?.duration || '-'}</p>
            </div>
            <div className={`p-4 rounded-xl ${daysRemaining && daysRemaining <= 3 ? colors.status.warning.softBg : colors.background.secondary}`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className={`w-4 h-4 ${colors.text.secondary}`} />
                <span className={`text-sm ${colors.text.secondary}`}>Scadenza firma</span>
              </div>
              <p className={`font-semibold text-lg ${daysRemaining && daysRemaining <= 3 ? colors.status.warning.text : colors.text.primary}`}>
                {daysRemaining ? `${daysRemaining} giorni` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Contract Content */}
        <div className={`${colors.background.card} rounded-2xl shadow-lg p-6 mb-6`}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full flex items-center justify-between text-left ${colors.text.primary}`}
          >
            <h3 className="text-lg font-semibold">Testo del Contratto</h3>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          
          <div 
            className={`mt-4 transition-all duration-300 overflow-hidden ${
              isExpanded ? 'max-h-[2000px]' : 'max-h-48'
            }`}
          >
            <div 
              className={`prose prose-sm max-w-none ${colors.text.primary}`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(contract.contentSnapshot) }}
            />
          </div>

          {!isExpanded && (
            <div className={`text-center mt-4 pt-4 border-t ${colors.border.primary}`}>
              <button
                onClick={() => setIsExpanded(true)}
                className={`text-sm ${colors.primary.text} hover:underline`}
              >
                Mostra tutto il contratto
              </button>
            </div>
          )}
        </div>

        {/* Signature Section */}
        <div className={`${colors.background.card} rounded-2xl shadow-lg p-6 mb-6`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${colors.text.primary}`}>
            <Pen className="w-5 h-5" />
            Firma
          </h3>

          {/* Signature Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className={`w-full h-[150px] border-2 border-dashed rounded-xl ${colors.border.secondary} bg-white cursor-crosshair touch-none`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className={`${colors.text.muted} text-sm`}>
                  Disegna qui la tua firma
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={clearSignature}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${colors.background.secondary} ${colors.text.primary} hover:${colors.background.tertiary} transition-colors`}
            >
              <RotateCcw className="w-4 h-4" />
              Cancella firma
            </button>
          </div>

          {/* Terms Checkbox */}
          <div className={`mt-6 p-4 rounded-xl ${colors.background.secondary}`}>
            <div className="flex items-start gap-3">
              <Checkbox
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label 
                className={`text-sm ${colors.text.secondary} flex-1 cursor-pointer select-none`}
                onClick={() => setAcceptedTerms(!acceptedTerms)}
              >
                Dichiaro di aver letto e compreso integralmente il contenuto del presente contratto 
                e di accettare tutti i termini e le condizioni in esso contenuti. 
                La firma digitale apposta ha valore legale ai sensi del D.Lgs. 82/2005.
              </label>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`${colors.status.error.softBg} ${colors.status.error.text} p-4 rounded-xl mb-6 flex items-center gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Sign Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSign}
            disabled={!acceptedTerms || !hasSignature || signing}
            className={`
              px-8 py-4 rounded-xl font-semibold text-lg text-white
              transition-all duration-200
              ${acceptedTerms && hasSignature && !signing
                ? `${colors.primary.gradient} hover:shadow-lg hover:scale-[1.02]`
                : 'bg-gray-300 cursor-not-allowed'
              }
            `}
          >
            <ButtonLoader loading={signing} loadingText="Firma in corso...">
              <span className="flex items-center gap-2">
                <Pen className="w-5 h-5" />
                Firma il Contratto
              </span>
            </ButtonLoader>
          </button>
        </div>

        {/* Help Text */}
        <p className={`text-center mt-6 text-sm ${colors.text.muted}`}>
          Hai bisogno di aiuto?{' '}
          <Link href="/contattaci" className={`${colors.primary.text} hover:underline`}>
            Contattaci
          </Link>
        </p>
      </div>
    </div>
  );
}
