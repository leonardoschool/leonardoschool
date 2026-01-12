'use client';

import { useState, useEffect } from 'react';
import { colors } from '@/lib/theme/colors';
import CustomSelect from '@/components/ui/CustomSelect';
import DatePicker from '@/components/ui/DatePicker';
import { useToast } from '@/components/ui/Toast';
import { 
  calcolaCodiceFiscale, 
  isComuneSupportato,
  type DatiCodiceFiscale 
} from '@/lib/utils/codiceFiscaleCalculator';
import { 
  PARENT_RELATIONSHIP_TYPES,
  validateNome,
  validateCodiceFiscale,
  validateTelefono,
  validateEmailOptional,
  formatIndirizzo,
  formatCitta,
  validateProvincia,
  validateCAP,
  PROVINCE_ITALIANE,
  type ParentGuardianFormData,
} from '@/lib/validations/profileValidation';
import { Users } from 'lucide-react';

interface ParentGuardianFormProps {
  formData: ParentGuardianFormData;
  onChange: (data: ParentGuardianFormData) => void;
  fieldErrors: Record<string, string>;
  setFieldErrors: (errors: Record<string, string>) => void;
  touched: Record<string, boolean>;
  setTouched: (touched: Record<string, boolean>) => void;
  isRequired: boolean;
  sectionNumber: number;
  reason?: 'minor' | 'admin_request'; // Reason why parent data is required
}

