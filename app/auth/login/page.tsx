'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Login con Firebase
      const userCredential = await firebaseAuth.login(email, password);
      
      // 2. Ottieni token
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
      
      // 5. Redirect in base a completamento profilo e ruolo
      if (dbUser.role === 'STUDENT' && !dbUser.profileCompleted) {
        router.push('/auth/complete-profile');
      } else if (dbUser.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/studente');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.code === 'auth/invalid-credential') {
        setError('Email o password non validi');
      } else if (err.code === 'auth/user-not-found') {
        setError('Utente non trovato');
      } else if (err.code === 'auth/wrong-password') {
        setError('Password errata');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Troppi tentativi. Riprova più tardi');
      } else {
        setError('Errore durante il login. Riprova');
      }
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      <div className={`relative ${colors.background.card} py-8 px-6 ${colors.effects.shadow.xl} rounded-lg ${colors.effects.transition}`}>
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-t-2" style={{ borderColor: colors.primary.main }}></div>
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
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${colors.neutral.text.white} ${colors.primary.bg} ${colors.primary.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${colors.primary.main} disabled:opacity-50 disabled:cursor-not-allowed`}
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
  );
}