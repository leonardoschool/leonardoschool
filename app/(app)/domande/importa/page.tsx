'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { isStaff } from '@/lib/permissions';
import { ButtonLoader, Spinner } from '@/components/ui/loaders';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import {
  questionTypeLabels,
  difficultyLabels,
} from '@/lib/validations/questionValidation';

interface ImportRow {
  text: string;
  type: string;
  difficulty: string;
  points: string;
  negativePoints: string;
  subject?: string;
  answer1?: string;
  answer1Correct?: string;
  answer2?: string;
  answer2Correct?: string;
  answer3?: string;
  answer3Correct?: string;
  answer4?: string;
  answer4Correct?: string;
  answer5?: string;
  answer5Correct?: string;
  correctExplanation?: string;
  wrongExplanation?: string;
  tags?: string;
  year?: string;
  source?: string;
}

interface ValidationResult {
  row: number;
  isValid: boolean;
  errors: string[];
  data: ImportRow;
}

export default function ImportaDomandePage() {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();
  const utils = trpc.useUtils();
  const { user, loading } = useAuth();
  const userRole = user?.role;

  // Staff access control
  useEffect(() => {
    if (!loading && !isStaff(userRole)) {
      router.replace('/dashboard');
    }
  }, [loading, userRole, router]);

  const [file, setFile] = useState<File | null>(null);
  const [_parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [importMode, setImportMode] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  const importMutation = trpc.questions.importQuestions.useMutation({
    onSuccess: (result) => {
      showSuccess(
        'Importazione completata',
        `${result.imported} domande importate, ${result.skipped} saltate.`
      );
      utils.questions.getQuestions.invalidate();
      utils.questions.getQuestionStats.invalidate();
      router.push('/domande');
    },
    onError: handleMutationError,
  });

  const parseCSV = useCallback((text: string): ImportRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    
    // Parse data rows
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      const row: Record<string, string> = {};
      
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx]?.trim() || '';
      });
      
      rows.push(row as unknown as ImportRow);
    }
    
    return rows;
  }, []);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const validateData = useCallback((data: ImportRow[]): ValidationResult[] => {
    const validTypes = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'OPEN_TEXT'];
    const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];

    return data.map((row, index) => {
      const errors: string[] = [];

      if (!row.text || row.text.length < 10) {
        errors.push('Testo domanda mancante o troppo corto (min 10 caratteri)');
      }

      if (!row.type || !validTypes.includes(row.type.toUpperCase())) {
        errors.push(`Tipo non valido: ${row.type}. Usa: SINGLE_CHOICE, MULTIPLE_CHOICE, OPEN_TEXT`);
      }

      if (!row.difficulty || !validDifficulties.includes(row.difficulty.toUpperCase())) {
        errors.push(`Difficoltà non valida: ${row.difficulty}. Usa: EASY, MEDIUM, HARD`);
      }

      // Check answers for choice types
      const type = row.type?.toUpperCase();
      if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
        const answers = [
          { text: row.answer1, correct: row.answer1Correct },
          { text: row.answer2, correct: row.answer2Correct },
          { text: row.answer3, correct: row.answer3Correct },
          { text: row.answer4, correct: row.answer4Correct },
          { text: row.answer5, correct: row.answer5Correct },
        ].filter(a => a.text);

        if (answers.length < 2) {
          errors.push('Servono almeno 2 risposte');
        }

        const correctCount = answers.filter(a => 
          a.correct?.toLowerCase() === 'true' || 
          a.correct === '1' || 
          a.correct?.toLowerCase() === 'si' ||
          a.correct?.toLowerCase() === 'sì'
        ).length;

        if (type === 'SINGLE_CHOICE' && correctCount !== 1) {
          errors.push('SINGLE_CHOICE richiede esattamente 1 risposta corretta');
        }

        if (type === 'MULTIPLE_CHOICE' && correctCount < 1) {
          errors.push('MULTIPLE_CHOICE richiede almeno 1 risposta corretta');
        }
      }

      return {
        row: index + 2, // +2 because index is 0-based and we skip header
        isValid: errors.length === 0,
        errors,
        data: row,
      };
    });
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsValidating(true);
    setParsedData([]);
    setValidationResults([]);

    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);
      setParsedData(data);
      
      const results = validateData(data);
      setValidationResults(results);
    } catch (_err) {
      showError('Errore', 'Impossibile leggere il file. Assicurati che sia un file CSV valido.');
    } finally {
      setIsValidating(false);
    }
  }, [parseCSV, validateData, showError]);

  const handleImport = useCallback(() => {
    const validRows = validationResults.filter(r => r.isValid);
    
    if (validRows.length === 0) {
      showError('Errore', 'Nessuna riga valida da importare.');
      return;
    }

    // Transform to the schema format expected by the router
    const questions = validRows.map(r => {
      const row = r.data;
      const type = row.type.toUpperCase() as 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT';
      
      // Build correctAnswers string (e.g., "A" or "A,B,C")
      const correctLetters: string[] = [];
      if (row.answer1 && ['true', '1', 'si', 'sì'].includes(row.answer1Correct?.toLowerCase() || '')) {
        correctLetters.push('A');
      }
      if (row.answer2 && ['true', '1', 'si', 'sì'].includes(row.answer2Correct?.toLowerCase() || '')) {
        correctLetters.push('B');
      }
      if (row.answer3 && ['true', '1', 'si', 'sì'].includes(row.answer3Correct?.toLowerCase() || '')) {
        correctLetters.push('C');
      }
      if (row.answer4 && ['true', '1', 'si', 'sì'].includes(row.answer4Correct?.toLowerCase() || '')) {
        correctLetters.push('D');
      }
      if (row.answer5 && ['true', '1', 'si', 'sì'].includes(row.answer5Correct?.toLowerCase() || '')) {
        correctLetters.push('E');
      }

      return {
        text: row.text,
        type,
        difficulty: (row.difficulty?.toUpperCase() || 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD',
        points: parseFloat(row.points) || 1,
        negativePoints: parseFloat(row.negativePoints) || 0,
        correctExplanation: row.correctExplanation || undefined,
        wrongExplanation: row.wrongExplanation || undefined,
        tags: row.tags || undefined,
        year: row.year ? parseInt(row.year) : undefined,
        source: row.source || undefined,
        answerA: row.answer1 || undefined,
        answerB: row.answer2 || undefined,
        answerC: row.answer3 || undefined,
        answerD: row.answer4 || undefined,
        answerE: row.answer5 || undefined,
        correctAnswers: correctLetters.join(',') || undefined,
      };
    });

    importMutation.mutate({
      questions,
      skipDuplicates: true,
    });
  }, [validationResults, importMutation, showError]);

  const downloadTemplate = useCallback(() => {
    const headers = [
      'text',
      'type',
      'difficulty',
      'points',
      'negativePoints',
      'answer1',
      'answer1Correct',
      'answer2',
      'answer2Correct',
      'answer3',
      'answer3Correct',
      'answer4',
      'answer4Correct',
      'answer5',
      'answer5Correct',
      'correctExplanation',
      'wrongExplanation',
      'tags',
      'year',
      'source',
    ];

    const sampleData = [
      [
        '"Qual è la formula dell\'acqua?"',
        'SINGLE_CHOICE',
        'EASY',
        '1',
        '-0.25',
        'H2O',
        'true',
        'CO2',
        'false',
        'NaCl',
        'false',
        'O2',
        'false',
        '',
        '',
        '"L\'acqua è composta da 2 atomi di idrogeno e 1 di ossigeno"',
        '',
        '"chimica,molecole"',
        '2024',
        '"Test ingresso 2024"',
      ],
      [
        '"Quali sono i colori primari?"',
        'MULTIPLE_CHOICE',
        'MEDIUM',
        '1.5',
        '-0.5',
        'Rosso',
        'true',
        'Verde',
        'false',
        'Blu',
        'true',
        'Giallo',
        'true',
        '',
        '',
        '',
        '',
        '"arte,colori"',
        '',
        '',
      ],
    ];

    const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_domande.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const validCount = validationResults.filter(r => r.isValid).length;
  const invalidCount = validationResults.filter(r => !r.isValid).length;

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/domande"
          className={`p-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
        >
          <ArrowLeft className={`w-5 h-5 ${colors.text.secondary}`} />
        </Link>
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
            Importa Domande
          </h1>
          <p className={colors.text.muted}>
            Importa domande in blocco da un file CSV
          </p>
        </div>
      </div>

      {/* Help Section */}
      <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className={`w-full flex items-center justify-between ${colors.text.primary}`}
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium">Guida all&apos;importazione</span>
          </div>
          <span className={colors.text.muted}>{showHelp ? '▲' : '▼'}</span>
        </button>

        {showHelp && (
          <div className={`mt-4 space-y-4 ${colors.text.secondary}`}>
            <div>
              <h4 className={`font-medium ${colors.text.primary} mb-2`}>Formato del file</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Il file deve essere in formato CSV (separato da virgole o punto e virgola)</li>
                <li>La prima riga deve contenere le intestazioni delle colonne</li>
                <li>I valori con virgole devono essere racchiusi tra virgolette</li>
              </ul>
            </div>

            <div>
              <h4 className={`font-medium ${colors.text.primary} mb-2`}>Colonne obbligatorie</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={colors.background.secondary}>
                      <th className="px-3 py-2 text-left">Colonna</th>
                      <th className="px-3 py-2 text-left">Valori accettati</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={`border-t ${colors.border.primary}`}>
                      <td className="px-3 py-2 font-mono">text</td>
                      <td className="px-3 py-2">Testo della domanda (min 10 caratteri)</td>
                    </tr>
                    <tr className={`border-t ${colors.border.primary}`}>
                      <td className="px-3 py-2 font-mono">type</td>
                      <td className="px-3 py-2">SINGLE_CHOICE, MULTIPLE_CHOICE, OPEN_TEXT</td>
                    </tr>
                    <tr className={`border-t ${colors.border.primary}`}>
                      <td className="px-3 py-2 font-mono">difficulty</td>
                      <td className="px-3 py-2">EASY, MEDIUM, HARD</td>
                    </tr>
                    <tr className={`border-t ${colors.border.primary}`}>
                      <td className="px-3 py-2 font-mono">points</td>
                      <td className="px-3 py-2">Numero (es. 1, 1.5)</td>
                    </tr>
                    <tr className={`border-t ${colors.border.primary}`}>
                      <td className="px-3 py-2 font-mono">negativePoints</td>
                      <td className="px-3 py-2">Numero (es. 0, -0.25)</td>
                    </tr>
                    <tr className={`border-t ${colors.border.primary}`}>
                      <td className="px-3 py-2 font-mono">answer1...answer5</td>
                      <td className="px-3 py-2">Testo delle risposte</td>
                    </tr>
                    <tr className={`border-t ${colors.border.primary}`}>
                      <td className="px-3 py-2 font-mono">answer1Correct...answer5Correct</td>
                      <td className="px-3 py-2">true/false, 1/0, si/no</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={downloadTemplate}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:${colors.background.secondary} transition-colors`}
            >
              <Download className="w-4 h-4" />
              Scarica template di esempio
            </button>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
        <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Carica file</h3>
        
        <div
          className={`relative border-2 border-dashed ${colors.border.primary} rounded-xl p-8 text-center hover:border-[#a8012b] transition-colors`}
        >
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${colors.text.muted}`} />
          <p className={`font-medium ${colors.text.primary}`}>
            {file ? file.name : 'Trascina un file CSV qui'}
          </p>
          <p className={`text-sm ${colors.text.muted} mt-1`}>
            oppure clicca per selezionare
          </p>
        </div>

        {isValidating && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Spinner size="sm" />
            <span className={colors.text.muted}>Validazione in corso...</span>
          </div>
        )}
      </div>

      {/* Validation Results */}
      {validationResults.length > 0 && (
        <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${colors.text.primary}`}>Risultati validazione</h3>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                {validCount} valide
              </span>
              {invalidCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <XCircle className="w-4 h-4" />
                  {invalidCount} con errori
                </span>
              )}
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={colors.background.secondary}>
                  <th className="px-3 py-2 text-left w-12">Riga</th>
                  <th className="px-3 py-2 text-left w-16">Stato</th>
                  <th className="px-3 py-2 text-left">Domanda</th>
                  <th className="px-3 py-2 text-left w-32">Tipo</th>
                  <th className="px-3 py-2 text-left w-24">Difficoltà</th>
                  <th className="px-3 py-2 text-left">Errori</th>
                </tr>
              </thead>
              <tbody>
                {validationResults.slice(0, 20).map((result) => (
                  <tr
                    key={result.row}
                    className={`border-t ${colors.border.primary} ${
                      result.isValid ? '' : 'bg-red-50 dark:bg-red-900/10'
                    }`}
                  >
                    <td className="px-3 py-2">{result.row}</td>
                    <td className="px-3 py-2">
                      {result.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate">
                      {result.data.text || '-'}
                    </td>
                    <td className="px-3 py-2">
                      {questionTypeLabels[result.data.type?.toUpperCase() as keyof typeof questionTypeLabels] || result.data.type}
                    </td>
                    <td className="px-3 py-2">
                      {difficultyLabels[result.data.difficulty?.toUpperCase() as keyof typeof difficultyLabels] || result.data.difficulty}
                    </td>
                    <td className="px-3 py-2 text-red-600 text-xs">
                      {result.errors.join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {validationResults.length > 20 && (
            <p className={`text-sm ${colors.text.muted} mt-4 text-center`}>
              ... e altre {validationResults.length - 20} righe
            </p>
          )}
        </div>
      )}

      {/* Import Options */}
      {validCount > 0 && (
        <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm}`}>
          <h3 className={`font-semibold ${colors.text.primary} mb-4`}>Opzioni di importazione</h3>
          
          <div className="flex items-center gap-6 mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'DRAFT'}
                onChange={() => setImportMode('DRAFT')}
                className="w-4 h-4 text-[#a8012b] focus:ring-[#a8012b]"
              />
              <span className={colors.text.primary}>Importa come bozze</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'PUBLISHED'}
                onChange={() => setImportMode('PUBLISHED')}
                className="w-4 h-4 text-[#a8012b] focus:ring-[#a8012b]"
              />
              <span className={colors.text.primary}>Pubblica direttamente</span>
            </label>
          </div>

          <div className={`p-4 rounded-lg ${colors.background.secondary} mb-6`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className={`font-medium ${colors.text.primary}`}>
                  {validCount} domande pronte per l&apos;importazione
                </p>
                {invalidCount > 0 && (
                  <p className={`text-sm ${colors.text.muted} mt-1`}>
                    Le {invalidCount} righe con errori verranno saltate.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <Link
              href="/domande"
              className={`px-6 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors`}
            >
              Annulla
            </Link>
            <button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className={`px-6 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
            >
              <ButtonLoader loading={importMutation.isPending} loadingText="Importazione...">
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Importa {validCount} domande
                </span>
              </ButtonLoader>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
