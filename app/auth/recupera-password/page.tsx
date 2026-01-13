'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';
import { isValidEmail } from '@/lib/validations/authValidation';

export default function RecuperaPasswordPage() {
  const { showSuccess, showError } = useToast();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Detect and update theme dynamically
  useEffect(() => {
    const updateTheme = () => {
      const savedTheme = localStorage.getItem('theme') || 'system';
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme === 'dark' || (savedTheme === 'system' && systemPrefersDark);
      setIsDarkTheme(isDark);
    };

    updateTheme();

    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => updateTheme();
    mediaQuery.addEventListener('change', handleChange);

    // Listen for localStorage changes (when theme is changed in other tabs/components)
    window.addEventListener('storage', updateTheme);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('storage', updateTheme);
    };
  }, []);

  // Cooldown timer for resending email
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!email.trim()) {
      setError('Inserisci la tua email');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Inserisci un indirizzo email valido');
      return;
    }

    setLoading(true);

    try {
      await firebaseAuth.resetPassword(email);
      setEmailSent(true);
      setCooldownSeconds(60); // 60 seconds cooldown
      showSuccess(
        'Email inviata',
        'Controlla la tua casella di posta per le istruzioni di recupero password'
      );
      setLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      const firebaseError = err as { code?: string };
      
      let errorMessage = 'Errore durante l\'invio dell\'email. Riprova';
      
      if (firebaseError.code === 'auth/user-not-found') {
        // For security, don't reveal if user exists or not
        // Still show success message
        setEmailSent(true);
        setCooldownSeconds(60); // 60 seconds cooldown
        showSuccess(
          'Email inviata',
          'Se l\'indirizzo email è registrato, riceverai le istruzioni per reimpostare la password'
        );
        setLoading(false);
        return;
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Indirizzo email non valido';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        errorMessage = 'Troppi tentativi. Riprova più tardi';
      }
      
      setError(errorMessage);
      showError('Errore', errorMessage);
      setLoading(false);
    }
  };

  // Success state - email sent
  if (emailSent) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-32">
          {/* Logo - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block flex-shrink-0 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#a8012b]/20 via-[#8a0125]/20 to-[#a8012b]/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
            <div className="relative animate-float">
              <Image
                src={`/images/logo_${isDarkTheme ? 'bianco' : 'nero'}.png`}
                alt="Leonardo School"
                className="object-contain transition-transform duration-500 group-hover:scale-105"
                width={200}
                height={200}
                priority
              />
            </div>
          </div>
          
          {/* Vertical divider */}
          <div className="hidden lg:block relative h-[20rem] w-px overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsla(200,10%,50%,0.5)] to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#a8012b]/30 via-transparent to-[#a8012b]/30 animate-shimmer" />
          </div>
          
          {/* Success Card */}
          <div className="w-full max-w-md">
            {/* Logo on mobile */}
            <div className="lg:hidden flex justify-center mb-6 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#a8012b]/20 via-[#8a0125]/20 to-[#a8012b]/20 rounded-full blur-2xl animate-pulse" />
                <Image
                  src={`/images/logo_${isDarkTheme ? 'bianco' : 'nero'}.png`}
                  alt="Leonardo School"
                  className="object-contain relative z-10"
                  width={120}
                  height={120}
                  priority
                />
              </div>
            </div>
            
            <div className={`relative ${colors.background.card} py-6 sm:py-8 px-4 sm:px-6 ${colors.effects.shadow.xl} rounded-lg ${colors.effects.transition} animate-slide-up`}>
              {/* Success Icon */}
              <div className="flex justify-center mb-4">
                <div className={`w-16 h-16 rounded-full ${colors.status.success.bgLight} flex items-center justify-center`}>
                  <svg className={`w-8 h-8 ${colors.status.success.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              
              <h2 className={`text-2xl font-bold ${colors.text.primary} text-center mb-4`}>
                Controlla la tua email
              </h2>
              
              <p className={`text-center ${colors.text.secondary} mb-6`}>
                Abbiamo inviato le istruzioni per reimpostare la password a{' '}
                <span className={`font-medium ${colors.text.primary}`}>{email}</span>
              </p>
              
              <div className={`${colors.status.info.bgLight} ${colors.status.info.border} ${colors.status.info.text} px-4 py-3 rounded-lg text-sm mb-6`}>
                <p className="font-medium mb-1">Non hai ricevuto l&apos;email?</p>
                <ul className="list-disc list-inside space-y-1 text-sm opacity-90">
                  <li>Controlla la cartella spam o posta indesiderata</li>
                  <li>Verifica che l&apos;indirizzo email sia corretto</li>
                  <li>Attendi qualche minuto e riprova</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setLoading(false);
                  }}
                  disabled={cooldownSeconds > 0}
                  className={`w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ${
                    cooldownSeconds > 0 
                      ? `${colors.border.primary} ${colors.text.muted} ${colors.background.card} cursor-not-allowed` 
                      : `${colors.border.primary} ${colors.text.primary} ${colors.background.card} hover:${colors.background.secondary} focus:ring-${colors.primary.main}`
                  }`}
                >
                  {cooldownSeconds > 0 ? `Attendere ${cooldownSeconds}s | Invia di nuovo` : 'Invia di nuovo'}
                </button>
                
                <Link
                  href="/auth/login"
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${colors.neutral.text.white} ${colors.primary.bg} ${colors.primary.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${colors.primary.main} transition-all duration-300 hover:shadow-lg hover:shadow-[#a8012b]/30 active:scale-[0.98]`}
                >
                  Torna al login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-32">
        {/* Logo - Hidden on mobile, visible on desktop with animations */}
        <div className="hidden lg:block flex-shrink-0 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#a8012b]/20 via-[#8a0125]/20 to-[#a8012b]/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
          <div className="relative animate-float">
            <Image
              src={`/images/logo_${isDarkTheme ? 'bianco' : 'nero'}.png`}
              alt="Leonardo School"
              className="object-contain transition-transform duration-500 group-hover:scale-105"
              width={200}
              height={200}
              priority
            />
          </div>
        </div>
        
        {/* Vertical divider */}
        <div className="hidden lg:block relative h-[20rem] w-px overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsla(200,10%,50%,0.5)] to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#a8012b]/30 via-transparent to-[#a8012b]/30 animate-shimmer" />
        </div>
        
        {/* Form */}
        <div className="w-full max-w-md">
          {/* Logo on mobile */}
          <div className="lg:hidden flex justify-center mb-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#a8012b]/20 via-[#8a0125]/20 to-[#a8012b]/20 rounded-full blur-2xl animate-pulse" />
              <Image
                src={`/images/logo_${isDarkTheme ? 'bianco' : 'nero'}.png`}
                alt="Leonardo School"
                className="object-contain relative z-10"
                width={120}
                height={120}
                priority
              />
            </div>
          </div>
          
          {/* Form card */}
          <div className={`relative ${colors.background.card} py-6 sm:py-8 px-4 sm:px-6 ${colors.effects.shadow.xl} rounded-lg ${colors.effects.transition} animate-slide-up`}>
            {loading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className={`mt-4 text-sm font-medium ${colors.text.primary}`}>Invio in corso...</p>
                </div>
              </div>
            )}
            
            {/* Back button */}
            <Link
              href="/auth/login"
              className={`inline-flex items-center gap-1 text-sm ${colors.text.muted} hover:${colors.text.primary} transition-colors mb-4`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Torna al login
            </Link>
            
            <h2 className={`text-2xl font-bold ${colors.text.primary} text-center mb-2`}>
              Recupera password
            </h2>
            
            <p className={`text-center ${colors.text.secondary} mb-6 text-sm`}>
              Inserisci l&apos;email associata al tuo account e ti invieremo le istruzioni per reimpostare la password
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className={`${colors.status.error.bgLight} ${colors.status.error.border} ${colors.status.error.text} px-4 py-3 rounded`}>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className={`block text-sm font-medium ${colors.text.secondary}`}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] transition-colors`}
                  placeholder="tua@email.it"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${colors.neutral.text.white} ${colors.primary.bg} ${colors.primary.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${colors.primary.main} disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-[#a8012b]/30 active:scale-[0.98]`}
              >
                {loading ? 'Invio in corso...' : 'Invia istruzioni'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className={`text-sm ${colors.text.secondary}`}>
                Ricordi la password?{' '}
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
      </div>
    </div>
  );
}
