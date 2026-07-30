'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { firebaseStorage } from '@/lib/firebase/storage';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';
import QuestionImage from '@/components/ui/QuestionImage';

interface ImageUrlFieldProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

/**
 * Question-level image: paste a URL or upload a file. Companion to
 * InsertImageButton, which instead places a picture inside the text.
 */
export default function ImageUrlField({ value, onChange, disabled = false }: ImageUrlFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { showError } = useToast();

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      const result = await firebaseStorage.uploadQuestionImage(file);
      onChange(result.url);
    } catch (error) {
      console.error('Error uploading question image:', error);
      showError('Errore', "Errore durante il caricamento dell'immagine.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://..."
          className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors text-sm disabled:opacity-60`}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity text-sm disabled:opacity-50 flex-shrink-0`}
        >
          {uploading ? <Spinner size="sm" variant="white" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Caricamento...' : 'Carica'}
        </button>
      </div>

      {value && (
        <div className="flex items-start gap-3">
          <QuestionImage
            src={value}
            alt="Immagine della domanda"
            width={160}
            height={100}
            className="rounded-lg"
            style={{ maxHeight: '100px', objectFit: 'contain' }}
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-red-500 hover:underline"
            >
              Rimuovi immagine
            </button>
          )}
        </div>
      )}
    </div>
  );
}