export default function ParentGuardianForm({
  formData,
  onChange,
  fieldErrors,
  setFieldErrors,
  touched,
  setTouched,
  isRequired,
  sectionNumber,
  reason,
}: ParentGuardianFormProps) {
  const { showError, showSuccess } = useToast();

  // Calcola automaticamente il codice fiscale
  const handleCalculateFiscalCode = () => {
    // Verifica che tutti i dati necessari siano disponibili
    if (!formData.firstName || !formData.lastName) {
      showError('Campi mancanti', 'Inserisci nome e cognome');
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

    const datiCalcolo: DatiCodiceFiscale = {
      nome: formData.firstName,
      cognome: formData.lastName,
      dataNascita: new Date(formData.dateOfBirth),
      sesso: formData.gender,
      comuneNascita: formData.birthPlace,
    };

    const cfCalcolato = calcolaCodiceFiscale(datiCalcolo);

    if (cfCalcolato) {
      onChange({ ...formData, fiscalCode: cfCalcolato });
      setTouched({ ...touched, parent_fiscalCode: true });
      validateField('fiscalCode', cfCalcolato);
      showSuccess('Codice Fiscale calcolato', 'Il codice fiscale è stato generato automaticamente. Puoi modificarlo se necessario.');
    } else {
      showError('Errore nel calcolo', 'Non è stato possibile calcolare il codice fiscale. Inseriscilo manualmente.');
    }
  };

  // Validate a single field and update errors
  const validateField = (field: keyof ParentGuardianFormData, value: string) => {
    let result;
    switch (field) {
      case 'relationship':
        if (!value) {
          result = { isValid: false, error: 'Seleziona il tipo di relazione' };
        } else {
          result = { isValid: true };
        }
        break;
      case 'firstName':
        result = validateNome(value, 'nome');
        break;
      case 'lastName':
        result = validateNome(value, 'cognome');
        break;
      case 'fiscalCode':
        result = validateCodiceFiscale(value);
        break;
      case 'phone':
        result = validateTelefono(value);
        break;
      case 'email':
        result = validateEmailOptional(value);
        break;
      case 'address':
        if (!value || !value.trim()) {
          result = { isValid: true }; // Optional
        } else {
          result = formatIndirizzo(value);
        }
        break;
      case 'city':
        if (!value || !value.trim()) {
          result = { isValid: true }; // Optional
        } else {
          result = formatCitta(value);
        }
        break;
      case 'province':
        if (!value || !value.trim()) {
          result = { isValid: true }; // Optional
        } else {
          result = validateProvincia(value);
        }
        break;
      case 'postalCode':
        if (!value || !value.trim()) {
          result = { isValid: true }; // Optional
        } else {
          result = validateCAP(value);
        }
        break;
      default:
        result = { isValid: true };
    }
    
    const newErrors = { ...fieldErrors };
    if (result.isValid) {
      delete newErrors[`parent_${field}`];
    } else {
      newErrors[`parent_${field}`] = result.error || '';
    }
    setFieldErrors(newErrors);
    
    return result;
  };

  // Handle field blur
  const handleBlur = (field: keyof ParentGuardianFormData) => {
    setTouched({ ...touched, [`parent_${field}`]: true });
    validateField(field, formData[field] || '');
  };

  // Handle input change
  const handleChange = (field: keyof ParentGuardianFormData, value: string) => {
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
        formattedValue = value.replace(/[^\d\s+]/g, '');
        break;
      case 'firstName':
      case 'lastName':
        // Allow letters, spaces, apostrophes, hyphens
        formattedValue = value.replace(/[^A-Za-zÀ-ÿ\s'-]/g, '');
        break;
    }
    
    onChange({ ...formData, [field]: formattedValue });
    
    // For select fields, validate immediately
    if (field === 'relationship' || field === 'province') {
      setTouched({ ...touched, [`parent_${field}`]: true });
      setTimeout(() => validateField(field, formattedValue), 0);
    } else if (touched[`parent_${field}`] && fieldErrors[`parent_${field}`]) {
      validateField(field, formattedValue);
    }
  };

  // Helper to get input class based on error state
  const getInputClass = (field: keyof ParentGuardianFormData) => {
    const hasError = touched[`parent_${field}`] && fieldErrors[`parent_${field}`];
    const baseClass = `block w-full px-4 py-2.5 text-base ${colors.background.input} ${colors.text.primary} border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all`;
    
    if (hasError) {
      return `${baseClass} border-red-500 focus:ring-red-500 focus:border-red-500`;
    }
    return `${baseClass} ${colors.border.primary} focus:ring-[#A01B3B] focus:border-transparent`;
  };

  // Error display helper
  const ErrorMessage = ({ field }: { field: keyof ParentGuardianFormData }) => {
    if (!touched[`parent_${field}`] || !fieldErrors[`parent_${field}`]) return null;
    return (
      <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {fieldErrors[`parent_${field}`]}
      </p>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full ${colors.primary.bg} flex items-center justify-center`}>
          <span className="text-white font-semibold text-sm">{sectionNumber}</span>
        </div>
        <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
          Dati Genitore/Tutore
        </h3>
        {!isRequired && (
          <span className={`text-xs px-2 py-1 rounded-full ${colors.background.secondary} ${colors.text.muted}`}>
            Facoltativo
          </span>
        )}
      </div>

      {/* Info box */}
      <div className={`p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
        <div className="flex items-start gap-3">
          <Users className={`w-5 h-5 ${colors.primary.text} flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`text-sm ${colors.text.secondary}`}>
              {reason === 'minor' && isRequired
                ? 'In quanto minorenne, è obbligatorio inserire i dati di un genitore o tutore legale.'
                : reason === 'admin_request' && isRequired
                ? 'L\'amministrazione ha richiesto l\'inserimento dei dati di un genitore o tutore legale.'
                : 'Puoi inserire i dati di un genitore o tutore legale. Questi dati possono essere richiesti successivamente dall\'amministrazione.'
              }
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Relationship Type */}
        <div className="md:col-span-2">
          <label htmlFor="parentRelationship" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Tipo di Relazione {isRequired && <span className={colors.status.error.text}>*</span>}
          </label>
          <CustomSelect
            id="parentRelationship"
            value={formData.relationship}
            options={PARENT_RELATIONSHIP_TYPES.map(r => ({ value: r.value, label: r.label }))}
            onChange={(value) => handleChange('relationship', value)}
            onBlur={() => handleBlur('relationship')}
            placeholder="Seleziona il tipo di relazione..."
            hasError={!!(touched['parent_relationship'] && fieldErrors['parent_relationship'])}
          />
          <ErrorMessage field="relationship" />
        </div>

        {/* First Name */}
        <div>
          <label htmlFor="parentFirstName" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Nome {isRequired && <span className={colors.status.error.text}>*</span>}
          </label>
          <input
            id="parentFirstName"
            type="text"
            required={isRequired}
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            onBlur={() => handleBlur('firstName')}
            className={getInputClass('firstName')}
            placeholder="Mario"
          />
          <ErrorMessage field="firstName" />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="parentLastName" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Cognome {isRequired && <span className={colors.status.error.text}>*</span>}
          </label>
          <input
            id="parentLastName"
            type="text"
            required={isRequired}
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            onBlur={() => handleBlur('lastName')}
            className={getInputClass('lastName')}
            placeholder="Rossi"
          />
          <ErrorMessage field="lastName" />
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="parentDateOfBirth" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Data di nascita
          </label>
          <DatePicker
            id="parentDateOfBirth"
            value={formData.dateOfBirth || ''}
            onChange={(value) => handleChange('dateOfBirth', value)}
            placeholder="Seleziona data di nascita"
          />
        </div>

        {/* Gender */}
        <div>
          <label htmlFor="parentGender" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Sesso
          </label>
          <CustomSelect
            id="parentGender"
            value={formData.gender || ''}
            onChange={(value) => handleChange('gender', value)}
            options={[
              { value: 'M', label: 'Maschio' },
              { value: 'F', label: 'Femmina' }
            ]}
            placeholder="Seleziona"
          />
        </div>

        {/* Birth Place */}
        <div>
          <label htmlFor="parentBirthPlace" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Luogo di nascita
          </label>
          <input
            id="parentBirthPlace"
            type="text"
            value={formData.birthPlace || ''}
            onChange={(e) => handleChange('birthPlace', e.target.value)}
            className={`block w-full px-4 py-2.5 text-base ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A01B3B] focus:border-transparent transition-all`}
            placeholder="Es. Roma, Milano..."
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="parentPhone" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Telefono {isRequired && <span className={colors.status.error.text}>*</span>}
          </label>
          <input
            id="parentPhone"
            type="tel"
            required={isRequired}
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            className={getInputClass('phone')}
            placeholder="+39 333 123 4567"
          />
          <ErrorMessage field="phone" />
        </div>

        {/* Fiscal Code with calculate button - Full width */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="parentFiscalCode" className={`block text-sm font-medium ${colors.text.primary}`}>
              Codice Fiscale {isRequired && <span className={colors.status.error.text}>*</span>}
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
            id="parentFiscalCode"
            type="text"
            required={isRequired}
            maxLength={16}
            value={formData.fiscalCode}
            onChange={(e) => handleChange('fiscalCode', e.target.value)}
            onBlur={() => handleBlur('fiscalCode')}
            className={`${getInputClass('fiscalCode')} uppercase tracking-widest font-mono`}
            placeholder="RSSMRA65A01H501Z"
          />
          <ErrorMessage field="fiscalCode" />
          <p className={`mt-1.5 text-xs ${colors.text.muted}`}>
            Compila data nascita, sesso e luogo di nascita per calcolare automaticamente
          </p>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="parentEmail" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Email <span className={colors.text.muted}>(facoltativo)</span>
          </label>
          <input
            id="parentEmail"
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            className={getInputClass('email')}
            placeholder="email@esempio.com"
          />
          <ErrorMessage field="email" />
        </div>
      </div>

      {/* Optional Address Section */}
      <div className="pt-4">
        <p className={`text-sm font-medium ${colors.text.primary} mb-3`}>
          Indirizzo di residenza <span className={colors.text.muted}>(facoltativo)</span>
        </p>
        
        <div className="space-y-5">
          {/* Address */}
          <div>
            <label htmlFor="parentAddress" className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
              Indirizzo
            </label>
            <input
              id="parentAddress"
              type="text"
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              onBlur={() => handleBlur('address')}
              className={getInputClass('address')}
              placeholder="Via Roma 123"
            />
            <ErrorMessage field="address" />
          </div>

          {/* City, Province, Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label htmlFor="parentCity" className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                Città
              </label>
              <input
                id="parentCity"
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                onBlur={() => handleBlur('city')}
                className={getInputClass('city')}
                placeholder="Roma"
              />
              <ErrorMessage field="city" />
            </div>

            <div>
              <label htmlFor="parentProvince" className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                Provincia
              </label>
              <CustomSelect
                id="parentProvince"
                value={formData.province || ''}
                options={PROVINCE_ITALIANE.map(prov => ({ value: prov, label: prov }))}
                onChange={(value) => handleChange('province', value)}
                onBlur={() => handleBlur('province')}
                placeholder="Seleziona"
                hasError={!!(touched['parent_province'] && fieldErrors['parent_province'])}
                searchable
              />
              <ErrorMessage field="province" />
            </div>

            <div>
              <label htmlFor="parentPostalCode" className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                CAP
              </label>
              <input
                id="parentPostalCode"
                type="text"
                maxLength={5}
                value={formData.postalCode || ''}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                onBlur={() => handleBlur('postalCode')}
                className={`${getInputClass('postalCode')} font-mono tracking-wider`}
                placeholder="00100"
              />
              <ErrorMessage field="postalCode" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
