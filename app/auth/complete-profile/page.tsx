'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { firebaseAuth } from '@/lib/firebase/auth';
import DatePicker from '@/components/ui/DatePicker';
import CustomSelect from '@/components/ui/CustomSelect';
import { Spinner, ButtonLoader } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';
import { parseError } from '@/lib/utils/errorHandler';
import {
  validateCodiceFiscale,
  validateTelefono,
  validateCAP,
  validateProvincia,
  formatCitta,
  formatIndirizzo,
  validateDataNascita,
  validateProfileForm,
  PROVINCE_ITALIANE,
  type ProfileFormData,
} from '@/lib/validations/profileValidation';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState('');
  
  // Field-level errors for inline validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Track which fields have been touched (for showing errors only after interaction)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<ProfileFormData>({
    fiscalCode: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
  });

  // Get user to determine role
  const { data: user, error: authError } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });
  
  // Type assertion needed because Prisma types might not be updated yet
  const isCollaborator = (user?.role as string) === 'COLLABORATOR';

  // Profile completion mutations
  const studentCompleteProfile = trpc.students.completeProfile.useMutation();
  const collaboratorCompleteProfile = trpc.collaborators.completeProfile.useMutation();

  // Handle auth error - redirect to login if not authenticated
  useEffect(() => {
    if (authError?.data?.code === 'UNAUTHORIZED') {
      router.push('/auth/login');
    }
  }, [authError, router]);

  // Check if user is authenticated and if profile is already completed
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        router.push('/auth/login');
      } else {
        setAuthChecking(false);
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  // Redirect if profile is already completed OR if user is admin (admins don't need profile completion)
  useEffect(() => {
    if (user) {
      const role = user.role as string;
      
      // Admin users should never see this page - redirect immediately
      if (role === 'ADMIN') {
        window.location.href = '/dashboard';
        return;
      }
      
      // Redirect users with completed profiles to their dashboard
      if (user.profileCompleted) {
        window.location.href = '/dashboard';
      }
    }
  }, [user, router]);

  // Validate a single field and update errors
  const validateField = (field: keyof ProfileFormData, value: string) => {
    let result;
    switch (field) {
      case 'fiscalCode':
        result = validateCodiceFiscale(value);
        break;
      case 'dateOfBirth':
        result = validateDataNascita(value);
        break;
      case 'phone':
        result = validateTelefono(value);
        break;
      case 'address':
        result = formatIndirizzo(value);
        break;
      case 'city':
        result = formatCitta(value);
        break;
      case 'province':
        result = validateProvincia(value);
        break;
      case 'postalCode':
        result = validateCAP(value);
        break;
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: result.isValid ? '' : result.error || ''
    }));
    
    return result;
  };

  // Handle field blur (mark as touched and validate)
  const handleBlur = (field: keyof ProfileFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Handle input change with real-time formatting
  const handleChange = (field: keyof ProfileFormData, value: string) => {
    let formattedValue = value;
    
    // Apply real-time formatting
    switch (field) {
      case 'fiscalCode':
        formattedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
        break;
      case 'province':
        formattedValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
        break;
      case 'postalCode':
        formattedValue = value.replace(/\D/g, '').slice(0, 5);
        break;
      case 'phone':
        // Allow digits, +, spaces for phone
        formattedValue = value.replace(/[^\d\s+]/g, '');
        break;
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    // For date picker and custom select, validate immediately and mark as touched
    if (field === 'dateOfBirth' || field === 'province') {
      setTouched(prev => ({ ...prev, [field]: true }));
      // Use setTimeout to ensure state is updated before validation
      setTimeout(() => {
        validateField(field, formattedValue);
      }, 0);
    } else if (touched[field] && fieldErrors[field]) {
      // For other fields, clear error when user starts typing
      validateField(field, formattedValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const validation = validateProfileForm(formData);
    
    if (!validation.success) {
      // Type guard: we know errors exists when success is false
      const errors = 'errors' in validation ? validation.errors : {};
      setFieldErrors(errors);
      setTouched({
        fiscalCode: true,
        dateOfBirth: true,
        phone: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
      });
      setError('Correggi gli errori nei campi evidenziati');
      return;
    }

    setLoading(true);

    try {
      // Prepare profile data with proper types
      const profileData = {
        fiscalCode: formData.fiscalCode,
        dateOfBirth: new Date(formData.dateOfBirth), // Convert string to Date
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
      };

      // Call the appropriate mutation based on user role
      // Note: Admin users should not reach this point (redirected in useEffect)
      if (isCollaborator) {
        await collaboratorCompleteProfile.mutateAsync(profileData);
      } else if (user?.role !== 'ADMIN') {
        await studentCompleteProfile.mutateAsync(profileData);
      }

      // Update cookies by calling the auth endpoint with current token
      const currentUser = firebaseAuth.getCurrentUser();
      if (currentUser) {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/auth/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        
        if (!response.ok) {
          throw new Error('Errore nell\'aggiornamento del profilo');
        }
      }

      // Use hard navigation to ensure new cookies are used by middleware
      showSuccess('Profilo completato', 'In attesa di attivazione da parte dell\'amministratore.');
      window.location.href = '/dashboard';
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.message);
      showError(parsed.title, parsed.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get input class based on error state
  const getInputClass = (field: keyof ProfileFormData) => {
    const hasError = touched[field] && fieldErrors[field];
    const baseClass = `block w-full px-4 py-2.5 text-base ${colors.background.input} ${colors.text.primary} border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all`;
    
    if (hasError) {
      return `${baseClass} border-red-500 focus:ring-red-500 focus:border-red-500`;
    }
    return `${baseClass} ${colors.border.primary} focus:ring-[#A01B3B] focus:border-transparent`;
  };

  // Show loader while checking authentication or redirecting due to auth error
  if (authChecking || authError?.data?.code === 'UNAUTHORIZED') {
    return (
      <div className={`min-h-screen ${colors.background.authPage} flex items-center justify-center`}>
        <div className="text-center">
          <Spinner size="lg" />
          <p className={`mt-4 text-sm ${colors.text.secondary}`}>
            {authError ? 'Reindirizzamento al login...' : 'Caricamento...'}
          </p>
        </div>
      </div>
    );
  }

  // Show loader while checking if profile is already completed (redirect will happen)
  if (user?.profileCompleted) {
    return (
      <div className={`min-h-screen ${colors.background.authPage} flex items-center justify-center`}>
        <div className="text-center">
          <Spinner size="lg" />
          <p className={`mt-4 text-sm ${colors.text.secondary}`}>Profilo già completato, reindirizzamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className={`w-full ${colors.background.card} py-8 px-6 sm:px-10 lg:px-12 ${colors.effects.shadow.xl} rounded-2xl`}>
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
            Completa il tuo profilo
          </h2>
          <p className={`mt-2 text-sm sm:text-base ${colors.text.secondary}`}>
            Inserisci i tuoi dati anagrafici per accedere alla piattaforma
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className={`${colors.status.error.bgLight} border ${colors.status.error.border} ${colors.status.error.text} px-4 py-3 rounded-lg text-sm flex items-center gap-2`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Sezione 1: Dati Personali */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${colors.primary.bg} flex items-center justify-center`}>
                <span className="text-white font-semibold text-sm">1</span>
              </div>
              <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
                Dati Personali
              </h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Codice Fiscale - Full width */}
              <div className="lg:col-span-2">
                <label htmlFor="fiscalCode" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Codice Fiscale <span className={colors.status.error.text}>*</span>
                </label>
                <input
                  id="fiscalCode"
                  type="text"
                  required
                  maxLength={16}
                  value={formData.fiscalCode}
                  onChange={(e) => handleChange('fiscalCode', e.target.value)}
                  onBlur={() => handleBlur('fiscalCode')}
                  className={`${getInputClass('fiscalCode')} uppercase tracking-widest font-mono`}
                  placeholder="RSSMRA85M01H501Z"
                />
                {touched.fiscalCode && fieldErrors.fiscalCode && (
                  <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.fiscalCode}
                  </p>
                )}
                <p className={`mt-1.5 text-xs ${colors.text.muted}`}>
                  16 caratteri alfanumerici (es. RSSMRA85M01H501Z)
                </p>
              </div>

              {/* Data di nascita */}
              <div>
                <label htmlFor="dateOfBirth" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Data di nascita <span className={colors.status.error.text}>*</span>
                </label>
                <DatePicker
                  id="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={(value) => handleChange('dateOfBirth', value)}
                  onBlur={() => handleBlur('dateOfBirth')}
                  hasError={!!(touched.dateOfBirth && fieldErrors.dateOfBirth)}
                  placeholder="Seleziona la tua data di nascita"
                  required
                />
                {touched.dateOfBirth && fieldErrors.dateOfBirth && (
                  <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.dateOfBirth}
                  </p>
                )}
              </div>

              {/* Telefono */}
              <div>
                <label htmlFor="phone" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Telefono <span className={colors.status.error.text}>*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  className={getInputClass('phone')}
                  placeholder="+39 333 123 4567"
                />
                {touched.phone && fieldErrors.phone && (
                  <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sezione 2: Residenza */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${colors.primary.bg} flex items-center justify-center`}>
                <span className="text-white font-semibold text-sm">2</span>
              </div>
              <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
                Indirizzo di Residenza
              </h3>
            </div>

            <div className="space-y-5">
              {/* Indirizzo - Full width */}
              <div>
                <label htmlFor="address" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Indirizzo <span className={colors.status.error.text}>*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  onBlur={() => handleBlur('address')}
                  className={getInputClass('address')}
                  placeholder="Via Roma 123"
                />
                {touched.address && fieldErrors.address && (
                  <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.address}
                  </p>
                )}
                <p className={`mt-1.5 text-xs ${colors.text.muted}`}>
                  Via/Piazza e numero civico
                </p>
              </div>

              {/* Città, Provincia, CAP in una riga */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Città */}
                <div className="sm:col-span-1">
                  <label htmlFor="city" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Città <span className={colors.status.error.text}>*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    onBlur={() => handleBlur('city')}
                    className={getInputClass('city')}
                    placeholder="Roma"
                  />
                  {touched.city && fieldErrors.city && (
                    <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {fieldErrors.city}
                    </p>
                  )}
                </div>

                {/* Provincia */}
                <div>
                  <label htmlFor="province" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Provincia <span className={colors.status.error.text}>*</span>
                  </label>
                  <CustomSelect
                    id="province"
                    value={formData.province}
                    options={PROVINCE_ITALIANE.map(prov => ({ value: prov, label: prov }))}
                    onChange={(value) => handleChange('province', value)}
                    onBlur={() => handleBlur('province')}
                    placeholder="Seleziona"
                    hasError={!!(touched.province && fieldErrors.province)}
                    searchable
                  />
                  {touched.province && fieldErrors.province && (
                    <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {fieldErrors.province}
                    </p>
                  )}
                </div>

                {/* CAP */}
                <div>
                  <label htmlFor="postalCode" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    CAP <span className={colors.status.error.text}>*</span>
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    required
                    maxLength={5}
                    value={formData.postalCode}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                    onBlur={() => handleBlur('postalCode')}
                    className={`${getInputClass('postalCode')} font-mono tracking-wider`}
                    placeholder="00100"
                  />
                  {touched.postalCode && fieldErrors.postalCode && (
                    <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {fieldErrors.postalCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3.5 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold ${colors.neutral.text.white} ${colors.primary.bg} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A01B3B] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
            >
              <ButtonLoader loading={loading} loadingText="Salvataggio in corso...">
                Completa Profilo
              </ButtonLoader>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-700/30 text-center">
          <p className={`text-sm ${colors.text.muted}`}>
            <span className={colors.status.error.text}>*</span> Campi obbligatori
          </p>
          <p className={`mt-2 text-xs ${colors.text.muted}`}>
            Il tuo account sarà attivato dagli amministratori dopo la verifica dei dati.
          </p>
        </div>
      </div>
    </div>
  );
}
