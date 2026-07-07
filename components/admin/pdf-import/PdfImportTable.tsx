'use client';

import { useMemo } from 'react';
import { colors } from '@/lib/theme/colors';
import { difficultyLabels, questionTypeLabels } from '@/lib/validations/questionValidation';
import { type SelectOption } from '@/components/ui/CustomSelect';
import Checkbox from '@/components/ui/Checkbox';
import { CheckCircle, AlertTriangle, Copy } from 'lucide-react';
import type { PdfImportItem } from '@/lib/pdf/buildImportItems';

interface PdfImportTableProps {
  items: PdfImportItem[];
  subjectOptions: SelectOption[];
  selectedIds: Set<string>;
  onToggle: (localId: string) => void;
  onToggleAll: (localIds: string[], checked: boolean) => void;
}

/** A row can be selected for bulk actions only if it will actually be saved. */
function isSelectable(item: PdfImportItem): boolean {
  return !item.isDuplicate && !item.excluded && item.status !== 'saved';
}

export default function PdfImportTable({
  items,
  subjectOptions,
  selectedIds,
  onToggle,
  onToggleAll,
}: PdfImportTableProps) {
  const subjectName = useMemo(() => {
    const map = new Map(subjectOptions.map((o) => [o.value, o.label]));
    return (id: string) => (id ? map.get(id) ?? '—' : '—');
  }, [subjectOptions]);

  const selectableIds = items.filter(isSelectable).map((i) => i.localId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  return (
    <div className={`${colors.background.card} rounded-xl ${colors.effects.shadow.sm} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={colors.background.secondary}>
            <th className="px-3 py-2 w-10 text-left">
              <Checkbox
                checked={allSelected}
                onChange={(e) => onToggleAll(selectableIds, e.target.checked)}
                aria-label="Seleziona tutte"
              />
            </th>
            <th className="px-3 py-2 w-12 text-left">#</th>
            <th className="px-3 py-2 w-24 text-left">Stato</th>
            <th className="px-3 py-2 text-left">Domanda</th>
            <th className="px-3 py-2 w-40 text-left">Materia</th>
            <th className="px-3 py-2 w-32 text-left">Argomento</th>
            <th className="px-3 py-2 w-28 text-left">Tipo</th>
            <th className="px-3 py-2 w-24 text-left">Difficoltà</th>
            <th className="px-3 py-2 w-16 text-left">Tag</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const selectable = isSelectable(item);
            const checked = selectedIds.has(item.localId);
            return (
              <tr
                key={item.localId}
                onClick={() => selectable && onToggle(item.localId)}
                className={`border-t ${colors.border.primary} ${
                  selectable ? 'cursor-pointer' : 'opacity-60'
                } ${checked ? colors.primary.softBg : ''} hover:${colors.background.secondary}`}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={checked}
                    disabled={!selectable}
                    onChange={() => onToggle(item.localId)}
                    aria-label={`Seleziona domanda ${item.number}`}
                  />
                </td>
                <td className={`px-3 py-2 font-medium ${colors.text.primary}`}>{item.number}</td>
                <td className="px-3 py-2"><RowBadge item={item} /></td>
                <td className={`px-3 py-2 ${colors.text.secondary}`}>
                  <span className="line-clamp-2">{item.text || '—'}</span>
                </td>
                <td className={`px-3 py-2 ${item.subjectId ? colors.text.primary : colors.text.muted}`}>
                  {subjectName(item.subjectId)}
                </td>
                <td className={`px-3 py-2 ${item.topicId ? colors.text.primary : colors.text.muted}`}>
                  {item.topicId ? '✓' : '—'}
                </td>
                <td className={`px-3 py-2 ${colors.text.secondary}`}>{questionTypeLabels[item.type]}</td>
                <td className={`px-3 py-2 ${colors.text.secondary}`}>{difficultyLabels[item.difficulty]}</td>
                <td className={`px-3 py-2 ${colors.text.muted}`}>{item.tagIds.length || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowBadge({ item }: { item: PdfImportItem }) {
  if (item.isDuplicate) {
    return <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400"><Copy className="w-3 h-3" /> Duplicato</span>;
  }
  if (item.status === 'saved') {
    return <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle className="w-3 h-3" /> Salvata</span>;
  }
  if (item.suspicious) {
    return <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3 h-3" /> Da rivedere</span>;
  }
  return <span className={`text-xs ${colors.text.muted}`}>OK</span>;
}
