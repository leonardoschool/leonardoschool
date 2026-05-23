'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Portal } from '@/components/ui/Portal';
import CustomSelect from '@/components/ui/CustomSelect';
import DatePicker from '@/components/ui/DatePicker';
import { ButtonLoader } from '@/components/ui/loaders';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import { X, User, MapPin } from 'lucide-react';
import {
  PROVINCE_ITALIANE,
  validateCodiceFiscale,
  validateTelefono,
  validateCAP,
  validateProvincia,
  validateDataNascita,
  validateBirthPlace,
} from '@/lib/validations/profileValidation';

interface EditableUser {
  id: string;
  name: string;
  role: string;
  profileCompleted: boolean;
  student?: {
    fiscalCode?: string | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    birthPlace?: string | null;
  } | null;
  collaborator?: {
    fiscalCode?: string | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    birthPlace?: string | null;
  } | null;
}

interface AdminEditUserModalProps {
  user: EditableUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export default function AdminEditUserModal({ user, isOpen, onClose, onSuccess }: AdminEditUserModalProps) {
  const { showSuccess, showError } = useToast();
  const { handleMutationError } = useApiError();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [profile, setProfile] = useState({
    fiscalCode: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    birthPlace: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasProfile = !!user?.profileCompleted && !!(user?.student || user?.collaborator);
  const profileData = user?.student ?? user?.collaborator ?? null;

  useEffect(() => {
    if (!user) return;
    const { firstName: fn, lastName: ln } = splitName(user.name);
    setFirstName(fn);
    setLastName(ln);
    setFieldErrors({});

    if (profileData) {
      setProfile({
        fiscalCode: profileData.fiscalCode ?? '',
        dateOfBirth: profileData.dateOfBirth
          ? new Date(profileData.dateOfBirth).toISOString().split('T')[0]
          : '',
        phone: profileData.phone ?? '',
        address: profileData.address ?? '',
        city: profileData.city ?? '',
        province: profileData.province ?? '',
        postalCode: profileData.postalCode ?? '',
        birthPlace: profileData.birthPlace ?? '',
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateName = trpc.users.adminUpdateUserName.useMutation({
    onError: handleMutationError,
  });

  const updateProfile = trpc.users.adminUpdateUserProfile.useMutation({
    onError: handleMutationError,
  });

  const validateProfileFields = (): boolean => {
    const errors: Record<string, string> = {};

    const cf = validateCodiceFiscale(profile.fiscalCode);
    if (!cf.isValid) errors.fiscalCode = cf.error ?? 'Codice fiscale non valido';

    const dob = validateDataNascita(profile.dateOfBirth);
    if (!dob.isValid) errors.dateOfBirth = dob.error ?? 'Data non valida';

    const birthPlace = validateBirthPlace(profile.birthPlace);
    if (!birthPlace.isValid) errors.birthPlace = birthPlace.error ?? 'Luogo di nascita obbligatorio';

    const phone = validateTelefono(profile.phone);
    if (!phone.isValid) errors.phone = phone.error ?? 'Telefono non valido';

    if (!profile.address.trim() || profile.address.trim().length < 5)
      errors.address = "Indirizzo troppo corto";

    if (!profile.city.trim() || profile.city.trim().length < 2)
      errors.city = 'Città obbligatoria';

    const prov = validateProvincia(profile.province);
    if (!prov.isValid) errors.province = prov.error ?? 'Provincia non valida';

    const cap = validateCAP(profile.postalCode);
    if (!cap.isValid) errors.postalCode = cap.error ?? 'CAP non valido';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!firstName.trim()) {
      showError('Errore', 'Il nome è obbligatorio');
      return;
    }
    if (!lastName.trim()) {
      showError('Errore', 'Il cognome è obbligatorio');
      return;
    }

    if (hasProfile && !validateProfileFields()) return;

    try {
      await updateName.mutateAsync({ userId: user.id, firstName: firstName.trim(), lastName: lastName.trim() });

      if (hasProfile) {
        await updateProfile.mutateAsync({
          userId: user.id,
          fiscalCode: profile.fiscalCode,
          dateOfBirth: new Date(profile.dateOfBirth),
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          province: profile.province,
          postalCode: profile.postalCode,
          birthPlace: profile.birthPlace.trim(),
        });
      }

      showSuccess('Dati aggiornati', 'I dati dell\'utente sono stati salvati correttamente.');
      onSuccess();
      onClose();
    } catch {
      // errors handled by handleMutationError
    }
  };

  const isLoading = updateName.isPending || updateProfile.isPending;

  const inputClass = (field: string) => {
    const base = `block w-full px-3 py-2 text-sm ${colors.background.input} ${colors.text.primary} border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all`;
    return fieldErrors[field]
      ? `${base} border-red-500 focus:ring-red-500`
      : `${base} ${colors.border.primary} focus:ring-[#A01B3B] focus:border-transparent`;
  };

  if (!isOpen || !user) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
        <div className={`${colors.background.card} rounded-2xl w-full max-w-xl my-8 shadow-2xl`}>
          {/* Header */}
          <div className={`p-6 border-b ${colors.border.primary} flex items-center justify-between`}>
            <div>
              <h3 className={`text-lg font-bold ${colors.text.primary}`}>Modifica dati utente</h3>
              <p className={`text-sm ${colors.text.muted} mt-0.5`}>{user.name}</p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:${colors.background.secondary} ${colors.text.muted}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

            {/* Sezione 1 — Account */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 ${colors.primary.text}`} />
                <h4 className={`font-semibold text-sm ${colors.text.primary}`}>Dati account</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass('firstName')}
                    placeholder="Mario"
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                    Cognome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass('lastName')}
                    placeholder="Rossi"
                  />
                </div>
              </div>
            </div>

            {/* Sezione 2 — Profilo (solo se completato) */}
            {hasProfile && (
              <div className="space-y-4">
                <div className={`border-t ${colors.border.primary} pt-4 flex items-center gap-2`}>
                  <MapPin className={`w-4 h-4 ${colors.primary.text}`} />
                  <h4 className={`font-semibold text-sm ${colors.text.primary}`}>Dati anagrafici</h4>
                </div>

                {/* Codice fiscale */}
                <div>
                  <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                    Codice Fiscale <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={profile.fiscalCode}
                    onChange={(e) => setProfile(p => ({ ...p, fiscalCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) }))}
                    className={`${inputClass('fiscalCode')} uppercase font-mono tracking-widest`}
                    placeholder="RSSMRA85M01H501Z"
                  />
                  {fieldErrors.fiscalCode && <p className="mt-1 text-xs text-red-500">{fieldErrors.fiscalCode}</p>}
                </div>

                {/* Data di nascita + Luogo di nascita */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                      Data di nascita <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      id="admin-edit-dob"
                      value={profile.dateOfBirth}
                      onChange={(val) => setProfile(p => ({ ...p, dateOfBirth: val }))}
                      hasError={!!fieldErrors.dateOfBirth}
                      placeholder="gg/mm/aaaa"
                    />
                    {fieldErrors.dateOfBirth && <p className="mt-1 text-xs text-red-500">{fieldErrors.dateOfBirth}</p>}
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                      Luogo di nascita <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.birthPlace}
                      onChange={(e) => setProfile(p => ({ ...p, birthPlace: e.target.value }))}
                      className={inputClass('birthPlace')}
                      placeholder="Roma"
                    />
                    {fieldErrors.birthPlace && <p className="mt-1 text-xs text-red-500">{fieldErrors.birthPlace}</p>}
                  </div>
                </div>

                {/* Telefono */}
                <div>
                  <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                    Telefono <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value.replace(/[^\d\s+]/g, '') }))}
                    className={inputClass('phone')}
                    placeholder="+39 333 123 4567"
                  />
                  {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
                </div>

                {/* Indirizzo */}
                <div>
                  <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                    Indirizzo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))}
                    className={inputClass('address')}
                    placeholder="Via Roma 123"
                  />
                  {fieldErrors.address && <p className="mt-1 text-xs text-red-500">{fieldErrors.address}</p>}
                </div>

                {/* Città / Provincia / CAP */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                      Città <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.city}
                      onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                      className={inputClass('city')}
                      placeholder="Roma"
                    />
                    {fieldErrors.city && <p className="mt-1 text-xs text-red-500">{fieldErrors.city}</p>}
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                      Prov. <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      id="admin-edit-province"
                      value={profile.province}
                      options={PROVINCE_ITALIANE.map(p => ({ value: p, label: p }))}
                      onChange={(val) => setProfile(p => ({ ...p, province: val }))}
                      placeholder="--"
                      hasError={!!fieldErrors.province}
                      searchable
                    />
                    {fieldErrors.province && <p className="mt-1 text-xs text-red-500">{fieldErrors.province}</p>}
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${colors.text.secondary} mb-1`}>
                      CAP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={profile.postalCode}
                      onChange={(e) => setProfile(p => ({ ...p, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                      className={`${inputClass('postalCode')} font-mono`}
                      placeholder="00100"
                    />
                    {fieldErrors.postalCode && <p className="mt-1 text-xs text-red-500">{fieldErrors.postalCode}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${colors.border.primary} flex gap-3`}>
            <button
              onClick={onClose}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-xl ${colors.background.secondary} ${colors.text.primary} font-medium text-sm disabled:opacity-50`}
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-xl ${colors.primary.bg} text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              <ButtonLoader loading={isLoading} loadingText="Salvataggio...">
                Salva modifiche
              </ButtonLoader>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
