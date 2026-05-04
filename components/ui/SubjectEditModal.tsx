'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Save, GraduationCap } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import Button from '@/components/ui/Button';
import { ButtonLoader } from '@/components/ui/loaders';

export interface SubjectFormData {
  name: string;
  code: string;
  description: string;
  color: string;
  icon: string;
  order: number;
}

export interface SubjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: SubjectFormData & { id?: string } | null;
  onSave: (data: SubjectFormData) => void;
  isLoading: boolean;
}

/**
 * Modal for creating/editing a subject (materia).
 * 
 * Features:
 * - Name, code, color, icon, order, description fields
 * - Color picker with hex input
 * - Validation
 * - Used by Admin and Collaborators
 */
export function SubjectEditModal({
  isOpen,
  onClose,
  subject,
  onSave,
  isLoading,
}: SubjectEditModalProps) {
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    code: '',
    description: '',
    color: '#6366f1',
    icon: '',
    order: 0,
  });

  // Initialize form when subject changes
  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name,
        code: subject.code,
        description: subject.description,
        color: subject.color,
        icon: subject.icon,
        order: subject.order,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        color: '#6366f1',
        icon: '',
        order: 0,
      });
    }
  }, [subject, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEdit = !!subject?.id;

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={onClose} disabled={isLoading}>
        Annulla
      </Button>
      <Button onClick={handleSubmit} disabled={isLoading || !formData.name.trim() || !formData.code.trim()}>
        <ButtonLoader loading={isLoading} loadingText={isEdit ? 'Salvataggio...' : 'Creazione...'}>
          <Save className="w-4 h-4 mr-2" />
          {isEdit ? 'Salva' : 'Crea Materia'}
        </ButtonLoader>
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Modifica Materia' : 'Nuova Materia'}
      subtitle={isEdit ? `Modifica ${subject?.name}` : 'Crea una nuova materia didattica'}
      icon={<GraduationCap className="w-7 h-7" />}
      variant="primary"
      size="lg"
      footer={footerContent}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      hideCloseButton={isLoading}
    >
      <form id="subject-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Name, Code, Order */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/50 focus:border-transparent transition-all`}
              placeholder="Es: Biologia"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Codice <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/50 focus:border-transparent uppercase transition-all`}
              placeholder="Es: BIO"
              maxLength={10}
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Ordine
            </label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/50 focus:border-transparent transition-all`}
              placeholder="0"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Color and Icon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Colore
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-12 rounded-lg border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className={`flex-1 px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/50 focus:border-transparent font-mono transition-all`}
                placeholder="#6366f1"
                pattern="^#[0-9A-Fa-f]{6}$"
                disabled={isLoading}
              />
            </div>
            <p className={`text-xs ${colors.text.muted} mt-1`}>
              Seleziona o inserisci un colore hex
            </p>
          </div>
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Icona (emoji o nome)
            </label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/50 focus:border-transparent transition-all`}
              placeholder="Es: 🧬 o dna"
              disabled={isLoading}
            />
            <p className={`text-xs ${colors.text.muted} mt-1`}>
              Opzionale: emoji o nome icona
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Descrizione
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/50 focus:border-transparent resize-none transition-all`}
            placeholder="Descrizione opzionale della materia..."
            disabled={isLoading}
          />
        </div>

        {/* Preview */}
        {formData.name && formData.code && (
          <div className={`p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
            <p className={`text-xs font-medium uppercase tracking-wide ${colors.text.muted} mb-2`}>
              Anteprima
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: formData.color }}
              >
                {formData.icon || formData.code.charAt(0)}
              </div>
              <div>
                <p className={`font-semibold ${colors.text.primary}`}>{formData.name}</p>
                <p className={`text-sm ${colors.text.secondary}`}>{formData.code}</p>
              </div>
            </div>
            {formData.description && (
              <p className={`text-sm ${colors.text.secondary} mt-2`}>{formData.description}</p>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}

export default SubjectEditModal;
