'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { firebaseAuth } from '@/lib/firebase/auth';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { isValidEmail, calculatePasswordStrength } from '@/lib/validations/authValidation';
import { normalizeName } from '@/lib/utils/stringUtils';
import { Spinner } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

export default function RegisterPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT' as 'STUDENT' | 'ADMIN',
  });
  // Honeypot field - bots will fill this, humans won't see it
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  const syncUserMutation = trpc.auth.syncUser.useMutation();

  // Check if reCAPTCHA is ready
  useEffect(() => {
    if (typeof window !== 'undefined' && window.grecaptcha) {
      window.grecaptcha.ready(() => {
        setRecaptchaReady(true);
      });
    }
  }, []);

  // Get reCAPTCHA token
  const getRecaptchaToken = useCallback(async (): Promise<string | null> => {
    if (!RECAPTCHA_SITE_KEY) {
      console.warn('reCAPTCHA site key not configured');
      return null;
    }
    
    if (!recaptchaReady || !window.grecaptcha) {
      // Try waiting for it
      return new Promise((resolve) => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'register' })
              .then(resolve)
              .catch(() => resolve(null));
          });
        } else {
          resolve(null);
        }
      });
    }
    
    try {
      return await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'register' });
    } catch (err) {
      console.error('reCAPTCHA error:', err);
      return null;
    }
  }, [recaptchaReady]);

  // Verify with server (reCAPTCHA + honeypot + rate limiting)
  const verifySecurityChecks = async (token: string | null): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, honeypot }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setError(data.error);
          showError('Troppe richieste', data.error);
          return false;
        }
        if (data.code === 'BOT_DETECTED' || data.code === 'LOW_SCORE') {
          setError('Verifica di sicurezza fallita. Riprova.');
          showError('Verifica fallita', 'Riprova tra qualche secondo.');
          return false;
        }
        console.warn('reCAPTCHA verification failed:', data.error);
        // In development, allow to continue if reCAPTCHA fails
        return process.env.NODE_ENV === 'development';
      }
      
      return data.success;
    } catch (err) {
      console.error('Security verification error:', err);
      // In development, allow to continue
      return process.env.NODE_ENV === 'development';
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere almeno 6 caratteri');
      return;
    }

    setLoading(true);

    try {
      // 1. Get reCAPTCHA token
      const recaptchaToken = await getRecaptchaToken();
      
      // 2. Verify security checks (reCAPTCHA + honeypot + rate limiting)
      const securityPassed = await verifySecurityChecks(recaptchaToken);
      if (!securityPassed) {
        setLoading(false);
        return;
      }

      // 3. Normalize data before submission
      const normalizedName = normalizeName(formData.name);
      
      // 4. Register with Firebase
      const userCredential = await firebaseAuth.register(
        formData.email,
        formData.password,
        normalizedName
      );

      // 5. Send email verification
      await firebaseAuth.sendVerificationEmail();

      // 6. Sync user to database
      await syncUserMutation.mutateAsync({
        firebaseUid: userCredential.user.uid,
        email: formData.email,
        name: normalizedName,
        role: formData.role,
      });

      // 7. Redirect to email verification page
      showSuccess('Registrazione completata', 'Controlla la tua email per verificare l\'account.');
      router.push('/auth/verifica-email');
    } catch (err) {
      console.error('Registration error:', err);
      const firebaseError = err as { code?: string };

      let errorMessage = 'Errore durante la registrazione. Riprova';

      if (firebaseError.code === 'auth/email-already-in-use') {
        errorMessage = 'Questa email è già registrata';
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Email non valida';
      } else if (firebaseError.code === 'auth/weak-password') {
        errorMessage = 'Password troppo debole';
      }
      
      setError(errorMessage);
      showError('Registrazione fallita', errorMessage);
      setLoading(false);
    }
  };

  return (
    <>
      {/* reCAPTCHA v3 Script */}
      {RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          onLoad={() => {
            if (window.grecaptcha) {
              window.grecaptcha.ready(() => setRecaptchaReady(true));
            }
          }}
        />
      )}
      
    <div className="max-w-md mx-auto w-full">
      <div className={`relative ${colors.background.card} py-8 px-6 ${colors.effects.shadow.xl} rounded-lg ${colors.effects.transition}`}>
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <Spinner size="lg" />
              <p className={`mt-4 text-sm font-medium ${colors.text.primary}`}>Registrazione in corso...</p>
            </div>
          </div>
        )}
        
        <h2 className={`text-2xl font-bold ${colors.text.primary} text-center mb-6`}>
          Registrati
        </h2>

        <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className={`${colors.status.error.bgLight} ${colors.status.error.border} ${colors.status.error.text} px-4 py-3 rounded`}>
            {error}
          </div>
        )}

        {/* Honeypot field - hidden from humans, visible to bots */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="name" className={`block text-sm font-medium ${colors.text.secondary}`}>
            Nome completo
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`mt-1 block w-full px-3 py-2 ${colors.effects.cardBackground} border ${colors.neutral.borderPrimary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}]`}
            placeholder="Mario Rossi"
          />
        </div>

        <div>
          <label htmlFor="email" className={`block text-sm font-medium ${colors.text.secondary}`}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            onBlur={() => setEmailTouched(true)}
            className={`mt-1 block w-full px-3 py-2 ${colors.background.input} ${colors.text.primary} border ${emailTouched && !isValidEmail(formData.email) && formData.email ? colors.validation.error.border : colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] transition-colors`}
            placeholder="tua@email.it"
          />
          {emailTouched && !isValidEmail(formData.email) && formData.email && (
            <p className={`mt-1 text-sm ${colors.validation.error.text} flex items-center gap-1`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Inserisci un indirizzo email valido
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className={`block text-sm font-medium ${colors.text.secondary}`}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onBlur={() => setPasswordTouched(true)}
              className={`mt-1 block w-full px-3 py-2 pr-10 ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] transition-colors`}
              placeholder="••••••••"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${colors.text.muted} hover:${colors.text.secondary} transition-colors mt-0.5`}
              aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {passwordTouched && formData.password && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${colors.text.secondary}`}>
                  Sicurezza password:
                </span>
                <span className={`text-sm font-semibold ${calculatePasswordStrength(formData.password).textColor}`}>
                  {calculatePasswordStrength(formData.password).label}
                </span>
              </div>
              <div className={`h-2 ${colors.background.secondary} rounded-full overflow-hidden`}>
                <div 
                  className={`h-full ${calculatePasswordStrength(formData.password).color} transition-all duration-300`}
                  style={{ width: `${(calculatePasswordStrength(formData.password).score / 5) * 100}%` }}
                />
              </div>
              <p className={`mt-1 text-xs ${colors.text.muted}`}>
                Usa almeno 8 caratteri, maiuscole, minuscole, numeri e simboli
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className={`block text-sm font-medium ${colors.text.secondary}`}>
            Conferma password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={`mt-1 block w-full px-3 py-2 pr-10 ${colors.background.input} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] ${colors.text.primary}`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${colors.text.muted} hover:${colors.text.secondary} transition-colors mt-0.5`}
              aria-label={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
            >
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${colors.neutral.text.white} ${colors.primary.bg} ${colors.primary.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Registrazione in corso...' : 'Registrati'}
        </button>
      </form>

        <div className="mt-6 text-center">
          <p className={`text-sm ${colors.text.secondary}`}>
            Hai già un account?{' '}
            <Link
              href="/auth/login"
              className={`font-medium ${colors.primary.text} ${colors.primary.textHover} transition-colors`}
            >
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}