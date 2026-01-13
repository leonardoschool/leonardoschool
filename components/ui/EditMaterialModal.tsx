/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Portal } from '@/components/ui/Portal';
import { X, Upload, Link as LinkIcon, Save, FileText, Video, File } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { firebaseStorage } from '@/lib/firebase/storage';
import { useToast } from '@/components/ui/Toast';
import CustomSelect from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';

type MaterialType = 'PDF' | 'VIDEO' | 'LINK' | 'DOCUMENT';
type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

interface EditMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: any;
  subjects: any[];
  topics: any[];
  selectedTopic: any;
  categories: any[];
  onSave: (data: any) => void;
  isLoading: boolean;
}

const typeIcons: Record<MaterialType, typeof FileText> = {
  PDF: FileText,
  VIDEO: Video,
  LINK: LinkIcon,
  DOCUMENT: File,
};

const typeLabels: Record<MaterialType, string> = {
  PDF: 'PDF',
  VIDEO: 'Video',
  LINK: 'Link Esterno',
  DOCUMENT: 'Documento',
};

const difficultyLabels: Record<DifficultyLevel, string> = {
  EASY: 'Facile',
  MEDIUM: 'Medio',
  HARD: 'Difficile',
};

export function EditMaterialModal({
  isOpen,
  onClose,
  material,
  subjects,
  topics,
  selectedTopic,
  categories,
  onSave,
  isLoading,
}: EditMaterialModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'PDF' as MaterialType,
    categoryIds: [] as string[],
    subjectId: '',
    topicId: '',
    subTopicId: '',
    externalUrl: '',
  });
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showError } = useToast();

  // Initialize form data when material changes
  useEffect(() => {
    if (material) {
      setFormData({
        title: material.title || '',
        description: material.description || '',
        type: material.type || 'PDF',
        categoryIds: material.categories?.map((c: any) => c.categoryId || c.category?.id).filter(Boolean) || [],
        subjectId: material.subjectId || '',
        topicId: material.topicId || '',
        subTopicId: material.subTopicId || '',
        externalUrl: material.externalUrl || '',
      });
    }
  }, [material]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Upload new file if selected
    let fileData: any = {
      fileUrl: material.fileUrl,
      fileName: material.fileName,
      fileSize: material.fileSize,
      externalUrl: material.externalUrl,
    };

    if (uploadFile && formData.type !== 'LINK') {
      setUploading(true);
      try {
        const { url } = await firebaseStorage.uploadMaterialFile(
          uploadFile,
          formData.type.toLowerCase(),
          (progress) => setUploadProgress(progress)
        );

        fileData = {
          fileUrl: url,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
        };
      } catch {
        showError('Errore caricamento', 'Si è verificato un errore durante il caricamento del file.');
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (formData.type === 'LINK') {
      fileData.externalUrl = formData.externalUrl;
    }

    onSave({
      id: material.id,
      title: formData.title,
      description: formData.description || undefined,
      type: formData.type,
      categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : undefined,
      subjectId: formData.subjectId || undefined,
      topicId: formData.topicId || undefined,
      subTopicId: formData.subTopicId || undefined,
      ...fileData,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const TypeIcon = typeIcons[formData.type];

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
        onClick={onClose}
      >
        <div
          className={`${colors.background.card} rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header con gradient */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-500 to-indigo-600">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            disabled={isLoading || uploading}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <TypeIcon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">
                Modifica Materiale
              </h2>
              <p className="text-sm text-white/80 mt-1">
                Modifica i dettagli e i contenuti del materiale didattico
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form id="edit-material-form" onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Titolo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2.5 ${colors.background.secondary} border ${colors.border.light} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${colors.text.primary} transition-colors`}
              required
              disabled={isLoading || uploading}
            />
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
              className={`w-full px-4 py-2.5 ${colors.background.secondary} border ${colors.border.light} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${colors.text.primary} resize-none transition-colors`}
              disabled={isLoading || uploading}
            />
          </div>

          {/* Type */}
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-3`}>
              Tipo <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(typeLabels) as MaterialType[]).map((type) => {
                const Icon = typeIcons[type];
                const isSelected = formData.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    disabled={isLoading || uploading}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `border-indigo-500 ${colors.background.secondary}`
                        : `border-transparent ${colors.background.secondary} hover:border-gray-300 dark:hover:border-gray-600`
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : colors.text.secondary}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : colors.text.primary}`}>
                      {typeLabels[type]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Upload or External URL */}
          {formData.type === 'LINK' ? (
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                URL Esterno <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.externalUrl}
                onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                className={`w-full px-4 py-2.5 ${colors.background.secondary} border ${colors.border.light} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${colors.text.primary} transition-colors`}
                placeholder="https://..."
                required
                disabled={isLoading || uploading}
              />
            </div>
          ) : (
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                File {uploadFile ? '(nuovo file)' : '(mantieni file corrente o carica nuovo)'}
              </label>
              <div className="space-y-3">
                {material.fileName && !uploadFile && (
                  <div className={`p-3 ${colors.background.secondary} rounded-lg border ${colors.border.light}`}>
                    <p className={`text-sm ${colors.text.primary}`}>
                      File corrente: <span className="font-medium">{material.fileName}</span>
                    </p>
                  </div>
                )}
                {uploadFile && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800/30">
                    <p className="text-sm text-indigo-700 dark:text-indigo-400">
                      Nuovo file: <span className="font-medium">{uploadFile.name}</span>
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || uploading}
                  className={`flex items-center gap-2 px-4 py-2.5 ${colors.background.secondary} hover:opacity-80 rounded-lg transition-all border ${colors.border.light} disabled:opacity-50 disabled:cursor-not-allowed ${colors.text.primary} font-medium`}
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {uploadFile ? 'Cambia File' : 'Carica Nuovo File'}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept={
                    formData.type === 'PDF'
                      ? '.pdf'
                      : formData.type === 'VIDEO'
                      ? 'video/*'
                      : '*'
                  }
                />
                {uploading && (
                  <div className="space-y-2">
                    <div className={`w-full ${colors.background.secondary} rounded-full h-2 overflow-hidden border ${colors.border.light}`}>
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className={`text-xs ${colors.text.muted} text-center`}>
                      Caricamento... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Categories (Multi-select) */}
          {categories && categories.length > 0 && (
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                Categorie
              </label>
              <div className="space-y-3">
                {categories.map((category: any) => {
                  const isSelected = formData.categoryIds.includes(category.id);
                  return (
                    <div
                      key={category.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? `border-amber-500 ${colors.background.secondary}`
                          : `border-transparent ${colors.background.secondary} hover:border-gray-300 dark:hover:border-gray-600`
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ 
                              ...formData, 
                              categoryIds: [...formData.categoryIds, category.id] 
                            });
                          } else {
                            setFormData({ 
                              ...formData, 
                              categoryIds: formData.categoryIds.filter(id => id !== category.id) 
                            });
                          }
                        }}
                        disabled={isLoading || uploading}
                        label={category.name}
                        description={category.description || undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
              Materia
            </label>
            <CustomSelect
              options={subjects?.map((s: any) => ({ value: s.id, label: s.name })) || []}
              value={formData.subjectId}
              onChange={(value) => {
                setFormData({ ...formData, subjectId: value, topicId: '', subTopicId: '' });
              }}
              placeholder="Seleziona materia..."
              disabled={isLoading || uploading}
            />
          </div>

          {/* Topic (Argomento) */}
          {formData.subjectId && topics && topics.length > 0 && (
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                Argomento
              </label>
              <CustomSelect
                options={topics.map((t: any) => ({ value: t.id, label: t.name }))}
                value={formData.topicId}
                onChange={(value) => {
                  setFormData({ ...formData, topicId: value, subTopicId: '' });
                }}
                placeholder="Seleziona argomento..."
                disabled={isLoading || uploading}
              />
            </div>
          )}

          {/* Subtopic (Sotto-argomento) */}
          {formData.topicId && selectedTopic?.subTopics && selectedTopic.subTopics.length > 0 && (
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                Sotto-argomento
              </label>
              <CustomSelect
                options={selectedTopic.subTopics.map((st: any) => ({
                  value: st.id,
                  label: `${st.name} (${difficultyLabels[st.difficulty as DifficultyLevel]})`,
                }))}
                value={formData.subTopicId}
                onChange={(value) => setFormData({ ...formData, subTopicId: value })}
                placeholder="Seleziona sotto-argomento..."
                disabled={isLoading || uploading}
              />
            </div>
          )}

        </form>

          {/* Actions Footer */}
          <div className={`p-4 border-t ${colors.border.light} flex items-center justify-end gap-3`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || uploading}
              className={`px-5 py-2.5 ${colors.background.secondary} hover:opacity-80 ${colors.text.primary} rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border ${colors.border.light}`}
            >
              Annulla
            </button>
            <button
              type="submit"
              form="edit-material-form"
              disabled={isLoading || uploading}
              className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
            >
              {isLoading || uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salva Modifiche</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
