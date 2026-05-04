'use client';

/**
 * CalendarEventTagsManagerModal
 *
 * Admin-only modal for managing custom calendar event tags
 * (es. "Lezione Biologia", "Lezione Fisica").
 *
 * Provides CRUD over `trpc.calendar.listTags / createTag / updateTag / deleteTag`.
 */

import { useState } from 'react';
import { Tag as TagIcon, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Spinner } from '@/components/ui/loaders';
import { ButtonLoader } from '@/components/ui/loaders';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type DraftTag = { id?: string; name: string; color: string; description: string };

const DEFAULT_DRAFT: DraftTag = { name: '', color: '#6366F1', description: '' };

export default function CalendarEventTagsManagerModal({ isOpen, onClose }: Props) {
  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  const { data: tags, isLoading } = trpc.calendar.listTags.useQuery(
    { includeInactive: true },
    { enabled: isOpen }
  );

  const [draft, setDraft] = useState<DraftTag>(DEFAULT_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const refresh = () => {
    utils.calendar.listTags.invalidate();
    utils.calendar.getEvents.invalidate();
  };

  const createMutation = trpc.calendar.createTag.useMutation({
    onSuccess: () => {
      refresh();
      showSuccess('Tag creato', 'Il tag è stato aggiunto con successo.');
      setDraft(DEFAULT_DRAFT);
    },
    onError: handleMutationError,
  });

  const updateMutation = trpc.calendar.updateTag.useMutation({
    onSuccess: () => {
      refresh();
      showSuccess('Tag aggiornato', 'Le modifiche sono state salvate.');
      setEditingId(null);
      setDraft(DEFAULT_DRAFT);
    },
    onError: handleMutationError,
  });

  const deleteMutation = trpc.calendar.deleteTag.useMutation({
    onSuccess: () => {
      refresh();
      showSuccess('Tag eliminato', 'Il tag è stato rimosso. Gli eventi mantengono la cronologia.');
      setConfirmDelete(null);
    },
    onError: handleMutationError,
  });

  const startEdit = (tag: { id?: string; name?: string; color?: string; description?: string | null }) => {
    if (!tag.id || !tag.name || !tag.color) return;
    setEditingId(tag.id);
    setDraft({ id: tag.id, name: tag.name, color: tag.color, description: tag.description ?? '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(DEFAULT_DRAFT);
  };

  const handleSave = () => {
    const name = draft.name.trim();
    if (!name) return;
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name,
        color: draft.color,
        description: draft.description.trim() || null,
      });
    } else {
      createMutation.mutate({
        name,
        color: draft.color,
        description: draft.description.trim() || undefined,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Gestisci tag eventi"
        subtitle="Crea tag personalizzati (es. Lezione Biologia, Lezione Fisica) per categorizzare gli eventi del calendario."
        icon={<TagIcon className="w-5 h-5" />}
        size="lg"
        variant="primary"
      >
        <div className="space-y-6">
          {/* Form */}
          <div className={`p-4 rounded-lg border ${colors.border.primary} ${colors.background.secondary}`}>
            <h3 className={`text-sm font-semibold mb-3 ${colors.text.primary}`}>
              {editingId ? 'Modifica tag' : 'Nuovo tag'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Nome del tag"
                maxLength={80}
                className={`w-full px-3 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary}`}
              />
              <div className="flex items-center gap-2">
                <label className={`text-sm ${colors.text.secondary}`} htmlFor="tag-color">
                  Colore
                </label>
                <input
                  id="tag-color"
                  type="color"
                  value={draft.color}
                  onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                  className="w-10 h-10 rounded border cursor-pointer"
                  aria-label="Colore tag"
                />
              </div>
            </div>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Descrizione (opzionale)"
              rows={2}
              maxLength={500}
              className={`mt-3 w-full px-3 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} resize-none`}
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${colors.border.primary} ${colors.text.primary} hover:${colors.background.hover}`}
                >
                  Annulla
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !draft.name.trim()}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${colors.primary.gradient} text-white disabled:opacity-50 flex items-center gap-2`}
              >
                <ButtonLoader loading={isSaving} loadingText={editingId ? 'Salvataggio...' : 'Creazione...'}>
                  <Plus className="w-4 h-4" />
                  {editingId ? 'Salva modifiche' : 'Aggiungi tag'}
                </ButtonLoader>
              </button>
            </div>
          </div>

          {/* List */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${colors.text.primary}`}>
              Tag esistenti
            </h3>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner size="md" />
              </div>
            ) : tags && tags.length > 0 ? (
              <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {tags.map((tag) => (
                  <li
                    key={tag.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${colors.border.primary} ${colors.background.card}`}
                  >
                    <span
                      className="inline-block w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${colors.text.primary} truncate`}>
                        {tag.name}
                        {!tag.isActive && (
                          <span className={`ml-2 text-xs ${colors.text.secondary}`}>(disattivato)</span>
                        )}
                      </p>
                      {tag.description && (
                        <p className={`text-xs ${colors.text.secondary} truncate`}>
                          {tag.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(tag)}
                      className={`p-1.5 rounded ${colors.text.secondary} hover:${colors.background.hover}`}
                      aria-label="Modifica"
                      title="Modifica"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({ id: tag.id, isActive: !tag.isActive })
                      }
                      className={`p-1.5 rounded ${colors.text.secondary} hover:${colors.background.hover}`}
                      aria-label={tag.isActive ? 'Disattiva' : 'Riattiva'}
                      title={tag.isActive ? 'Disattiva' : 'Riattiva'}
                    >
                      {tag.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ id: tag.id, name: tag.name })}
                      className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      aria-label="Elimina"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`text-sm ${colors.text.secondary} text-center py-6`}>
                Nessun tag creato. Aggiungi il primo qui sopra.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {confirmDelete && (
        <ConfirmModal
          isOpen
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate({ id: confirmDelete.id })}
          title="Eliminare il tag?"
          message={`Stai per eliminare "${confirmDelete.name}". Gli eventi a cui era associato manterranno la cronologia ma perderanno il tag.`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleteMutation.isPending}
        />
      )}
    </>
  );
}
