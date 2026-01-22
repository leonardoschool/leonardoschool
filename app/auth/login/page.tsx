'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const _redirect = searchParams.get('redirect') || '/app';
  const errorParam = searchParams.get('error');
  const { showError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Show error from URL params (e.g., account deactivated)
  useEffect(() => {
    if (errorParam === 'account-deactivated') {
      setError('Il tuo account è stato disattivato. Contatta l\'amministrazione per maggiori informazioni.');
    }
  }, [errorParam]);

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

  // Check if user is already logged in Firebase - if so, sync cookies and redirect
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        // Check if email is verified
        if (!user.emailVerified) {
          // User needs to verify email first
          setCheckingAuth(false);
          router.push('/auth/verifica-email');
          return;
        }
        
        try {
          // User is logged in Firebase but arrived at login page
          // This means cookies might be out of sync - resync them
          const token = await user.getIdToken();
          const response = await fetch('/api/auth/me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          
          if (response.ok) {
            const dbUser = await response.json();
            
            // Follow the complete onboarding flow:
            // 1. Profile not complete → complete-profile
            // 2. Parent data required → complete-profile (parent section)
            // 3. Pending contract → contract signing page
            // 4. Not active but no pending contract → dashboard (shows "waiting for contract" message)
            // 5. All good → dashboard
            
            // Check if user needs to complete profile
            if ((dbUser.role === 'STUDENT' || dbUser.role === 'COLLABORATOR') && !dbUser.profileCompleted) {
              router.push('/auth/complete-profile');
              return;
            }
            
            // Check if student needs to add parent/guardian data
            if (dbUser.role === 'STUDENT' && dbUser.parentDataRequired) {
              router.push('/auth/complete-profile');
              return;
            }
            
            // Check if user has a pending contract to sign
            if (dbUser.pendingContractToken) {
              router.push(`/contratto/${dbUser.pendingContractToken}`);
              return;
            }
            
            // If account is not active but has no pending contract, user is waiting for contract assignment
            // Let them access the dashboard where they'll see the "waiting for contract" message
            // All conditions passed (or waiting for contract), redirect to dashboard
            window.location.href = '/dashboard';
            return;
          }
        } catch (err) {
          console.error('Error syncing auth:', err);
        }
      }
      setCheckingAuth(false);
    });
    
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Login con Firebase
      const userCredential = await firebaseAuth.login(email, password);
      
      // 2. Verifica che l'email sia verificata
      if (!userCredential.user.emailVerified) {
        // Send a new verification email if needed
        await firebaseAuth.sendVerificationEmail();
        setLoading(false);
        router.push('/auth/verifica-email');
        return;
      }
      
      // 3. Ottieni token
      const token = await userCredential.user.getIdToken();
      
      // 3. Recupera dati utente dal database
      const response = await fetch('/api/auth/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel recupero dati utente');
      }
      
      const dbUser = await response.json();
      
      // 4. Server ha già settato cookie HttpOnly con token
      // Salva dati non sensibili in localStorage per UI (non per autenticazione)
      localStorage.setItem('user', JSON.stringify({
        role: dbUser.role,
        profileCompleted: dbUser.profileCompleted,
        name: dbUser.name,
      }));
      
      // 5. Follow the complete onboarding flow:
      // 1. Profile not complete → complete-profile
      // 2. Parent data required → complete-profile (parent section)
      // 3. Pending contract → contract signing page
      // 4. Not active but no pending contract → dashboard (shows "waiting for contract" message)
      // 5. All good → dashboard
      
      // Check if user needs to complete profile
      if ((dbUser.role === 'STUDENT' || dbUser.role === 'COLLABORATOR') && !dbUser.profileCompleted) {
        router.push('/auth/complete-profile');
        return;
      }
      
      // Check if student needs to add parent/guardian data
      if (dbUser.role === 'STUDENT' && dbUser.parentDataRequired) {
        router.push('/auth/complete-profile');
        return;
      }
      
      // Check if user has a pending contract to sign
      if (dbUser.pendingContractToken) {
        router.push(`/contratto/${dbUser.pendingContractToken}`);
        return;
      }
      
      // If account is not active but has no pending contract, user is waiting for contract assignment
      // Let them access the dashboard where they'll see the "waiting for contract" message
      // All conditions passed (or waiting for contract), redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Login error:', err);
      const firebaseError = err as { code?: string };
      
      let errorMessage = 'Errore durante il login. Riprova';
      
      if (firebaseError.code === 'auth/invalid-credential') {
        errorMessage = 'Email o password non validi';
      } else if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = 'Utente non trovato';
      } else if (firebaseError.code === 'auth/wrong-password') {
        errorMessage = 'Password errata';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        errorMessage = 'Troppi tentativi. Riprova più tardi';
      }
      
      setError(errorMessage);
      showError('Errore di accesso', errorMessage);
      setLoading(false);
    }
  };

  // Show loading while checking if user is already authenticated
  if (checkingAuth) {
    return (
      <div className="max-w-md mx-auto w-full">
        <div className={`relative ${colors.background.card} py-8 px-6 ${colors.effects.shadow.xl} rounded-lg ${colors.effects.transition}`}>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Spinner size="lg" />
              <p className={`mt-4 text-sm font-medium ${colors.text.primary}`}>Verifica sessione...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className='flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-32'>
        {/* Logo - Hidden on mobile, visible on desktop with animations */}
        <div className="hidden lg:block flex-shrink-0 relative group">
          {/* Subtle glow effect behind logo */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#a8012b]/20 via-[#8a0125]/20 to-[#a8012b]/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
          
          {/* Logo with smooth float animation */}
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
        
        {/* Vertical divider - Only on desktop with gradient animation */}
        <div className="hidden lg:block relative h-[25rem] w-px overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsla(200,10%,50%,0.5)] to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#a8012b]/30 via-transparent to-[#a8012b]/30 animate-shimmer" />
        </div>
        
        {/* Login Form */}
        <div className="w-full max-w-md">
          {/* Logo on mobile - Centered above form with animation */}
          <div className="lg:hidden flex justify-center mb-6 animate-fade-in">
            <div className="relative">
              {/* Mobile glow effect */}
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
          
          {/* Form card with subtle animations */}
          <div className={`relative ${colors.background.card} py-6 sm:py-8 px-4 sm:px-6 ${colors.effects.shadow.xl} rounded-lg ${colors.effects.transition} animate-slide-up`}>
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
              <div className="text-center">
                <Spinner size="lg" />
                <p className={`mt-4 text-sm font-medium ${colors.text.primary}`}>Accesso in corso...</p>
              </div>
            </div>
          )}
          
          <h2 className={`text-2xl font-bold ${colors.text.primary} text-center mb-6`}>
            Accedi
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
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
            />
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 pr-10 ${colors.background.input} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] ${colors.text.primary}`}
                placeholder="••••••••"
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
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href="/auth/recupera-password"
                className={`font-medium ${colors.primary.text} ${colors.primary.textHover} transition-colors`}
              >
                Password dimenticata?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${colors.neutral.text.white} ${colors.primary.bg} ${colors.primary.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${colors.primary.main} disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-[#a8012b]/30 active:scale-[0.98]`}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

          <div className="mt-6 text-center">
            <p className={`text-sm ${colors.text.secondary}`}>
              Non hai un account?{' '}
              <Link
                href="/auth/registrati"
                className={`font-medium ${colors.primary.text} ${colors.primary.textHover} transition-colors`}
              >
                Registrati
              </Link>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}