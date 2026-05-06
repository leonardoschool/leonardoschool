'use client';

import { useRef } from 'react';
import { colors } from '@/lib/theme/colors';
import { ButtonLoader } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import { Modal } from '@/components/ui/Modal';
import {
  Save, X, Eye, Info, Sparkles, ChevronDown, ChevronUp, AlertCircle,
  ImageIcon, Upload, Link as LinkIcon, Copy, Check,
} from 'lucide-react';
import TagSelector from '@/components/admin/TagSelector';
import LaTeXEditor from '@/components/ui/LaTeXEditor';
import SymbolKeyboard from '@/components/ui/SymbolKeyboard';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import AnswerEditor from '@/components/admin/question-form/AnswerEditor';
import HtmlShortcutMenu from '@/components/admin/question-form/HtmlShortcutMenu';
import KeywordManager from '@/components/admin/question-form/KeywordManager';
import { useQuestionForm, type QuestionFormInitialData } from '@/lib/hooks/useQuestionForm';
import {
  questionTypeLabels,
  questionLanguageLabels,
  difficultyLabels,
  openValidationTypeLabels,
  type QuestionType,
  type QuestionLanguage,
  type DifficultyLevel,
  type OpenAnswerValidationType,
} from '@/lib/validations/questionValidation';

interface QuestionFormProps {
  questionId?: string;
  basePath?: string;
  initialData?: QuestionFormInitialData;
}

