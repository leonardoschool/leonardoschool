'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { firebaseAuth } from '@/lib/firebase/auth';
import DatePicker from '@/components/ui/DatePicker';
import CustomSelect from '@/components/ui/CustomSelect';
import ParentGuardianForm from '@/components/ui/ParentGuardianForm';
import { Spinner, ButtonLoader } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';
import { parseError } from '@/lib/utils/errorHandler';
import { 
  calcolaCodiceFiscale, 
  isComuneSupportato,
  type DatiCodiceFiscale 
} from '@/lib/utils/codiceFiscaleCalculator';
import {
  validateCodiceFiscale,
  validateTelefono,
  validateCAP,
  validateProvincia,
  formatCitta,
  formatIndirizzo,
  validateDataNascita,
  validateProfileForm,
  validateParentGuardianForm,
  isMinor,
  PROVINCE_ITALIANE,
  type ProfileFormData,
  type ParentGuardianFormData,
} from '@/lib/validations/profileValidation';

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const isParentDataMode = searchParams.get('parentData') === 'true'; // Add/edit parent data only
  
  // Debug log
  console.log('[CompleteProfile] Modes:', { isEditMode, isParentDataMode, searchParams: searchParams.toString() });
  
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState('');
  
  // Field-level errors for inline validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Track which fields have been touched (for showing errors only after interaction)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Show parent form section
  const [showParentForm, setShowParentForm] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    fiscalCode: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    birthPlace: '',
    gender: undefined,
  });

  // Parent/Guardian form data
  const [parentFormData, setParentFormData] = useState<ParentGuardianFormData>({
    relationship: '',
    firstName: '',
    lastName: '',
    fiscalCode: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
  });

  // Get user to determine role
  const { data: user, error: authError } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  // Fetch existing profile for edit mode
  const { data: studentProfile } = trpc.students.getProfile.useQuery(undefined, {
    enabled: isEditMode && !!user && user.role === 'STUDENT',
  });
  
  const { data: collaboratorProfile } = trpc.collaborators.getProfile.useQuery(undefined, {
    enabled: isEditMode && !!user && user.role === 'COLLABORATOR',
  });

  // Fetch existing parent/guardian data for parent data mode OR edit mode
  const { data: existingParentGuardian } = trpc.students.getMyParentGuardian.useQuery(undefined, {
    enabled: (isParentDataMode || isEditMode) && !!user && user.role === 'STUDENT',
  });
  
  // Type assertion needed because Prisma types might not be updated yet
  const isCollaborator = (user?.role as string) === 'COLLABORATOR';
  const isStudent = (user?.role as string) === 'STUDENT';

  // Pre-populate form data in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    
    const profile = isStudent ? studentProfile : isCollaborator ? collaboratorProfile : null;
    if (profile) {
      setFormData({
        fiscalCode: profile.fiscalCode || '',
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        province: profile.province || '',
        postalCode: profile.postalCode || '',
        birthPlace: '',
        gender: undefined,
      });
    }
  }, [isEditMode, studentProfile, collaboratorProfile, isStudent, isCollaborator]);

  // Pre-populate parent data in parent data mode OR edit mode
  useEffect(() => {
    if ((!isParentDataMode && !isEditMode) || !existingParentGuardian) return;
    
    setParentFormData({
      relationship: existingParentGuardian.relationship || '',
      firstName: existingParentGuardian.firstName || '',
      lastName: existingParentGuardian.lastName || '',
      fiscalCode: existingParentGuardian.fiscalCode || '',
      phone: existingParentGuardian.phone || '',
      email: existingParentGuardian.email || '',
      address: existingParentGuardian.address || '',
      city: existingParentGuardian.city || '',
      province: existingParentGuardian.province || '',
      postalCode: existingParentGuardian.postalCode || '',
    });
    
    // Show parent form in edit mode if data exists
    if (isEditMode && existingParentGuardian) {
      setShowParentForm(true);
    }
  }, [isParentDataMode, isEditMode, existingParentGuardian]);

  // Check if admin has requested parent data (profile already completed, just needs parent data)
  const adminRequestedParentData = isStudent && 
    user?.profileCompleted && 
    user?.student?.requiresParentData && 
    !user?.student?.parentGuardian;

  // Check if we should show only parent data form (admin request OR user editing parent data)
  const showOnlyParentForm = adminRequestedParentData || isParentDataMode;

  // Check if student is minor based on date of birth (only relevant for new profile completion)
  const isMinorStudent = useMemo(() => {
    if (showOnlyParentForm) return false; // Don't check DOB if only editing parent data
    if (!formData.dateOfBirth || !isStudent) return false;
    return isMinor(formData.dateOfBirth);
  }, [formData.dateOfBirth, isStudent, showOnlyParentForm]);

  // Parent data is required for minors OR when admin has requested it OR in parent data mode
  const parentDataRequired = isMinorStudent || showOnlyParentForm;

  // Profile completion mutations
  const studentCompleteProfile = trpc.students.completeProfile.useMutation();
  const collaboratorCompleteProfile = trpc.collaborators.completeProfile.useMutation();
  const saveParentGuardian = trpc.students.saveParentGuardian.useMutation();

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

  // Automatically show parent form section when student is minor OR admin requested parent data OR in parent data mode
  useEffect(() => {
    if (isMinorStudent || showOnlyParentForm) {
      setShowParentForm(true);
    }
  }, [isMinorStudent, showOnlyParentForm]);

  // Redirect if profile is already completed OR if user is admin (admins don't need profile completion)
  useEffect(() => {
    if (user) {
      const role = user.role as string;
      
      // Admin users should never see this page - redirect immediately
      if (role === 'ADMIN') {
        window.location.href = '/dashboard';
        return;
      }
      
      // In edit mode or parent data mode, allow access even with completed profile
      if (isEditMode || isParentDataMode) {
        return;
      }
      
      // Redirect users with completed profiles to their dashboard
      // EXCEPT students who need to add parent data (parentDataRequired)
      if (user.profileCompleted) {
        // Allow students with parentDataRequired to access this page
        const hasParentDataRequired = role === 'STUDENT' && 
          user.student?.requiresParentData && 
          !user.student?.parentGuardian;
        
        if (!hasParentDataRequired) {
          window.location.href = '/dashboard';
        }
      }
    }
  }, [user, router, isEditMode, isParentDataMode]);

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

  // Calcola automaticamente il codice fiscale
  const handleCalculateFiscalCode = () => {
    // Verifica che tutti i dati necessari siano disponibili
    if (!user?.name) {
      showError('Errore', 'Nome completo non disponibile');
      return;
    }

    if (!formData.dateOfBirth) {
      showError('Campi mancanti', 'Inserisci la data di nascita');
      return;
    }

    if (!formData.gender) {
      showError('Campi mancanti', 'Seleziona il sesso');
      return;
    }

    if (!formData.birthPlace) {
      showError('Campi mancanti', 'Inserisci il luogo di nascita');
      return;
    }

    // Verifica che il comune sia supportato
    if (!isComuneSupportato(formData.birthPlace)) {
      showError(
        'Comune non supportato',
        `Il comune "${formData.birthPlace}" non è nella lista dei comuni supportati. Inserisci manualmente il codice fiscale o contatta il supporto.`
      );
      return;
    }

    // Estrae nome e cognome dal campo name (assume formato "Nome Cognome")
    const nameParts = user.name.trim().split(' ');
    let firstName = '';
    let lastName = '';

    if (nameParts.length === 1) {
      // Solo un nome, usa come cognome
      lastName = nameParts[0];
      firstName = nameParts[0];
    } else if (nameParts.length === 2) {
      firstName = nameParts[0];
      lastName = nameParts[1];
    } else {
      // Più di due parti: assume primo = nome, resto = cognome
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }

    const datiCalcolo: DatiCodiceFiscale = {
      nome: firstName,
      cognome: lastName,
      dataNascita: new Date(formData.dateOfBirth),
      sesso: formData.gender,
      comuneNascita: formData.birthPlace,
    };

    const cfCalcolato = calcolaCodiceFiscale(datiCalcolo);

    if (cfCalcolato) {
      setFormData(prev => ({ ...prev, fiscalCode: cfCalcolato }));
      setTouched(prev => ({ ...prev, fiscalCode: true }));
      validateField('fiscalCode', cfCalcolato);
      showSuccess('Codice Fiscale calcolato', 'Il codice fiscale è stato generato automaticamente. Puoi modificarlo se necessario.');
    } else {
      showError('Errore nel calcolo', 'Non è stato possibile calcolare il codice fiscale. Inseriscilo manualmente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Skip profile validation if showing only parent data form
    if (!showOnlyParentForm) {
      // Validate all fields
      const validation = validateProfileForm(formData);
      
      if (!validation.success) {
        // Type guard: we know errors exists when success is false
        const errors = 'errors' in validation ? validation.errors : {};
        setFieldErrors(prev => ({ ...prev, ...errors }));
        setTouched(prev => ({
          ...prev,
          fiscalCode: true,
          dateOfBirth: true,
          phone: true,
          address: true,
          city: true,
          province: true,
          postalCode: true,
        }));
        setError('Correggi gli errori nei campi evidenziati');
        return;
      }
    }

    // Validate parent data if required or if form is shown with data
    const hasParentData = showParentForm && (
      parentFormData.relationship || 
      parentFormData.firstName || 
      parentFormData.lastName || 
      parentFormData.fiscalCode || 
      parentFormData.phone
    );

    if (parentDataRequired || hasParentData) {
      const parentValidation = validateParentGuardianForm(parentFormData);
      
      if (!parentValidation.success) {
        const parentErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries('errors' in parentValidation ? parentValidation.errors : {})) {
          parentErrors[`parent_${key}`] = value;
        }
        setFieldErrors(prev => ({ ...prev, ...parentErrors }));
        setTouched(prev => ({
          ...prev,
          parent_relationship: true,
          parent_firstName: true,
          parent_lastName: true,
          parent_fiscalCode: true,
          parent_phone: true,
        }));
        
        if (parentDataRequired) {
          const errorMessage = showOnlyParentForm 
            ? 'Inserisci i dati del genitore/tutore'
            : 'Inserisci i dati del genitore/tutore (obbligatorio per minorenni)';
          setError(errorMessage);
          return;
        }
      }
    }

    setLoading(true);

    try {
      // If showing only parent data form, just save parent data
      if (showOnlyParentForm) {
        const parentValidation = validateParentGuardianForm(parentFormData);
        if (parentValidation.success) {
          await saveParentGuardian.mutateAsync({
            relationship: parentFormData.relationship as 'PADRE' | 'MADRE' | 'TUTORE_LEGALE' | 'ALTRO',
            firstName: parentFormData.firstName,
            lastName: parentFormData.lastName,
            fiscalCode: parentFormData.fiscalCode,
            phone: parentFormData.phone,
            email: parentFormData.email || undefined,
            address: parentFormData.address || undefined,
            city: parentFormData.city || undefined,
            province: parentFormData.province || undefined,
            postalCode: parentFormData.postalCode || undefined,
          });
        }
      } else {
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

          // Save parent/guardian data if provided
          if (hasParentData || parentDataRequired) {
            const parentValidation = validateParentGuardianForm(parentFormData);
            if (parentValidation.success) {
              await saveParentGuardian.mutateAsync({
                relationship: parentFormData.relationship as 'PADRE' | 'MADRE' | 'TUTORE_LEGALE' | 'ALTRO',
                firstName: parentFormData.firstName,
                lastName: parentFormData.lastName,
                fiscalCode: parentFormData.fiscalCode,
                phone: parentFormData.phone,
                email: parentFormData.email || undefined,
                address: parentFormData.address || undefined,
                city: parentFormData.city || undefined,
                province: parentFormData.province || undefined,
                postalCode: parentFormData.postalCode || undefined,
              });
            }
          }
        }
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
      if (adminRequestedParentData) {
        showSuccess('Dati genitore salvati', 'Il tuo account è stato riattivato.');
      } else if (isParentDataMode) {
        showSuccess('Dati genitore salvati', 'I dati sono stati aggiornati correttamente.');
      } else if (isEditMode) {
        showSuccess('Profilo aggiornato', 'I tuoi dati sono stati salvati correttamente.');
      } else {
        showSuccess('Profilo completato', 'In attesa di attivazione da parte dell\'amministratore.');
      }
      window.location.href = (isEditMode || isParentDataMode) ? '/profilo' : '/dashboard';
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
  // EXCEPT for students who need to add parent data (parentDataRequired) OR in edit mode OR in parent data mode
  if (user?.profileCompleted && !isEditMode && !isParentDataMode) {
    const hasParentDataRequired = (user.role as string) === 'STUDENT' && 
      user.student?.requiresParentData && 
      !user.student?.parentGuardian;
    
    if (!hasParentDataRequired) {
      return (
        <div className={`min-h-screen ${colors.background.authPage} flex items-center justify-center`}>
          <div className="text-center">
            <Spinner size="lg" />
            <p className={`mt-4 text-sm ${colors.text.secondary}`}>Profilo già completato, reindirizzamento...</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className={`w-full ${colors.background.card} py-8 px-6 sm:px-10 lg:px-12 ${colors.effects.shadow.xl} rounded-2xl`}>
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
            {adminRequestedParentData 
              ? 'Inserisci dati genitore/tutore' 
              : isEditMode 
              ? 'Modifica il tuo profilo'
              : 'Completa il tuo profilo'}
          </h2>
          <p className={`mt-2 text-sm sm:text-base ${colors.text.secondary}`}>
            {adminRequestedParentData 
              ? 'L\'amministratore ha richiesto l\'inserimento dei dati del genitore o tutore legale'
              : isEditMode
              ? 'Aggiorna i tuoi dati anagrafici'
              : 'Inserisci i tuoi dati anagrafici per accedere alla piattaforma'}
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

          {/* Sezione 1: Dati Personali - Nascosta quando si modifica solo dati genitore */}
          {!showOnlyParentForm && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${colors.primary.bg} flex items-center justify-center`}>
                <span className="text-white font-semibold text-sm">1</span>
              </div>
              <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
                Dati Anagrafici
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

              {/* Sesso */}
              <div>
                <label htmlFor="gender" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Sesso
                </label>
                <CustomSelect
                  id="gender"
                  value={formData.gender || ''}
                  onChange={(value) => handleChange('gender', value)}
                  options={[
                    { value: 'M', label: 'Maschio' },
                    { value: 'F', label: 'Femmina' }
                  ]}
                  placeholder="Seleziona"
                />
              </div>

              {/* Luogo di nascita */}
              <div>
                <label htmlFor="birthPlace" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Luogo di nascita
                </label>
                <input
                  id="birthPlace"
                  type="text"
                  value={formData.birthPlace || ''}
                  onChange={(e) => handleChange('birthPlace', e.target.value)}
                  className={`block w-full px-4 py-2.5 text-base ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A01B3B] focus:border-transparent transition-all`}
                  placeholder="Es. Roma, Milano..."
                />
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

              {/* Codice Fiscale - Full width con bottone di calcolo */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="fiscalCode" className={`block text-sm font-medium ${colors.text.primary}`}>
                    Codice Fiscale <span className={colors.status.error.text}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCalculateFiscalCode}
                    className={`px-3 py-1.5 text-sm font-medium ${colors.primary.text} ${colors.background.hover} rounded-lg transition-colors hover:opacity-80 flex items-center gap-2`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Calcola automaticamente
                  </button>
                </div>
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
                  Compila data nascita, sesso e luogo di nascita per calcolare automaticamente
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Sezione 2: Residenza - Nascosta quando si modifica solo dati genitore */}
          {!showOnlyParentForm && (
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
          )}

          {/* Sezione 3: Dati Genitore/Tutore (solo per studenti) */}
          {isStudent && (
            <div className="space-y-5">
              {/* Show toggle for adult students - only when NOT in parent data mode */}
              {!showOnlyParentForm && !isMinorStudent && !showParentForm && (
                <button
                  type="button"
                  onClick={() => setShowParentForm(true)}
                  className={`w-full p-4 rounded-lg border-2 border-dashed ${colors.border.primary} hover:border-[#A01B3B] transition-colors flex items-center justify-center gap-2 ${colors.text.secondary} hover:${colors.text.primary}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Aggiungi dati genitore/tutore (facoltativo)
                </button>
              )}

              {/* Parent form */}
              {showParentForm && (
                <div className={`p-6 rounded-xl ${colors.background.secondary} border ${colors.border.primary}`}>
                  {/* Show remove button only for adult students who voluntarily added parent data */}
                  {!showOnlyParentForm && !isMinorStudent && (
                    <div className="flex justify-end mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowParentForm(false);
                          // Clear parent form data
                          setParentFormData({
                            relationship: '',
                            firstName: '',
                            lastName: '',
                            fiscalCode: '',
                            phone: '',
                            email: '',
                            address: '',
                            city: '',
                            province: '',
                            postalCode: '',
                          });
                          // Clear parent errors
                          const newErrors = { ...fieldErrors };
                          Object.keys(newErrors).forEach(key => {
                            if (key.startsWith('parent_')) {
                              delete newErrors[key];
                            }
                          });
                          setFieldErrors(newErrors);
                        }}
                        className={`text-sm ${colors.text.muted} hover:${colors.text.primary} transition-colors`}
                      >
                        Rimuovi sezione
                      </button>
                    </div>
                  )}
                  <ParentGuardianForm
                    formData={parentFormData}
                    onChange={setParentFormData}
                    fieldErrors={fieldErrors}
                    setFieldErrors={setFieldErrors}
                    touched={touched}
                    setTouched={setTouched}
                    isRequired={parentDataRequired}
                    sectionNumber={showOnlyParentForm ? 1 : 3}
                    reason={
                      isParentDataMode 
                        ? undefined  // Editing existing parent data - show neutral message
                        : adminRequestedParentData 
                        ? 'admin_request' 
                        : isMinorStudent 
                        ? 'minor' 
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3.5 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold ${colors.neutral.text.white} ${colors.primary.bg} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A01B3B] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
            >
              <ButtonLoader loading={loading} loadingText="Salvataggio in corso...">
                {adminRequestedParentData 
                  ? 'Salva dati genitore' 
                  : isEditMode 
                  ? 'Salva modifiche' 
                  : 'Completa Profilo'}
              </ButtonLoader>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-700/30 text-center">
          <p className={`text-sm ${colors.text.muted}`}>
            <span className={colors.status.error.text}>*</span> Campi obbligatori
          </p>
          {!adminRequestedParentData && !isEditMode && (
            <p className={`mt-2 text-xs ${colors.text.muted}`}>
              Il tuo account sarà attivato dagli amministratori dopo la verifica dei dati.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
