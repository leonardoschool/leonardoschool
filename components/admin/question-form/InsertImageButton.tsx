'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Upload, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { firebaseStorage } from '@/lib/firebase/storage';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';

interface InsertImageButtonProps {
  // Receives the text snippet to drop at the current caret position in the question textarea.
  readonly onInsert: (snippet: string) => void;
}

/**
 * Toolbar button that lets the author upload (or paste a URL for) an image and inserts it
 * inline at the caret — so the picture can sit anywhere in the text, not only appended at the
 * end. The snippet uses \includegraphics{url}, which RichTextRenderer renders as an inline <img>.
 */
export default function InsertImageButton({ onInsert }: InsertImageButtonProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { showError } = useToast();

  const insert = (src: string) => {
    const trimmed = src.trim();
    if (!trimmed) return;
    onInsert(`\\includegraphics{${trimmed}}`);
    setUrl('');
    setOpen(false);
  };

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      const result = await firebaseStorage.uploadQuestionImage(file);
      insert(result.url);
    } catch (error) {
      console.error('Error uploading inline image:', error);
      showError('Errore', "Errore durante il caricamento dell'immagine.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.primary.text} transition-colors`}
      >
        <ImageIcon className="w-4 h-4" />
        Immagine nel testo
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div
          className={`absolute z-20 mt-1 w-80 p-3 rounded-lg border ${colors.border.primary} ${colors.background.card} shadow-lg space-y-3`}
        >
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
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity text-sm disabled:opacity-50`}
          >
            {uploading ? <Spinner size="sm" variant="white" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Caricamento...' : 'Carica file e inserisci'}
          </button>

          <div className="flex items-center gap-2">
            <LinkIcon className={`w-4 h-4 ${colors.text.muted}`} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  insert(url);
                }
              }}
              placeholder="oppure incolla un URL..."
              className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
            />
            <button
              type="button"
              onClick={() => insert(url)}
              className={`px-3 py-1.5 rounded-lg border ${colors.border.primary} ${colors.text.secondary} text-sm hover:${colors.background.tertiary} transition-colors`}
            >
              Inserisci
            </button>
          </div>

          <p className={`text-xs ${colors.text.muted}`}>
            L&apos;immagine viene inserita nel punto in cui si trova il cursore nel testo.
          </p>
        </div>
      )}
    </div>
  );
}
