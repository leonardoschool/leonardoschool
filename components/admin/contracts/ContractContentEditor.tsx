'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { colors } from '@/lib/theme/colors';
import { escapeHtml } from '@/lib/utils/escapeHtml';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import NumericInput from '@/components/ui/NumericInput';
import type { ContractPlaceholder } from '@/lib/constants/contractPlaceholders';
import { ContractContentEditorModeSwitch } from './ContractContentEditorModeSwitch';
import { ContractContentEditorStyles } from './ContractContentEditorStyles';
import { ColorMenu, ToolbarButton, ToolbarDivider } from './ContractContentEditorControls';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  CheckSquare,
  CornerDownLeft,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Rows3,
  Square,
  Table2,
  Underline,
  Undo2,
} from 'lucide-react';

type EditorMode = 'visual' | 'html' | 'preview';
type ColorMenuType = 'text' | 'highlight';
type BlockFormat = 'p' | 'h2' | 'h3';
type ToolbarState = {
  block: BlockFormat;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  unorderedList: boolean;
  orderedList: boolean;
};

interface ContractContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholders: ContractPlaceholder[];
  label?: string;
  required?: boolean;
  error?: string;
  minRows?: number;
  onBlur?: () => void;
}

const initialToolbarState: ToolbarState = { block: 'p', bold: false, italic: false, underline: false, unorderedList: false, orderedList: false };

function getSelectedBlock(editor: HTMLElement): BlockFormat {
  const selection = document.getSelection();
  let currentNode = selection?.anchorNode;

  if (currentNode?.nodeType === 3) {
    currentNode = currentNode.parentElement;
  }

  while (currentNode instanceof HTMLElement && currentNode !== editor) {
    const tagName = currentNode.tagName.toLowerCase();
    if (tagName === 'h2' || tagName === 'h3') return tagName;
    if (tagName === 'p' || tagName === 'div' || tagName === 'li') return 'p';
    currentNode = currentNode.parentElement;
  }

  return 'p';
}

