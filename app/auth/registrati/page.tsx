'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { firebaseAuth } from '@/lib/firebase/auth';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { isValidEmail, calculatePasswordStrength } from '@/lib/validations/authValidation';
import { normalizeName } from '@/lib/utils/stringUtils';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT' as 'STUDENT' | 'ADMIN',
  });
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const syncUserMutation = trpc.auth.syncUser.useMutation();

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
      // Normalize data before submission
      const normalizedName = normalizeName(formData.name);
      
      // 1. Register with Firebase
      const userCredential = await firebaseAuth.register(
        formData.email,
        formData.password,
        normalizedName
      );

      // 2. Sync user to database
      await syncUserMutation.mutateAsync({
        firebaseUid: userCredential.user.uid,
        email: formData.email,
        name: normalizedName,
        role: formData.role,
      });

      // 3. Redirect to complete profile page (keep loading true)
      router.push('/auth/complete-profile');
    } catch (err: any) {
      console.error('Registration error:', err);

      if (err.code === 'auth/email-already-in-use') {
        setError('Questa email è già registrata');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email non valida');
      } else if (err.code === 'auth/weak-password') {
        setError('Password troppo debole');
      } else {
        setError('Errore durante la registrazione. Riprova');
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
  );
}