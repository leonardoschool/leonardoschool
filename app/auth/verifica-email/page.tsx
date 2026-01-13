'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';

export default function VerificaEmailPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  
  const [email, setEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Get current user email
  useEffect(() => {
    const user = firebaseAuth.getCurrentUser();
    if (user) {
      setEmail(user.email);
      
      // If already verified, redirect
      if (user.emailVerified) {
        router.push('/auth/complete-profile');
      }
    } else {
      // No user logged in, redirect to register
      router.push('/auth/registrati');
    }
  }, [router]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Check verification status periodically
  const checkVerificationStatus = useCallback(async () => {
    setCheckingVerification(true);
    try {
      const user = firebaseAuth.getCurrentUser();
      if (user) {
        // Reload user to get fresh verification status
        await user.reload();
        
        if (user.emailVerified) {
          showSuccess('Email verificata!', 'Ora puoi completare il tuo profilo.');
          router.push('/auth/complete-profile');
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking verification:', error);
    }
    setCheckingVerification(false);
    return false;
  }, [router, showSuccess]);

  // Auto-check every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkVerificationStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [checkVerificationStatus]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setResendLoading(true);
    try {
      await firebaseAuth.sendVerificationEmail();
      showSuccess('Email inviata', 'Controlla la tua casella di posta.');
      setResendCooldown(60); // 60 seconds cooldown
    } catch (error) {
      console.error('Error sending verification email:', error);
      showError('Errore', 'Impossibile inviare l\'email. Riprova più tardi.');
    }
    setResendLoading(false);
  };

  const handleCheckManually = async () => {
    const verified = await checkVerificationStatus();
    if (!verified) {
      showError('Non ancora verificata', 'Clicca sul link nell\'email per verificare il tuo account.');
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      <div className={`${colors.background.card} py-8 px-6 ${colors.effects.shadow.xl} rounded-lg ${colors.effects.transition}`}>
        {/* Email Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full ${colors.primary.light} flex items-center justify-center`}>
            <svg className={`w-10 h-10 ${colors.primary.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h2 className={`text-2xl font-bold ${colors.text.primary} text-center mb-2`}>
          Verifica la tua email
        </h2>
        
        <p className={`text-center ${colors.text.secondary} mb-6`}>
          Abbiamo inviato un link di verifica a:
        </p>
        
        {email && (
          <p className={`text-center font-semibold ${colors.primary.text} mb-6 break-all`}>
            {email}
          </p>
        )}

        <div className={`${colors.background.secondary} rounded-lg p-4 mb-6`}>
          <h3 className={`font-medium ${colors.text.primary} mb-2 flex items-center gap-2`}>
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Istruzioni
          </h3>
          <ol className={`text-sm ${colors.text.muted} space-y-2 list-decimal list-inside`}>
            <li>Apri la tua casella email</li>
            <li>Cerca l&apos;email da Leonardo School</li>
            <li>Clicca sul link di verifica</li>
            <li>Torna su questa pagina</li>
          </ol>
        </div>

        {/* Check Verification Button */}
        <button
          onClick={handleCheckManually}
          disabled={checkingVerification}
          className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${colors.neutral.text.white} ${colors.primary.bg} ${colors.primary.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mb-4 transition-colors`}
        >
          {checkingVerification ? (
            <>
              <Spinner size="sm" variant="white" />
              Verifico...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ho verificato l&apos;email
            </>
          )}
        </button>

        {/* Resend Email Button */}
        <button
          onClick={handleResendEmail}
          disabled={resendLoading || resendCooldown > 0}
          className={`w-full flex justify-center items-center gap-2 py-3 px-4 border-2 ${colors.border.primary} rounded-md text-sm font-medium ${colors.text.primary} hover:${colors.background.secondary} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        >
          {resendLoading ? (
            <>
              <Spinner size="sm" variant="primary" />
              Invio in corso...
            </>
          ) : resendCooldown > 0 ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Riprova tra {resendCooldown}s
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reinvia email
            </>
          )}
        </button>

        {/* Spam Notice */}
        <p className={`text-center text-xs ${colors.text.muted} mt-4`}>
          Non trovi l&apos;email? Controlla la cartella spam o posta indesiderata.
        </p>

        {/* Back to Login */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className={`text-sm ${colors.text.secondary}`}>
            Email sbagliata?{' '}
            <Link
              href="/auth/registrati"
              onClick={() => firebaseAuth.logout()}
              className={`font-medium ${colors.primary.text} ${colors.primary.textHover} transition-colors`}
            >
              Registrati di nuovo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