export default function QuestionForm({ questionId, basePath = '/domande', initialData }: QuestionFormProps) {
  const form = useQuestionForm({ questionId, basePath, initialData });

  const questionTextRef = useRef<HTMLTextAreaElement>(null);
  const correctExplanationRef = useRef<HTMLTextAreaElement>(null);
  const wrongExplanationRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
          {questionId ? 'Modifica Domanda' : 'Nuova Domanda'}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => form.setShowPreview(true)}
            disabled={!form.text.trim()}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Eye className="w-4 h-4" />
            Anteprima
          </button>
          <button
            onClick={form.goBack}
            className={`p-2 rounded-lg hover:${colors.background.secondary} transition-colors`}
          >
            <X className={`w-5 h-5 ${colors.text.muted}`} />
          </button>
        </div>
      </div>

      {/* Main Form */}
      <div className={`${colors.background.card} rounded-xl p-6 ${colors.effects.shadow.sm} space-y-6`}>
        {/* Type Selection */}
        <div>
          <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Tipo di domanda *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'OPEN_TEXT'] as QuestionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => form.setType(t)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  form.type === t
                    ? `${colors.primary.border} ${colors.primary.softBg}`
                    : `${colors.border.primary} hover:border-gray-300 dark:hover:border-gray-600`
                }`}
              >
                <p className={`font-medium ${form.type === t ? colors.primary.text : colors.text.primary}`}>
                  {questionTypeLabels[t]}
                </p>
                <p className={`text-xs mt-1 ${colors.text.muted}`}>
                  {t === 'SINGLE_CHOICE' && 'Una sola risposta corretta'}
                  {t === 'MULTIPLE_CHOICE' && 'Più risposte corrette'}
                  {t === 'OPEN_TEXT' && 'Risposta libera'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Question Text */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-sm font-medium ${colors.text.primary}`}>Testo della domanda *</label>
            <button
              type="button"
              onClick={() => form.setShowFormattingInfo(!form.showFormattingInfo)}
              className={`inline-flex items-center gap-1 text-sm ${colors.text.muted} hover:${colors.primary.text} transition-colors`}
            >
              <Info className="w-4 h-4" />
              Come formattare
            </button>
          </div>

          {form.showFormattingInfo && (
            <div className={`mb-3 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
              <h4 className={`font-medium ${colors.text.primary} mb-2`}>Formattazione del testo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={`font-medium ${colors.text.secondary} mb-1`}>LaTeX (formule matematiche)</p>
                  <ul className={`${colors.text.muted} space-y-1`}>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">$formula$</code> - formula inline</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">$$formula$$</code> - formula centrata</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">\(formula\)</code> - formula inline</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">\[formula\]</code> - formula centrata</li>
                  </ul>
                </div>
                <div>
                  <p className={`font-medium ${colors.text.secondary} mb-1`}>HTML (formattazione testo)</p>
                  <ul className={`${colors.text.muted} space-y-1`}>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;sub&gt;testo&lt;/sub&gt;</code> - pedice</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;sup&gt;testo&lt;/sup&gt;</code> - apice</li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;b&gt;testo&lt;/b&gt;</code> - <b>grassetto</b></li>
                    <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;i&gt;testo&lt;/i&gt;</code> - <i>corsivo</i></li>
                  </ul>
                </div>
              </div>
              <button type="button" onClick={() => form.setShowFormattingInfo(false)} className={`mt-3 text-sm ${colors.primary.text} hover:underline`}>
                Chiudi
              </button>
            </div>
          )}

          <textarea
            ref={questionTextRef}
            value={form.text}
            onChange={(e) => form.setText(e.target.value)}
            rows={4}
            placeholder="Inserisci il testo della domanda... (supporta LaTeX e HTML)"
            className={`w-full px-4 py-3 rounded-lg border ${
              form.errors.text ? 'border-red-500' : colors.border.primary
            } ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y font-mono text-sm`}
          />
          {form.errors.text && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {form.errors.text}
            </p>
          )}
          {form.text && (
            <div className="mt-3">
              <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima formattazione:</p>
              <div className={`p-3 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
                <RichTextRenderer text={form.text} className={colors.text.primary} />
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <SymbolKeyboard
              onInsert={(symbol) => form.insertSymbolIntoTextarea(questionTextRef, form.text, form.setText, symbol)}
            />
            <HtmlShortcutMenu
              onInsert={(snippet) => form.insertSymbolIntoTextarea(questionTextRef, form.text, form.setText, snippet)}
            />
            <button
              type="button"
              onClick={() => form.setShowFormulaHelper(!form.showFormulaHelper)}
              className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.primary.text} transition-colors`}
            >
              <Sparkles className="w-4 h-4" />
              {form.showFormulaHelper ? 'Nascondi assistente formule' : 'Assistente formule LaTeX'}
              {form.showFormulaHelper ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Formula Helper */}
        {form.showFormulaHelper && (
          <div className={`p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`font-medium ${colors.text.primary}`}>Assistente Formule LaTeX</p>
              <p className={`text-xs ${colors.text.muted}`}>Crea la formula, poi copiala nel testo della domanda</p>
            </div>
            <LaTeXEditor value={form.textLatex} onChange={form.setTextLatex} placeholder="Costruisci la tua formula qui..." rows={2} />
            {form.textLatex && (
              <div className="mt-3 flex items-center gap-2">
                <code className={`flex-1 px-3 py-2 rounded ${colors.background.tertiary} ${colors.text.primary} text-sm font-mono`}>
                  ${form.textLatex}$
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`$${form.textLatex}$`);
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity text-sm`}
                >
                  <Copy className="w-4 h-4" />
                  Copia
                </button>
              </div>
            )}
          </div>
        )}

        {/* Categorization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomSelect
            label="Materia"
            options={form.subjectOptions}
            value={form.subjectId}
            onChange={(val) => { form.setSubjectId(val); form.setTopicId(''); }}
          />
          <CustomSelect
            label="Argomento"
            options={form.topicOptions}
            value={form.topicId}
            onChange={form.setTopicId}
            disabled={!form.subjectId}
          />
        </div>

        {/* Difficulty & Language */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CustomSelect
            label="Difficoltà"
            options={[
              { value: 'EASY', label: difficultyLabels.EASY },
              { value: 'MEDIUM', label: difficultyLabels.MEDIUM },
              { value: 'HARD', label: difficultyLabels.HARD },
            ]}
            value={form.difficulty}
            onChange={(val) => form.setDifficulty(val as DifficultyLevel)}
          />
          <CustomSelect
            label="Lingua"
            options={[
              { value: 'IT', label: questionLanguageLabels.IT },
              { value: 'EN', label: questionLanguageLabels.EN },
            ]}
            value={form.language}
            onChange={(val) => form.setLanguage(val as QuestionLanguage)}
          />
          <div className={`flex items-center p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
            <p className={`text-sm ${colors.text.muted}`}>
              <span className="font-medium">Nota:</span> I punti vengono configurati nella simulazione.
            </p>
          </div>
        </div>

        {/* Answers (choice types) */}
        {form.type !== 'OPEN_TEXT' && (
          <AnswerEditor
            answers={form.answers}
            type={form.type}
            shuffleAnswers={form.shuffleAnswers}
            error={form.errors.answers}
            onAdd={form.addAnswer}
            onRemove={form.removeAnswer}
            onUpdate={form.updateAnswer}
            onShuffleChange={form.setShuffleAnswers}
            onInsertHtml={(index, field, value, snippet, ref) =>
              form.insertSymbolIntoTextarea(ref, value, (nextValue) => form.updateAnswer(index, field, nextValue), snippet)
            }
          />
        )}

        {/* Keywords (open text) */}
        {form.type === 'OPEN_TEXT' && (
          <KeywordManager
            openValidationType={form.openValidationType}
            setOpenValidationType={(val) => form.setOpenValidationType(val as OpenAnswerValidationType | '')}
            keywords={form.keywords}
            openMinLength={form.openMinLength}
            openMaxLength={form.openMaxLength}
            showKeywordSuggestions={form.showKeywordSuggestions}
            keywordSuggestions={form.keywordSuggestions}
            fetchingSuggestions={form.fetchingSuggestions}
            questionTextLength={form.text.length}
            error={form.errors.keywords}
            onAddKeyword={form.addKeyword}
            onRemoveKeyword={form.removeKeyword}
            onUpdateKeyword={form.updateKeyword}
            onAddSuggested={form.addSuggestedKeyword}
            onToggleSuggestions={() => form.setShowKeywordSuggestions(!form.showKeywordSuggestions)}
            onMinLengthChange={form.setOpenMinLength}
            onMaxLengthChange={form.setOpenMaxLength}
          />
        )}

        {/* Explanations */}
        <div className="space-y-4">
          <p className={`text-xs ${colors.text.muted} mb-2`}>
            💡 Le spiegazioni supportano LaTeX (<code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">$formula$</code>) e HTML
          </p>
          {[
            { label: 'Spiegazione risposta corretta', value: form.correctExplanation, setValue: form.setCorrectExplanation, ref: correctExplanationRef, placeholder: 'Mostrata quando lo studente risponde correttamente...' },
            { label: 'Spiegazione risposta errata', value: form.wrongExplanation, setValue: form.setWrongExplanation, ref: wrongExplanationRef, placeholder: 'Mostrata quando lo studente sbaglia...' },
          ].map(({ label, value, setValue, ref, placeholder }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-sm font-medium ${colors.text.primary}`}>{label}</label>
                <SymbolKeyboard onInsert={(symbol) => form.insertSymbolIntoTextarea(ref, value, setValue, symbol)} />
              </div>
              <textarea
                ref={ref}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={2}
                placeholder={placeholder}
                className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
              />
              {value && (value.includes('$') || value.includes('<')) && (
                <div className={`mt-2 p-2 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}>
                  <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima:</p>
                  <div className={`text-sm ${colors.text.primary}`}><RichTextRenderer text={value} /></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Advanced Toggle */}
        <button
          type="button"
          onClick={() => form.setShowAdvanced(!form.showAdvanced)}
          className={`w-full flex items-center justify-between p-4 rounded-lg border ${colors.border.primary} hover:${colors.background.secondary} transition-colors`}
        >
          <span className={`font-medium ${colors.text.primary}`}>Opzioni avanzate</span>
          {form.showAdvanced ? <ChevronUp className={`w-5 h-5 ${colors.text.muted}`} /> : <ChevronDown className={`w-5 h-5 ${colors.text.muted}`} />}
        </button>

        {/* Advanced Panel */}
        {form.showAdvanced && (
          <div className="space-y-4 p-4 rounded-lg border border-dashed ${colors.border.primary}">
            {/* Image */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Immagine</label>
              <div className="flex gap-2 mb-3">
                {(['url', 'upload'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      form.setImageMode(mode);
                      if (mode === 'url') { form.setImageFile(null); form.setImagePreviewUrl(''); }
                      else form.setImageUrl('');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      form.imageMode === mode
                        ? `${colors.primary.border} ${colors.primary.softBg} ${colors.primary.text}`
                        : `${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary}`
                    }`}
                  >
                    {mode === 'url' ? <LinkIcon className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    {mode === 'url' ? 'URL' : 'Carica file'}
                  </button>
                ))}
              </div>
              {form.imageMode === 'url' ? (
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => form.setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
              ) : (
                <div className="space-y-3">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { form.setImageFile(file); form.setImagePreviewUrl(URL.createObjectURL(file)); }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className={`w-full flex items-center justify-center gap-3 px-4 py-6 rounded-lg border-2 border-dashed ${colors.border.primary} hover:${colors.primary.border} transition-colors`}
                  >
                    <ImageIcon className={`w-8 h-8 ${colors.text.muted}`} />
                    <span className={colors.text.secondary}>
                      {form.imageFile ? form.imageFile.name : "Clicca per selezionare un'immagine"}
                    </span>
                  </button>
                </div>
              )}
              {form.currentImageUrl && (
                <div className="mt-3">
                  <p className={`text-sm ${colors.text.muted} mb-2`}>Anteprima:</p>
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.currentImageUrl} alt="Preview" className="max-w-full max-h-48 rounded-lg border border-gray-200 dark:border-gray-700" />
                    <button
                      type="button"
                      onClick={() => {
                        if (form.imageMode === 'url') { form.setImageUrl(''); }
                        else { form.setImageFile(null); form.setImagePreviewUrl(''); if (imageInputRef.current) imageInputRef.current.value = ''; }
                      }}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Descrizione / Contesto aggiuntivo</label>
              <textarea
                value={form.description}
                onChange={(e) => form.setDescription(e.target.value)}
                rows={2}
                placeholder="Informazioni aggiuntive mostrate prima della domanda..."
                className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
              />
            </div>

            {/* Year & Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Anno</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => form.setYear(e.target.value ? Number(e.target.value) : '')}
                  min="1990"
                  max={new Date().getFullYear()}
                  placeholder="Es: 2024"
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Fonte</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => form.setSource(e.target.value)}
                  placeholder="Es: Test ufficiale, Libro, etc."
                  className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Tag</label>
              <TagSelector selectedTagIds={form.selectedTagIds} onChange={form.setSelectedTagIds} placeholder="Seleziona tag per categorizzare la domanda..." />
              <p className={`text-xs ${colors.text.muted} mt-1`}>Usa i tag per organizzare le domande per fonte, anno o categoria</p>
            </div>

            {/* General Explanation */}
            <div>
              <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>Spiegazione generale</label>
              <textarea
                value={form.generalExplanation}
                onChange={(e) => form.setGeneralExplanation(e.target.value)}
                rows={2}
                placeholder="Mostrata sempre dopo la risposta... (supporta LaTeX/HTML)"
                className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y`}
              />
              {form.generalExplanation && (form.generalExplanation.includes('$') || form.generalExplanation.includes('<')) && (
                <div className={`mt-2 p-2 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}>
                  <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima:</p>
                  <div className={`text-sm ${colors.text.primary}`}><RichTextRenderer text={form.generalExplanation} /></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.sm} flex items-center justify-between`}>
        <button
          type="button"
          onClick={form.goBack}
          className={`px-6 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors`}
        >
          Annulla
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => form.handleSubmit('DRAFT')}
            disabled={form.isLoading}
            className={`px-6 py-2 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:${colors.background.secondary} transition-colors disabled:opacity-50`}
          >
            <ButtonLoader loading={form.isLoading} loadingText="Salvataggio...">
              Salva come bozza
            </ButtonLoader>
          </button>
          <button
            type="button"
            onClick={() => form.handleSubmit('PUBLISHED')}
            disabled={form.isLoading}
            className={`px-6 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            <ButtonLoader loading={form.isLoading} loadingText="Pubblicazione...">
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Pubblica
              </span>
            </ButtonLoader>
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={form.showPreview}
        onClose={() => form.setShowPreview(false)}
        title="Anteprima Domanda"
        icon={<Eye className="w-6 h-6" />}
        size="2xl"
        variant="primary"
        footer={
          <button onClick={() => form.setShowPreview(false)} className={`px-6 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity`}>
            Chiudi
          </button>
        }
      >
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            form.difficulty === 'EASY' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : form.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {difficultyLabels[form.difficulty]}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {questionTypeLabels[form.type]}
          </span>
          {form.subjects?.find(s => s.id === form.subjectId)?.name && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.primary.softBg} ${colors.primary.text}`}>
              {form.subjects.find(s => s.id === form.subjectId)?.name}
            </span>
          )}
        </div>

        {form.currentImageUrl && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.currentImageUrl} alt="Immagine domanda" className="max-w-full max-h-64 rounded-lg mx-auto" />
          </div>
        )}

        <div className={`text-lg ${colors.text.primary} mb-6`}>
          {form.text ? <RichTextRenderer text={form.text} /> : <p className="text-gray-400">Nessun testo inserito</p>}
        </div>

        {form.description && (
          <div className={`mb-6 p-4 rounded-lg ${colors.background.secondary} border-l-4 ${colors.primary.border}`}>
            <div className={`text-sm ${colors.text.secondary}`}><RichTextRenderer text={form.description} /></div>
          </div>
        )}

        {form.type !== 'OPEN_TEXT' && form.answers.length > 0 && (
          <div className="space-y-3">
            <h3 className={`font-medium ${colors.text.primary} mb-3`}>Risposte:</h3>
            {form.answers.map((answer, index) => (
              <div key={index} className={`flex items-start gap-3 p-4 rounded-lg border ${
                answer.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : `${colors.border.primary} ${colors.background.secondary}`
              }`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  answer.isCorrect ? 'bg-green-500 text-white' : `${colors.background.tertiary} ${colors.text.secondary}`
                }`}>
                  {answer.label || String.fromCharCode(65 + index)}
                </span>
                <div className="flex-1">
                  <div className={colors.text.primary}>{answer.text ? <RichTextRenderer text={answer.text} /> : '(vuota)'}</div>
                  {answer.explanation && <div className={`text-sm ${colors.text.muted} mt-1`}>💡 <RichTextRenderer text={answer.explanation} /></div>}
                </div>
                {answer.isCorrect && <Check className="w-5 h-5 text-green-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}

        {form.type === 'OPEN_TEXT' && (
          <div className={`p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
            <p className={`font-medium ${colors.text.primary} mb-2`}>Risposta aperta</p>
            <p className={`text-sm ${colors.text.muted}`}>
              Tipo valutazione: {form.openValidationType ? openValidationTypeLabels[form.openValidationType as OpenAnswerValidationType] : 'Non specificato'}
            </p>
            {(form.openMinLength || form.openMaxLength) && (
              <p className={`text-sm ${colors.text.muted}`}>Lunghezza: {form.openMinLength || '0'} - {form.openMaxLength || '∞'} caratteri</p>
            )}
            {form.keywords.length > 0 && (
              <div className="mt-2">
                <p className={`text-sm ${colors.text.muted}`}>Keywords: {form.keywords.map(k => k.keyword).join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {(form.correctExplanation || form.wrongExplanation || form.generalExplanation) && (
          <div className="mt-6 space-y-3">
            <h3 className={`font-medium ${colors.text.primary}`}>Spiegazioni:</h3>
            {form.correctExplanation && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-700 dark:text-green-300">
                  <span className="font-medium">✓ Risposta corretta:</span> <RichTextRenderer text={form.correctExplanation} />
                </div>
              </div>
            )}
            {form.wrongExplanation && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-700 dark:text-red-300">
                  <span className="font-medium">✗ Risposta errata:</span> <RichTextRenderer text={form.wrongExplanation} />
                </div>
              </div>
            )}
            {form.generalExplanation && (
              <div className={`p-3 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
                <div className={`text-sm ${colors.text.secondary}`}>
                  <span className="font-medium">ℹ Generale:</span> <RichTextRenderer text={form.generalExplanation} />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