function getCommandState(command: string): boolean {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function htmlFromPlainText(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
    .join('');
}

export function ContractContentEditor({
  value,
  onChange,
  placeholders,
  label = 'Contenuto contratto',
  required = false,
  error,
  minRows = 14,
  onBlur,
}: ContractContentEditorProps) {
  const [mode, setMode] = useState<EditorMode>('visual');
  const [isPlaceholderPanelOpen, setIsPlaceholderPanelOpen] = useState(false);
  const [openColorMenu, setOpenColorMenu] = useState<ColorMenuType | null>(null);
  const [textColor, setTextColor] = useState<string>(colors.contractEditor.textPalette[0].value);
  const [highlightColor, setHighlightColor] = useState<string>(colors.contractEditor.highlightPalette[0].value);
  const [toolbarState, setToolbarState] = useState<ToolbarState>(initialToolbarState);
  const [showResizePanel, setShowResizePanel] = useState(false);
  const [imageWidthPct, setImageWidthPct] = useState(50);
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>('center');
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (mode !== 'visual' || !editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [mode, value]);

  const emitVisualContent = useCallback(() => {
    onChange(editorRef.current?.innerHTML || '');
  }, [onChange]);

  const updateToolbarState = useCallback(() => {
    const editor = editorRef.current;
    const selection = document.getSelection();
    if (mode !== 'visual' || !editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) return;

    setToolbarState({
      block: getSelectedBlock(editor),
      bold: getCommandState('bold'),
      italic: getCommandState('italic'),
      underline: getCommandState('underline'),
      unorderedList: getCommandState('insertUnorderedList'),
      orderedList: getCommandState('insertOrderedList'),
    });
  }, [mode]);

  useEffect(() => {
    if (mode !== 'visual') return;
    document.addEventListener('selectionchange', updateToolbarState);
    return () => document.removeEventListener('selectionchange', updateToolbarState);
  }, [mode, updateToolbarState]);

  const handleVisualInput = () => {
    emitVisualContent();
    updateToolbarState();
  };

  const runCommand = (command: string, commandValue?: string) => {
    setOpenColorMenu(null);
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitVisualContent();
    requestAnimationFrame(updateToolbarState);
  };

  const removeAllFormat = () => {
    setOpenColorMenu(null);
    editorRef.current?.focus();
    document.execCommand('removeFormat', false);
    document.execCommand('formatBlock', false, 'p');
    if (document.queryCommandState('insertUnorderedList')) document.execCommand('insertUnorderedList', false);
    if (document.queryCommandState('insertOrderedList')) document.execCommand('insertOrderedList', false);
    emitVisualContent();
    requestAnimationFrame(updateToolbarState);
  };

  const insertHtml = (html: string) => {
    setOpenColorMenu(null);
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emitVisualContent();
    requestAnimationFrame(updateToolbarState);
  };

  const insertIntoHtmlMode = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${text}`);
      return;
    }

    const nextValue = `${value.slice(0, textarea.selectionStart)}${text}${value.slice(textarea.selectionEnd)}`;
    const nextCursor = textarea.selectionStart + text.length;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const insertPlaceholder = (placeholder: ContractPlaceholder) => {
    if (mode === 'html') {
      insertIntoHtmlMode(placeholder.tag);
    } else if (mode === 'preview') {
      setMode('visual');
      requestAnimationFrame(() => insertHtml(placeholder.tag));
    } else {
      insertHtml(placeholder.tag);
    }
    setIsPlaceholderPanelOpen(false);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pastedHtml = event.clipboardData.getData('text/html');
    const pastedText = event.clipboardData.getData('text/plain');
    insertHtml(pastedHtml ? sanitizeHtml(pastedHtml) : htmlFromPlainText(pastedText));
  };

  const insertQuickSection = () => {
    insertHtml('<h3>Nuova sezione</h3><p>Scrivi qui il contenuto della sezione.</p>');
  };

  const insertCheckbox = (checked: boolean) => {
    insertHtml(`<span class="contract-checkbox">${checked ? '&#9745;' : '&#9744;'}</span>&nbsp;`);
  };

  const insertClauseBlock = () => {
    insertHtml('<blockquote><p>Inserisci qui una clausola, una nota o una dichiarazione rilevante.</p></blockquote>');
  };

  const insertSimpleTable = () => {
    insertHtml('<table class="contract-table"><tbody><tr><td>Voce</td><td>Dettaglio</td></tr><tr><td>...</td><td>...</td></tr></tbody></table><p><br></p>');
  };

  const insertSignatureBlock = () => {
    insertHtml('<p><br></p><p>Firma ______________________________</p>');
  };

  const saveEditorSelection = () => {
    const sel = window.getSelection();
    if (sel?.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreEditorSelection = () => {
    const sel = window.getSelection();
    if (savedRangeRef.current && sel && editorRef.current) {
      editorRef.current.focus();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const triggerImageUpload = () => {
    saveEditorSelection();
    fileInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      restoreEditorSelection();
      insertHtml(`<img src="${dataUrl}" style="width: 50%; height: auto;" alt="" />`);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openResizePanel = (img: HTMLImageElement) => {
    selectedImageRef.current = img;
    const match = img.style.width.match(/^(\d+(\.\d+)?)%$/);
    setImageWidthPct(match ? Math.round(Number(match[1])) : 50);
    if (img.style.float === 'left') setImageAlign('left');
    else if (img.style.float === 'right') setImageAlign('right');
    else setImageAlign('center');
    setShowResizePanel(true);
  };

  const closeResizePanel = () => {
    selectedImageRef.current?.classList.remove('contract-img-selected');
    selectedImageRef.current = null;
    setShowResizePanel(false);
  };

  const handleWidthChange = (pct: number) => {
    const clamped = Math.min(100, Math.max(5, Math.round(pct)));
    setImageWidthPct(clamped);
    if (selectedImageRef.current) {
      selectedImageRef.current.style.width = `${clamped}%`;
      emitVisualContent();
    }
  };

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    setImageAlign(align);
    const img = selectedImageRef.current;
    if (!img) return;
    if (align === 'left') {
      img.style.float = 'left';
      img.style.display = '';
      img.style.marginLeft = '0';
      img.style.marginRight = '1rem';
      img.style.marginBottom = '0.5rem';
    } else if (align === 'right') {
      img.style.float = 'right';
      img.style.display = '';
      img.style.marginLeft = '1rem';
      img.style.marginRight = '0';
      img.style.marginBottom = '0.5rem';
    } else {
      img.style.float = '';
      img.style.display = 'block';
      img.style.marginLeft = 'auto';
      img.style.marginRight = 'auto';
      img.style.marginBottom = '0.5rem';
    }
    emitVisualContent();
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLImageElement) {
      editorRef.current?.querySelectorAll('img.contract-img-selected').forEach(el => el.classList.remove('contract-img-selected'));
      event.target.classList.add('contract-img-selected');
      openResizePanel(event.target);
    } else if (showResizePanel) {
      closeResizePanel();
    }
  };

  const applyEditorColor = (command: 'foreColor' | 'hiliteColor', color: string) => {
    if (command === 'foreColor') setTextColor(color);
    else setHighlightColor(color);
    runCommand(command, color);
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className={`block text-sm font-medium ${colors.text.primary}`}>
          {label} {required && <span className={colors.status.error.text}>*</span>}
        </label>
        <ContractContentEditorModeSwitch mode={mode} onModeChange={setMode} />
      </div>

      {mode === 'visual' && (
        <div className={`flex flex-wrap items-center gap-2 p-3 rounded-t-xl border-t border-l border-r ${error ? colors.status.error.border : colors.border.primary} ${colors.background.secondary}`}>
              <ToolbarButton title="Paragrafo" active={toolbarState.block === 'p'} onClick={() => runCommand('formatBlock', 'p')}>
                <Pilcrow className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Titolo" active={toolbarState.block === 'h2'} onClick={() => runCommand('formatBlock', 'h2')}>
                <Heading2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Sottotitolo" active={toolbarState.block === 'h3'} onClick={() => runCommand('formatBlock', 'h3')}>
                <Heading3 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton title="Grassetto" active={toolbarState.bold} onClick={() => runCommand('bold')}>
                <Bold className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Corsivo" active={toolbarState.italic} onClick={() => runCommand('italic')}>
                <Italic className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Sottolineato" active={toolbarState.underline} onClick={() => runCommand('underline')}>
                <Underline className="w-4 h-4" />
              </ToolbarButton>
              <ColorMenu
                title="Colore testo"
                icon={<Palette className="w-4 h-4" />}
                options={colors.contractEditor.textPalette}
                isOpen={openColorMenu === 'text'}
                selectedColor={textColor}
                onToggle={() => setOpenColorMenu((current) => (current === 'text' ? null : 'text'))}
                onSelect={(color) => applyEditorColor('foreColor', color)}
              />
              <ColorMenu
                title="Evidenzia"
                icon={<Highlighter className="w-4 h-4" />}
                options={colors.contractEditor.highlightPalette}
                isOpen={openColorMenu === 'highlight'}
                selectedColor={highlightColor}
                onToggle={() => setOpenColorMenu((current) => (current === 'highlight' ? null : 'highlight'))}
                onSelect={(color) => applyEditorColor('hiliteColor', color)}
              />
              <ToolbarDivider />
              <ToolbarButton title="Elenco puntato" active={toolbarState.unorderedList} onClick={() => runCommand('insertUnorderedList')}>
                <List className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Elenco numerato" active={toolbarState.orderedList} onClick={() => runCommand('insertOrderedList')}>
                <ListOrdered className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Riduci rientro" onClick={() => runCommand('outdent')}>
                <IndentDecrease className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Aumenta rientro" onClick={() => runCommand('indent')}>
                <IndentIncrease className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Allinea a sinistra" onClick={() => runCommand('justifyLeft')}>
                <AlignLeft className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Allinea al centro" onClick={() => runCommand('justifyCenter')}>
                <AlignCenter className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Allinea a destra" onClick={() => runCommand('justifyRight')}>
                <AlignRight className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Linea separatrice" onClick={() => runCommand('insertHorizontalRule')}>
                <Minus className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="A capo" onClick={() => insertHtml('<br>')}>
                <CornerDownLeft className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton title="Checkbox vuota" onClick={() => insertCheckbox(false)}>
                <Square className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Checkbox selezionata" onClick={() => insertCheckbox(true)}>
                <CheckSquare className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Sezione" onClick={insertQuickSection}>
                <Rows3 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Clausola" onClick={insertClauseBlock}>
                <Quote className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Tabella" onClick={insertSimpleTable}>
                <Table2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Inserisci immagine dal dispositivo" onClick={triggerImageUpload}>
                <ImagePlus className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Firma" onClick={insertSignatureBlock}>
                <Braces className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton title="Annulla" onClick={() => runCommand('undo')}>
                <Undo2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Ripristina" onClick={() => runCommand('redo')}>
                <Redo2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton title="Rimuovi formato" onClick={removeAllFormat}>
                <Eraser className="w-4 h-4" />
              </ToolbarButton>
            </div>
          )}

          {/* Image resize panel — appears when user clicks an existing image */}
          {mode === 'visual' && showResizePanel && (
            <div className={`border border-t-0 ${error ? colors.status.error.border : colors.border.primary} ${colors.background.secondary} px-4 py-3 flex flex-wrap items-center gap-4`}>
              {/* Alignment */}
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-xs font-medium ${colors.text.muted} mr-1`}>Posizione</span>
                {(['left', 'center', 'right'] as const).map((align) => {
                  const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                  const label = align === 'left' ? 'Sinistra' : align === 'center' ? 'Centro' : 'Destra';
                  return (
                    <button
                      key={align}
                      type="button"
                      title={label}
                      onClick={() => handleAlignChange(align)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        imageAlign === align
                          ? `${colors.primary.bg} text-white border-transparent`
                          : `${colors.border.primary} ${colors.background.card} ${colors.text.secondary} hover:${colors.primary.text}`
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
              <div className={`w-px h-5 ${colors.border.primary} bg-current opacity-30 shrink-0`} />
              {/* Width */}
              <span className={`text-xs font-medium ${colors.text.muted} shrink-0`}>
                Larghezza
              </span>
              <div className="flex items-center gap-3 flex-1 min-w-48">
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={imageWidthPct}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="flex-1 accent-red-700 cursor-pointer"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <NumericInput
                    min="5"
                    max="100"
                    value={imageWidthPct}
                    onValueChange={(pct) => {
                      if (pct !== null) {
                        handleWidthChange(pct);
                      }
                    }}
                    className={`w-14 px-2 py-1 text-sm text-center rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:outline-none focus:ring-1 focus:ring-red-600`}
                  />
                  <span className={`text-sm ${colors.text.muted}`}>%</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeResizePanel}
                className={`px-3 py-1.5 text-sm rounded-lg border ${colors.border.primary} ${colors.background.card} ${colors.text.secondary} shrink-0`}
              >
                Chiudi
              </button>
            </div>
          )}

          <div className={`border ${error ? colors.status.error.border : colors.border.primary} ${mode === 'visual' ? 'border-t-0 rounded-b-xl' : 'rounded-xl'} overflow-hidden ${colors.background.card}`}>
            {mode === 'visual' && (
              <div
                ref={editorRef}
              role="textbox"
              aria-multiline="true"
              tabIndex={0}
              contentEditable
              suppressContentEditableWarning
              onInput={handleVisualInput}
              onKeyUp={updateToolbarState}
              onMouseUp={updateToolbarState}
              onBlur={onBlur}
              onPaste={handlePaste}
              onClick={handleEditorClick}
              data-placeholder="Scrivi il contratto..."
              style={{ minHeight: `${minRows * 1.75}rem` }}
              className={`contract-rich-editor max-h-[34rem] overflow-auto px-4 py-4 text-sm leading-relaxed ${colors.background.input} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-red-700`}
            />
            )}

            {mode === 'html' && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            rows={minRows}
            placeholder="<p>Scrivi il contratto...</p>"
            className={`block w-full px-4 py-3 text-sm leading-relaxed font-mono ${colors.background.input} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-red-700`}
          />
            )}

            {mode === 'preview' && (
              <div
                style={{ minHeight: `${minRows * 1.75}rem` }}
                className={`contract-rich-editor max-h-[34rem] overflow-auto px-4 py-4 text-sm leading-relaxed ${colors.background.input} ${colors.text.primary}`}
              >
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
              </div>
            )}
          </div>

      <div className="relative">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsPlaceholderPanelOpen((isOpen) => !isOpen)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${colors.status.info.softBg} ${colors.status.info.text} text-sm font-medium hover:opacity-80 transition-opacity`}
        >
          <Braces className="w-4 h-4" />
          Placeholder
        </button>

        {isPlaceholderPanelOpen && (
          <div className={`absolute z-20 mt-2 w-full max-w-3xl rounded-xl border ${colors.border.primary} ${colors.background.card} ${colors.effects.shadow.xl} p-3`}>
            <div className="flex flex-wrap gap-2">
              {placeholders.map((placeholder) => (
                <button
                  key={placeholder.tag}
                  type="button"
                  title={placeholder.desc}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertPlaceholder(placeholder)}
                  className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono ${colors.background.secondary} ${colors.text.secondary} border ${colors.border.primary} hover:opacity-80 transition-opacity`}
                >
                  {placeholder.tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className={`text-sm ${colors.status.error.text}`}>
          {error}
        </p>
      )}

      <ContractContentEditorStyles />
    </div>
  );
}

export default ContractContentEditor;