'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { firebaseAuth } from '@/lib/firebase/auth';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fiscalCode: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const updateProfileMutation = trpc.students.completeProfile.useMutation();

  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/auth/login');
      } else {
        setAuthChecking(false);
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validazione campi obbligatori
    if (!formData.fiscalCode || !formData.dateOfBirth || !formData.phone || 
        !formData.address || !formData.city || !formData.province || !formData.postalCode) {
      setError('Tutti i campi sono obbligatori');
      return;
    }

    // Validazione codice fiscale (16 caratteri)
    if (formData.fiscalCode.length !== 16) {
      setError('Il codice fiscale deve essere di 16 caratteri');
      return;
    }

    setLoading(true);

    try {
      await updateProfileMutation.mutateAsync({
        fiscalCode: formData.fiscalCode.toUpperCase(),
        dateOfBirth: new Date(formData.dateOfBirth),
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        province: formData.province.toUpperCase(),
        postalCode: formData.postalCode,
      });

      // Redirect alla dashboard
      router.push('/app/studente');
    } catch (err: any) {
      console.error('Profile completion error:', err);
      setError(err.message || 'Errore durante il salvataggio. Riprova');
    } finally {
      setLoading(false);
    }
  };

  // Show loader while checking authentication
  if (authChecking) {
    return (
      <div className={`min-h-screen ${colors.background.authPage} flex items-center justify-center`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-t-2" style={{ borderColor: colors.primary.main }}></div>
          <p className={`mt-4 text-sm ${colors.text.secondary}`}>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className={`w-full ${colors.background.card} py-5 px-6 sm:px-8 ${colors.effects.shadow.xl} rounded-xl`}>
        {/* Header */}
        <div className="mb-4 text-center">
          <h2 className={`text-xl font-bold ${colors.text.primary}`}>
            Completa il tuo profilo
          </h2>
          <p className={`mt-1 text-xs ${colors.text.secondary}`}>
            Inserisci i tuoi dati anagrafici per accedere alla piattaforma
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`${colors.status.error.bgLight} ${colors.status.error.border} ${colors.status.error.text} px-4 py-3 rounded-lg text-sm`}>
              {error}
            </div>
          )}

          {/* Sezione 1: Dati Personali */}
          <div className="space-y-2">
            <h3 className={`text-[10px] font-bold ${colors.text.primary} uppercase tracking-wide`}>
              Dati Personali
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Codice Fiscale */}
              <div>
                <label htmlFor="fiscalCode" className={`block text-[10px] font-medium ${colors.text.secondary} mb-0.5`}>
                  Codice Fiscale <span className={colors.status.error.text}>*</span>
                </label>
                <input
                  id="fiscalCode"
                  type="text"
                  required
                  maxLength={16}
                  value={formData.fiscalCode}
                  onChange={(e) => setFormData({ ...formData, fiscalCode: e.target.value.toUpperCase() })}
                  className={`block w-full px-2.5 py-1.5 text-sm ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] focus:border-transparent transition-all uppercase`}
                  placeholder="RSSMRA85M01H501Z"
                />
              </div>

              {/* Data di nascita */}
              <div>
                <label htmlFor="dateOfBirth" className={`block text-[10px] font-medium ${colors.text.secondary} mb-0.5`}>
                  Data di nascita <span className={colors.status.error.text}>*</span>
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className={`block w-full px-2.5 py-1.5 text-sm ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] focus:border-transparent transition-all`}
                />
              </div>

              {/* Telefono */}
              <div>
                <label htmlFor="phone" className={`block text-[10px] font-medium ${colors.text.secondary} mb-0.5`}>
                  Telefono <span className={colors.status.error.text}>*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`block w-full px-2.5 py-1.5 text-sm ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] focus:border-transparent transition-all`}
                  placeholder="+39 123 456 7890"
                />
              </div>
            </div>
          </div>

          {/* Divisore */}
          <div className={`border-t ${colors.border.primary}`}></div>

          {/* Sezione 2: Residenza */}
          <div className="space-y-2">
            <h3 className={`text-[10px] font-bold ${colors.text.primary} uppercase tracking-wide`}>
              Indirizzo di Residenza
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Indirizzo */}
              <div className="md:col-span-2">
                <label htmlFor="address" className={`block text-[10px] font-medium ${colors.text.secondary} mb-0.5`}>
                  Indirizzo <span className={colors.status.error.text}>*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`block w-full px-2.5 py-1.5 text-sm ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] focus:border-transparent transition-all`}
                  placeholder="Via Roma 123"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Città */}
                <div>
                  <label htmlFor="city" className={`block text-[10px] font-medium ${colors.text.secondary} mb-0.5`}>
                    Città <span className={colors.status.error.text}>*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`block w-full px-2.5 py-1.5 text-sm ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] focus:border-transparent transition-all`}
                    placeholder="Roma"
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label htmlFor="province" className={`block text-[10px] font-medium ${colors.text.secondary} mb-0.5`}>
                    Provincia <span className={colors.status.error.text}>*</span>
                  </label>
                  <input
                    id="province"
                    type="text"
                    required
                    maxLength={2}
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value.toUpperCase() })}
                    className={`block w-full px-2.5 py-1.5 text-sm ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] focus:border-transparent transition-all uppercase`}
                    placeholder="RM"
                  />
                </div>

                {/* CAP */}
                <div>
                  <label htmlFor="postalCode" className={`block text-[10px] font-medium ${colors.text.secondary} mb-0.5`}>
                    CAP <span className={colors.status.error.text}>*</span>
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    required
                    maxLength={5}
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className={`block w-full px-2.5 py-1.5 text-sm ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[${colors.primary.main}] focus:border-transparent transition-all`}
                    placeholder="00100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-6 border border-transparent rounded-lg shadow-md text-sm font-semibold ${colors.neutral.text.white} ${colors.primary.bg} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[${colors.primary.main}] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvataggio in corso...
                </span>
              ) : (
                'Completa Profilo'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className={`text-xs sm:text-sm ${colors.text.muted} max-w-xl mx-auto`}>
            * Campi obbligatori. Il tuo account sarà attivato dagli amministratori dopo la verifica.
          </p>
        </div>
      </div>
    </div>
  );
}
