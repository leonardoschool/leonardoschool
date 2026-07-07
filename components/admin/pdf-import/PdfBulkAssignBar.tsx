'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect';
import TagSelector from '@/components/admin/TagSelector';
import {
  difficultyLabels,
  questionTypeLabels,
  questionLanguageLabels,
  type QuestionType,
  type QuestionLanguage,
  type DifficultyLevel,
} from '@/lib/validations/questionValidation';
import { Check } from 'lucide-react';
import type { PdfImportItem } from '@/lib/pdf/buildImportItems';

interface PdfBulkAssignBarProps {
  subjectOptions: SelectOption[];
  selectedCount: number;
  onApply: (patch: Partial<PdfImportItem>) => void;
}

const KEEP: SelectOption = { value: '', label: 'Non cambiare' };
const DIFFICULTY_OPTIONS: SelectOption[] = [KEEP, { value: 'EASY', label: difficultyLabels.EASY }, { value: 'MEDIUM', label: difficultyLabels.MEDIUM }, { value: 'HARD', label: difficultyLabels.HARD }];
const TYPE_OPTIONS: SelectOption[] = [KEEP, { value: 'SINGLE_CHOICE', label: questionTypeLabels.SINGLE_CHOICE }, { value: 'MULTIPLE_CHOICE', label: questionTypeLabels.MULTIPLE_CHOICE }, { value: 'OPEN_TEXT', label: questionTypeLabels.OPEN_TEXT }];
const LANGUAGE_OPTIONS: SelectOption[] = [KEEP, { value: 'IT', label: questionLanguageLabels.IT }, { value: 'EN', label: questionLanguageLabels.EN }];
const SHUFFLE_OPTIONS: SelectOption[] = [KEEP, { value: 'yes', label: 'Sì' }, { value: 'no', label: 'No' }];

/**
 * Applies subject/topic/tags/type/language/difficulty/shuffle to a
 * multi-selection at once. Only the fields the user actually sets are written,
 * so a partial bulk edit leaves everything else untouched.
 */
export default function PdfBulkAssignBar({ subjectOptions, selectedCount, onApply }: PdfBulkAssignBarProps) {
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [type, setType] = useState('');
  const [language, setLanguage] = useState('');
  const [shuffle, setShuffle] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);

  const { data: topicsData } = trpc.materials.getTopics.useQuery(
    { subjectId: subjectId || '', includeInactive: false },
    { enabled: !!subjectId }
  );
  const topicOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'Seleziona argomento' },
      ...(topicsData ?? [])
        .map((t) => ({ value: t.id, label: t.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    ],
    [topicsData]
  );

  const nothingSet = !subjectId && !difficulty && !type && !language && !shuffle && tagIds.length === 0;

  const apply = () => {
    const patch: Partial<PdfImportItem> = {};
    if (subjectId) {
      patch.subjectId = subjectId;
      patch.topicId = topicId;
    }
    if (difficulty) patch.difficulty = difficulty as DifficultyLevel;
    if (type) patch.type = type as QuestionType;
    if (language) patch.language = language as QuestionLanguage;
    if (shuffle) patch.shuffleAnswers = shuffle === 'yes';
    if (tagIds.length > 0) patch.tagIds = tagIds;
    if (Object.keys(patch).length > 0) onApply(patch);
  };

  return (
    <div className={`rounded-xl border ${colors.primary.border} ${colors.primary.softBg} p-4 space-y-3`}>
      <p className={`text-sm font-medium ${colors.text.primary}`}>
        Assegna a {selectedCount} domande selezionate
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CustomSelect label="Materia" options={[KEEP, ...subjectOptions.filter((o) => o.value)]} value={subjectId} onChange={(val) => { setSubjectId(val); setTopicId(''); }} searchable size="sm" />
        <CustomSelect label="Argomento" options={topicOptions} value={topicId} onChange={setTopicId} searchable size="sm" disabled={!subjectId} />
        <CustomSelect label="Difficoltà" options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} size="sm" />
        <CustomSelect label="Tipo" options={TYPE_OPTIONS} value={type} onChange={setType} size="sm" />
        <CustomSelect label="Lingua" options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} size="sm" />
        <CustomSelect label="Mescola risposte" options={SHUFFLE_OPTIONS} value={shuffle} onChange={setShuffle} size="sm" />
      </div>
      <div>
        <label className={`block text-xs font-medium ${colors.text.muted} mb-1`}>Tag</label>
        <TagSelector selectedTagIds={tagIds} onChange={setTagIds} placeholder="Tag da assegnare..." />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={apply}
          disabled={nothingSet || selectedCount === 0}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
        >
          <Check className="w-4 h-4" />
          Applica alla selezione
        </button>
      </div>
    </div>
  );
}
