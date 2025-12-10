'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import Preloader from '@/components/ui/Preloader';
import { 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Calendar, 
  Euro, 
  Pen,
  Eraser,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';

export default function ContractSignPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

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
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err) => {
      setError(err.message);
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
          <h1 className="text-2xl font-bold mb-2">Contratto non trovato</h1>
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
          <h1 className="text-2xl font-bold mb-2">Contratto firmato!</h1>
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

  // Format dates
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

  // Calculate days remaining
  const daysRemaining = contract.expiresAt 
    ? Math.ceil((new Date(contract.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

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
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl ${colors.primary.softBg} flex items-center justify-center`}>
              <FileText className={`w-6 h-6 ${colors.primary.text}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{contract.template?.name}</h2>
              <p className={`text-sm ${colors.text.secondary}`}>
                {contract.template?.description || 'Contratto di iscrizione'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
              <div className="flex items-center gap-2 mb-1">
                <Euro className={`w-4 h-4 ${colors.text.secondary}`} />
                <span className={`text-sm ${colors.text.secondary}`}>Importo</span>
              </div>
              <p className="font-semibold text-lg">{formatPrice(contract.template?.price ?? null)}</p>
            </div>
            <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className={`w-4 h-4 ${colors.text.secondary}`} />
                <span className={`text-sm ${colors.text.secondary}`}>Durata</span>
              </div>
              <p className="font-semibold text-lg">{contract.template?.duration || '-'}</p>
            </div>
            <div className={`p-4 rounded-xl ${daysRemaining && daysRemaining <= 3 ? colors.status.warning.softBg : colors.background.secondary}`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className={`w-4 h-4 ${colors.text.secondary}`} />
                <span className={`text-sm ${colors.text.secondary}`}>Scadenza firma</span>
              </div>
              <p className={`font-semibold text-lg ${daysRemaining && daysRemaining <= 3 ? colors.status.warning.text : ''}`}>
                {daysRemaining ? `${daysRemaining} giorni` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Contract Content */}
        <div className={`${colors.background.card} rounded-2xl shadow-lg p-6 mb-6`}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-left"
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
              dangerouslySetInnerHTML={{ __html: contract.contentSnapshot || '' }}
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
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
            >
              <RotateCcw className="w-4 h-4" />
              Cancella firma
            </button>
          </div>

          {/* Terms Checkbox */}
          <div className={`mt-6 p-4 rounded-xl ${colors.background.secondary}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className={`mt-1 w-5 h-5 rounded border-2 ${colors.border.primary} focus:ring-2 focus:ring-offset-2`}
              />
              <span className={`text-sm ${colors.text.secondary}`}>
                Dichiaro di aver letto e compreso integralmente il contenuto del presente contratto 
                e di accettare tutti i termini e le condizioni in esso contenuti. 
                La firma digitale apposta ha valore legale ai sensi del D.Lgs. 82/2005.
              </span>
            </label>
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
            {signing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Firma in corso...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Pen className="w-5 h-5" />
                Firma il Contratto
              </span>
            )}
          </button>
        </div>

        {/* Help Text */}
        <p className={`text-center mt-6 text-sm ${colors.text.muted}`}>
          Hai bisogno di aiuto?{' '}
          <a href="/contattaci" className={`${colors.primary.text} hover:underline`}>
            Contattaci
          </a>
        </p>
      </div>
    </div>
  );
}
