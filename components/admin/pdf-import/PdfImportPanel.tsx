'use client';

import { useMemo, useCallback, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useToast } from '@/components/ui/Toast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Spinner } from '@/components/ui/loaders';
import { type SelectOption } from '@/components/ui/CustomSelect';
import { Upload, FileText, AlertTriangle, Copy, RotateCcw, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { usePdfQuestionImport } from '@/lib/hooks/usePdfQuestionImport';
import { isPublishable, type PdfImportItem } from '@/lib/pdf/buildImportItems';
import PdfQuestionCard from './PdfQuestionCard';
import PdfImportTable from './PdfImportTable';
import PdfBulkAssignBar from './PdfBulkAssignBar';

type ViewMode = 'cards' | 'table';
type FilterMode = 'all' | 'review' | 'duplicates';

export default function PdfImportPanel() {
  const { showSuccess, showError } = useToast();
  const { can } = usePermissions();
  const canPublish = can('questions.publish');
  const importer = usePdfQuestionImport();
  const { phase, fileName, extractError, items, loadFile, reset, patchItem, patchMany, saveAll } = importer;

  const [view, setView] = useState<ViewMode>('cards');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: subjects } = trpc.materials.getAllSubjects.useQuery();
  const subjectOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'Seleziona materia' },
      ...(subjects ?? [])
        .map((s) => ({ value: s.id, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    ],
    [subjects]
  );

  const counts = useMemo(() => {
    const duplicates = items.filter((i) => i.isDuplicate).length;
    const review = items.filter((i) => i.suspicious && !i.isDuplicate).length;
    const included = items.filter((i) => !i.isDuplicate && !i.excluded && i.status !== 'saved');
    return { duplicates, review, includedCount: included.length, publishable: included.filter(isPublishable).length };
  }, [items]);

  const visibleItems = useMemo(() => {
    if (filter === 'review') return items.filter((i) => i.suspicious && !i.isDuplicate);
    if (filter === 'duplicates') return items.filter((i) => i.isDuplicate);
    return items;
  }, [items, filter]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showError('Formato non valido', 'Seleziona un file PDF.');
        return;
      }
      clearSelection();
      void loadFile(file);
    },
    [loadFile, showError, clearSelection]
  );

  const handleReset = useCallback(() => {
    clearSelection();
    setFilter('all');
    reset();
  }, [reset, clearSelection]);

  const toggleOne = useCallback((localId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId);
      else next.add(localId);
      return next;
    });
  }, []);

  const toggleAll = useCallback((localIds: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      localIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const applyBulk = useCallback(
    (patch: Partial<PdfImportItem>) => {
      patchMany([...selectedIds], patch);
      showSuccess('Applicato', `Assegnato a ${selectedIds.size} domande.`);
    },
    [patchMany, selectedIds, showSuccess]
  );

  const handleSave = useCallback(
    async (mode: 'DRAFT' | 'PUBLISHED') => {
      if (counts.includedCount === 0) {
        showError('Niente da salvare', 'Nessuna domanda inclusa da importare.');
        return;
      }
      const result = await saveAll(mode);
      const parts = [
        result.published > 0 ? `${result.published} pubblicate` : '',
        result.drafted > 0 ? `${result.drafted} salvate come bozza` : '',
        result.failed > 0 ? `${result.failed} con errori` : '',
      ].filter(Boolean);
      if (result.failed > 0) showError('Importazione parziale', parts.join(', ') + '.');
      else showSuccess('Importazione completata', parts.join(', ') + '.');
    },
    [counts.includedCount, saveAll, showSuccess, showError]
  );

  const isBusy = phase === 'extracting' || phase === 'saving';
  const savedCount = items.filter((i) => i.status === 'saved').length;

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      {items.length === 0 && (
        <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
          <div className={`relative border-2 border-dashed rounded-xl p-8 text-center hover:border-[#a8012b] transition-colors ${colors.border.primary}`}>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFile(e.target.files?.[0])}
              disabled={isBusy}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <FileText className={`w-12 h-12 mx-auto mb-4 ${colors.text.muted}`} />
            <p className={`font-medium ${colors.text.primary}`}>
              {fileName || 'Trascina un PDF con le domande qui'}
            </p>
            <p className={`text-sm ${colors.text.muted} mt-1`}>oppure clicca per selezionare</p>
          </div>
          {phase === 'extracting' && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Spinner size="sm" />
              <span className={colors.text.muted}>Estrazione domande dal PDF...</span>
            </div>
          )}
          {extractError && <p className="mt-4 text-sm text-red-500 text-center">{extractError}</p>}
        </div>
      )}

      {/* Summary + actions */}
      {items.length > 0 && (
        <div className={`${colors.background.card} rounded-xl p-5 ${colors.effects.shadow.sm} space-y-4`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FileText className={`w-5 h-5 ${colors.text.muted}`} />
              <span className={`font-medium ${colors.text.primary}`}>{fileName}</span>
              <span className={`text-sm ${colors.text.muted}`}>· {items.length} domande estratte</span>
            </div>
            <div className="flex items-center gap-2">
              <ViewToggle view={view} onChange={setView} />
              <button
                type="button"
                onClick={handleReset}
                disabled={isBusy}
                className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors disabled:opacity-50`}
              >
                <RotateCcw className="w-4 h-4" />
                Altro PDF
              </button>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              Tutte ({items.length})
            </FilterChip>
            <FilterChip active={filter === 'review'} onClick={() => setFilter('review')} tone="amber">
              <AlertTriangle className="w-3.5 h-3.5" /> Da rivedere ({counts.review})
            </FilterChip>
            {counts.duplicates > 0 && (
              <FilterChip active={filter === 'duplicates'} onClick={() => setFilter('duplicates')} tone="red">
                <Copy className="w-3.5 h-3.5" /> Duplicati ({counts.duplicates})
              </FilterChip>
            )}
            <span className={`ml-auto ${colors.text.muted}`}>
              {counts.includedCount} da importare · {counts.publishable} pubblicabili
            </span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={isBusy || counts.includedCount === 0}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:${colors.background.secondary} transition-colors disabled:opacity-50`}
            >
              {phase === 'saving' ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
              Salva tutte come bozze
            </button>
            {canPublish && (
              <button
                type="button"
                onClick={() => handleSave('PUBLISHED')}
                disabled={isBusy || counts.publishable === 0}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
                title={counts.publishable === 0 ? 'Nessuna domanda ha materia e argomento.' : undefined}
              >
                {phase === 'saving' ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
                Pubblica {counts.publishable > 0 ? `(${counts.publishable})` : 'tutte'}
              </button>
            )}
          </div>
          {savedCount > 0 && (
            <p className={`text-sm ${colors.text.muted} text-right`}>{savedCount} domande salvate finora.</p>
          )}
        </div>
      )}

      {/* Bulk assign bar (table view) */}
      {items.length > 0 && view === 'table' && selectedIds.size > 0 && (
        <PdfBulkAssignBar
          subjectOptions={subjectOptions}
          selectedCount={selectedIds.size}
          onApply={applyBulk}
        />
      )}

      {/* Empty filter state */}
      {items.length > 0 && visibleItems.length === 0 && (
        <div className={`${colors.background.card} rounded-xl p-8 text-center ${colors.text.muted}`}>
          Nessuna domanda in questo filtro.
        </div>
      )}

      {/* Table view */}
      {items.length > 0 && view === 'table' && visibleItems.length > 0 && (
        <PdfImportTable
          items={visibleItems}
          subjectOptions={subjectOptions}
          selectedIds={selectedIds}
          onToggle={toggleOne}
          onToggleAll={toggleAll}
        />
      )}

      {/* Cards view */}
      {items.length > 0 && view === 'cards' && visibleItems.length > 0 && (
        <div className="space-y-4">
          {visibleItems.map((item) => (
            <PdfQuestionCard
              key={item.localId}
              item={item}
              subjectOptions={subjectOptions}
              onPatch={patchItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className={`inline-flex rounded-lg border ${colors.border.primary} p-0.5`}>
      {([
        { key: 'cards' as const, icon: LayoutGrid, label: 'Schede' },
        { key: 'table' as const, icon: TableIcon, label: 'Tabella' },
      ]).map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={label}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
            view === key ? `${colors.primary.bg} text-white` : `${colors.text.secondary} hover:${colors.background.secondary}`
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  tone = 'neutral',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'neutral' | 'amber' | 'red';
}) {
  const activeClass =
    tone === 'amber'
      ? 'bg-amber-500 text-white border-amber-500'
      : tone === 'red'
        ? 'bg-red-500 text-white border-red-500'
        : `${colors.primary.bg} text-white ${colors.primary.border}`;
  // Coloured tones stay visible even when inactive, so they don't disappear
  // against a dark background.
  const inactiveClass =
    tone === 'amber'
      ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50'
      : tone === 'red'
        ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50'
        : `${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
        active ? activeClass : inactiveClass
      }`}
    >
      {children}
    </button>
  );
}
