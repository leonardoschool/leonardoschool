'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { colors } from '@/lib/theme/colors';
import { escapeHtml } from '@/lib/utils/escapeHtml';
import { sanitizeHtml, cleanContractHtml } from '@/lib/utils/sanitizeHtml';
import NumericInput from '@/components/ui/NumericInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { yearOffsetContractPlaceholders, type ContractPlaceholder } from '@/lib/constants/contractPlaceholders';
import { ContractContentEditorModeSwitch } from './ContractContentEditorModeSwitch';
import { ContractContentEditorStyles } from './ContractContentEditorStyles';
import { ColorMenu, ToolbarButton, ToolbarDivider } from './ContractContentEditorControls';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  CheckSquare,
  ChevronDown,
  CornerDownLeft,
  Eraser,
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
  Type,
  Underline,
  Undo2,
} from 'lucide-react';

type EditorMode = 'visual' | 'html' | 'preview';
type ColorMenuType = 'text' | 'highlight';
type HeadingFormat = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type BlockFormat = 'p' | HeadingFormat;
type ToolbarState = {
  block: BlockFormat;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  fontSize: number;
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

const BLOCK_TAG_SET = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'blockquote', 'pre', 'hr', 'br', 'section', 'article', 'header', 'footer', 'figure', 'figcaption']);
const VOID_TAG_SET = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
const HEADING_FORMATS: readonly HeadingFormat[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const HEADING_SELECTOR = HEADING_FORMATS.join(', ');
const DIRECT_FONT_SIZE_TAGS = new Set(['p', 'div', 'td', 'th']);
const WRAPPED_FONT_SIZE_TAGS = new Set(['li', 'blockquote', ...HEADING_FORMATS]);
const TEXT_CONTAINER_SELECTOR = 'p, div, li, td, th, blockquote, h1, h2, h3, h4, h5, h6';
const DEFAULT_FONT_SIZE = 14;
const FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36] as const;
const BLOCK_FORMAT_OPTIONS: readonly { value: BlockFormat; label: string; title: string }[] = [
  { value: 'p', label: 'P', title: 'Paragrafo' },
  ...HEADING_FORMATS.map((heading) => ({
    value: heading,
    label: heading.toUpperCase(),
    title: `Titolo ${heading.toUpperCase()}`,
  })),
];

function isBlockTag(tag: string) { return BLOCK_TAG_SET.has(tag.toLowerCase()); }
function isSelfClosing(tok: string, tag: string) { return tok.endsWith('/>') || VOID_TAG_SET.has(tag.toLowerCase()); }

function applyClosingTag(tok: string, tag: string, out: string, depth: number): { out: string; depth: number } {
  if (!isBlockTag(tag)) return { out: out + tok, depth };
  const newDepth = Math.max(0, depth - 1);
  const newOut = (out.endsWith('\n') ? out : out + '\n') + `${'  '.repeat(newDepth)}${tok}\n`;
  return { out: newOut, depth: newDepth };
}

function applyOpeningTag(tok: string, tag: string, out: string, depth: number): { out: string; depth: number } {
  if (!isBlockTag(tag)) return { out: out + tok, depth };
  const newOut = (out.endsWith('\n') ? out : out + '\n') + `${'  '.repeat(depth)}${tok}\n`;
  const newDepth = isSelfClosing(tok, tag) ? depth : depth + 1;
  return { out: newOut, depth: newDepth };
}

// eslint-disable-next-line sonarjs/slow-regex
const TAG_SPLIT_RE = /(<[^>]+>)/;

function formatHtml(html: string): string {
  const tokens = cleanContractHtml(html).split(TAG_SPLIT_RE);
  let out = '';
  let depth = 0;

  for (const tok of tokens) {
    if (!tok) continue;
    if (!tok.startsWith('<')) {
      const text = tok.replace(/\s+/g, ' ');
      if (text.trim()) out += text;
      continue;
    }
    const closingTag = tok.match(/^<\/([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
    const openingTag = tok.match(/^<([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
    if (closingTag) {
      ({ out, depth } = applyClosingTag(tok, closingTag, out, depth));
    } else if (openingTag) {
      ({ out, depth } = applyOpeningTag(tok, openingTag, out, depth));
    } else {
      out += tok;
    }
  }
  return out.trim();
}

const initialToolbarState: ToolbarState = {
  block: 'p',
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
  fontSize: DEFAULT_FONT_SIZE,
};

function getBlockFormatLabel(block: BlockFormat): string {
  return BLOCK_FORMAT_OPTIONS.find((option) => option.value === block)?.label || 'P';
}

function BlockFormatMenu({
  value,
  isOpen,
  onToggle,
  onSelect,
}: {
  value: BlockFormat;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (format: BlockFormat) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        title="Tag HTML"
        aria-label="Tag HTML"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggle}
        className={`h-9 min-w-20 px-2.5 inline-flex items-center justify-between gap-2 rounded-lg border hover:opacity-80 transition-colors ${
          isOpen || value !== 'p'
            ? `${colors.primary.bg} text-white border-transparent shadow-sm`
            : `${colors.background.secondary} ${colors.icon.interactive} ${colors.border.primary}`
        }`}
      >
        <Pilcrow className="w-4 h-4" />
        <span className="text-xs font-semibold">{getBlockFormatLabel(value)}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute left-0 z-50 mt-2 w-44 rounded-xl border ${colors.border.primary} ${colors.background.card} ${colors.effects.shadow.xl} p-2`}>
          {BLOCK_FORMAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={value === option.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(option.value)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-opacity hover:opacity-80 ${
                value === option.value
                  ? `${colors.primary.bg} text-white`
                  : `${colors.background.secondary} ${colors.text.secondary}`
              }`}
            >
              <span className="w-8 font-mono text-xs font-semibold">{option.label}</span>
              <span>{option.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FontSizeMenu({
  value,
  isOpen,
  onToggle,
  onSelect,
}: {
  value: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (size: number) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        title="Dimensione testo"
        aria-label="Dimensione testo"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggle}
        className={`h-9 min-w-24 px-2.5 inline-flex items-center justify-between gap-2 rounded-lg border hover:opacity-80 transition-colors ${
          isOpen || value !== DEFAULT_FONT_SIZE
            ? `${colors.primary.bg} text-white border-transparent shadow-sm`
            : `${colors.background.secondary} ${colors.icon.interactive} ${colors.border.primary}`
        }`}
      >
        <Type className="w-4 h-4" />
        <span className="text-xs font-semibold">{value}px</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute left-0 z-50 mt-2 grid w-36 grid-cols-2 gap-1 rounded-xl border ${colors.border.primary} ${colors.background.card} ${colors.effects.shadow.xl} p-2`}>
          {FONT_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              role="menuitemradio"
              aria-checked={value === size}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(size)}
              className={`rounded-lg px-2 py-1.5 text-center text-sm font-semibold transition-opacity hover:opacity-80 ${
                value === size
                  ? `${colors.primary.bg} text-white`
                  : `${colors.background.secondary} ${colors.text.secondary}`
              }`}
            >
              {size}px
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getSelectedBlock(editor: HTMLElement): BlockFormat {
  const selection = document.getSelection();
  let currentNode = selection?.anchorNode;

  if (currentNode?.nodeType === 3) {
    currentNode = currentNode.parentElement;
  }

  while (currentNode instanceof HTMLElement && currentNode !== editor) {
    const tagName = currentNode.tagName.toLowerCase();
    if (HEADING_FORMATS.includes(tagName as HeadingFormat)) return tagName as HeadingFormat;
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

function getSelectedFontSize(editor: HTMLElement): number {
  const selection = document.getSelection();
  let currentNode = selection?.anchorNode;

  if (currentNode?.nodeType === 3) {
    currentNode = currentNode.parentElement;
  }

  if (!(currentNode instanceof HTMLElement) || !editor.contains(currentNode)) {
    return DEFAULT_FONT_SIZE;
  }

  const fontSize = Number.parseFloat(window.getComputedStyle(currentNode).fontSize);
  return Number.isFinite(fontSize) ? Math.round(fontSize) : DEFAULT_FONT_SIZE;
}

function htmlFromPlainText(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
    .join('');
}

function normalizeVisibleText(text: string): string {
  return text
    .replaceAll('\u00A0', ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function htmlFromVisibleText(text: string): string {
  return normalizeVisibleText(text)
    .split('\n')
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

function getEditorSelection(editor: HTMLElement): Selection | null {
  const selection = document.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer) ? selection : null;
}

function createPlainTextFragment(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const lines = normalizeVisibleText(text).split('\n');

  lines.forEach((line, index) => {
    if (index > 0) fragment.append(document.createElement('br'));
    if (line) fragment.append(document.createTextNode(line));
  });

  return fragment;
}

function isBlankEditorNode(node: ChildNode): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeVisibleText(node.textContent || '') === '';
  }

  if (!(node instanceof HTMLElement)) {
    return false;
  }

  const tagName = node.tagName.toLowerCase();
  if (tagName === 'br') return true;
  if (node.querySelector('img, table, hr')) return false;

  return normalizeVisibleText(node.innerText || node.textContent || '') === '';
}

function trimEditorBlankEdges(editor: HTMLElement): boolean {
  let changed = false;

  while (editor.firstChild && isBlankEditorNode(editor.firstChild)) {
    editor.firstChild.remove();
    changed = true;
  }

  while (editor.lastChild && isBlankEditorNode(editor.lastChild)) {
    editor.lastChild.remove();
    changed = true;
  }

  return changed;
}

function placeCaretAtStart(editor: HTMLElement) {
  const selection = document.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function replaceSelectionWithPlainText(selection: Selection, text: string) {
  const range = selection.getRangeAt(0);
  const fragment = createPlainTextFragment(text);
  const lastNode = fragment.lastChild;

  range.deleteContents();
  range.insertNode(fragment);

  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function createFontSizeSpan(fontSize: number): HTMLSpanElement {
  const span = document.createElement('span');
  span.style.setProperty('font-size', `${fontSize}px`, 'important');
  return span;
}

function isHeadingElement(element: HTMLElement): boolean {
  return HEADING_FORMATS.includes(element.tagName.toLowerCase() as HeadingFormat);
}

function removeEmptyStyleAttribute(element: HTMLElement) {
  if (!element.getAttribute('style')?.trim()) {
    element.removeAttribute('style');
  }
}

function clearFontSizeStyles(root: ParentNode) {
  if (root instanceof HTMLElement) {
    root.style.removeProperty('font-size');
    removeEmptyStyleAttribute(root);
  }

  root.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    element.style.removeProperty('font-size');
    removeEmptyStyleAttribute(element);
  });
}

function convertHeadingToParagraph(heading: HTMLElement): HTMLParagraphElement {
  const paragraph = document.createElement('p');
  const style = heading.getAttribute('style');

  if (style) {
    paragraph.setAttribute('style', style);
    paragraph.style.removeProperty('font-size');
    removeEmptyStyleAttribute(paragraph);
  }

  while (heading.firstChild) {
    paragraph.append(heading.firstChild);
  }

  heading.replaceWith(paragraph);
  return paragraph;
}

function convertTemporaryFontTags(editor: HTMLElement, fontSize: number) {
  editor.querySelectorAll('font[size="7"]').forEach((fontElement) => {
    const span = createFontSizeSpan(fontSize);

    while (fontElement.firstChild) {
      span.append(fontElement.firstChild);
    }

    fontElement.replaceWith(span);
  });
}

function getCurrentTextContainer(editor: HTMLElement, node: Node | null): HTMLElement | null {
  let currentNode = node;

  if (currentNode?.nodeType === 3) {
    currentNode = currentNode.parentElement;
  }

  while (currentNode instanceof HTMLElement && currentNode !== editor) {
    const tagName = currentNode.tagName.toLowerCase();
    if (DIRECT_FONT_SIZE_TAGS.has(tagName) || WRAPPED_FONT_SIZE_TAGS.has(tagName)) {
      return currentNode;
    }
    currentNode = currentNode.parentElement;
  }

  return null;
}

function applyFontSizeToContainer(container: HTMLElement, fontSize: number) {
  const targetContainer = isHeadingElement(container) ? convertHeadingToParagraph(container) : container;
  const tagName = targetContainer.tagName.toLowerCase();

  clearFontSizeStyles(targetContainer);

  if (DIRECT_FONT_SIZE_TAGS.has(tagName)) {
    targetContainer.style.setProperty('font-size', `${fontSize}px`, 'important');
    return;
  }

  const span = createFontSizeSpan(fontSize);
  while (targetContainer.firstChild) {
    span.append(targetContainer.firstChild);
  }
  targetContainer.append(span);
}

function convertSelectedHeadingsToParagraphs(editor: HTMLElement, selection: Selection): boolean {
  const range = selection.getRangeAt(0);
  const selectedHeadings = Array.from(editor.querySelectorAll<HTMLElement>(HEADING_SELECTOR)).filter((heading) => {
    try {
      return range.intersectsNode(heading);
    } catch {
      return false;
    }
  });

  selectedHeadings.forEach(convertHeadingToParagraph);
  return selectedHeadings.length > 0;
}

function getSelectedTextContainers(editor: HTMLElement, selection: Selection): HTMLElement[] {
  if (selection.isCollapsed) {
    const container = getCurrentTextContainer(editor, selection.anchorNode);
    return container ? [container] : [];
  }

  const range = selection.getRangeAt(0);
  return Array.from(editor.querySelectorAll<HTMLElement>(TEXT_CONTAINER_SELECTOR)).filter((container) => {
    try {
      return range.intersectsNode(container);
    } catch {
      return false;
    }
  });
}

function clearSelectedFontSizeStyles(editor: HTMLElement, selection: Selection) {
  getSelectedTextContainers(editor, selection).forEach(clearFontSizeStyles);
}

function wrapLooseTextNodes(editor: HTMLElement, fontSize: number) {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (normalizeVisibleText(node.textContent || '') === '') return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      return parent?.closest(TEXT_CONTAINER_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const span = createFontSizeSpan(fontSize);
    textNode.replaceWith(span);
    span.append(textNode);
  });
}

function isFullEditorSelection(editor: HTMLElement, selection: Selection): boolean {
  return normalizeVisibleText(selection.toString()) === normalizeVisibleText(editor.innerText);
}

function applyFontSizeToAllContent(editor: HTMLElement, fontSize: number) {
  clearFontSizeStyles(editor);

  const containers = Array.from(editor.querySelectorAll<HTMLElement>(TEXT_CONTAINER_SELECTOR)).filter((container) => {
    if (container.querySelector(TEXT_CONTAINER_SELECTOR)) return false;
    return normalizeVisibleText(container.innerText || container.textContent || '') !== '';
  });

  containers.forEach((container) => applyFontSizeToContainer(container, fontSize));
  wrapLooseTextNodes(editor, fontSize);
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
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const [isFontSizeMenuOpen, setIsFontSizeMenuOpen] = useState(false);
  const [selectedYearOffset, setSelectedYearOffset] = useState(yearOffsetContractPlaceholders[0]?.offset ?? 1);
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
      fontSize: getSelectedFontSize(editor),
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

  const handleEditorKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    updateToolbarState();

    if (event.key !== 'Backspace' && event.key !== 'Delete') return;

    const editor = editorRef.current;
    if (!editor || !trimEditorBlankEdges(editor)) return;

    onChange(editor.innerHTML);
  };

  const runCommand = (command: string, commandValue?: string) => {
    setOpenColorMenu(null);
    setIsBlockMenuOpen(false);
    setIsFontSizeMenuOpen(false);
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitVisualContent();
    requestAnimationFrame(updateToolbarState);
  };

  const applyBlockFormat = (format: BlockFormat) => {
    const editor = editorRef.current;
    const selection = document.getSelection();

    if (
      format !== 'p' &&
      editor &&
      selection?.rangeCount &&
      editor.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      clearSelectedFontSizeStyles(editor, selection);
    }

    runCommand('formatBlock', format);
  };

  const removeAllFormat = () => {
    const editor = editorRef.current;
    if (!editor) return;

    setOpenColorMenu(null);
    setIsBlockMenuOpen(false);
    setIsFontSizeMenuOpen(false);
    editor.focus();

    const selection = getEditorSelection(editor);
    const isFullCleanup = !selection;
    if (selection) {
      replaceSelectionWithPlainText(selection, selection.toString());
      trimEditorBlankEdges(editor);
      emitVisualContent();
    } else {
      const nextHtml = htmlFromVisibleText(editor.innerText);
      editor.innerHTML = nextHtml;
      onChange(nextHtml);
    }

    setToolbarState(initialToolbarState);
    requestAnimationFrame(() => {
      editor.focus();
      if (isFullCleanup) {
        editor.scrollTop = 0;
        placeCaretAtStart(editor);
      }
      updateToolbarState();
    });
  };

  const insertHtml = (html: string) => {
    setOpenColorMenu(null);
    setIsBlockMenuOpen(false);
    setIsFontSizeMenuOpen(false);
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emitVisualContent();
    requestAnimationFrame(updateToolbarState);
  };

  const applyFontSize = (fontSize: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    setOpenColorMenu(null);
    setIsBlockMenuOpen(false);
    setIsFontSizeMenuOpen(false);
    editor.focus();

    const selection = document.getSelection();
    if (selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      if (selection.isCollapsed) {
        const currentContainer = getCurrentTextContainer(editor, selection.anchorNode);
        if (currentContainer) {
          applyFontSizeToContainer(currentContainer, fontSize);
        }
      } else if (isFullEditorSelection(editor, selection)) {
        applyFontSizeToAllContent(editor, fontSize);
      } else {
        convertSelectedHeadingsToParagraphs(editor, selection);
        document.execCommand('fontSize', false, '7');
        convertTemporaryFontTags(editor, fontSize);
      }
    }

    emitVisualContent();
    setToolbarState((current) => ({ ...current, fontSize }));
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

  const handleYearOffsetChange = (offsetValue: string) => {
    const placeholder = yearOffsetContractPlaceholders.find((option) => option.offset.toString() === offsetValue);
    if (placeholder) {
      setSelectedYearOffset(placeholder.offset);
      insertPlaceholder(placeholder);
    }
  };

  const regularPlaceholders = placeholders.filter((placeholder) => placeholder.tag !== '{{ANNO}}');
  const currentYearPlaceholder = placeholders.find((placeholder) => placeholder.tag === '{{ANNO}}');

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
        <ContractContentEditorModeSwitch
          mode={mode}
          onModeChange={(newMode) => {
            if (newMode === 'html') onChange(formatHtml(value));
            setMode(newMode);
          }}
        />
      </div>

      {mode === 'visual' && (
        <div className={`flex flex-wrap items-center gap-2 p-3 rounded-t-xl border-t border-l border-r ${error ? colors.status.error.border : colors.border.primary} ${colors.background.secondary}`}>
              <BlockFormatMenu
                value={toolbarState.block}
                isOpen={isBlockMenuOpen}
                onToggle={() => {
                  setOpenColorMenu(null);
                  setIsFontSizeMenuOpen(false);
                  setIsBlockMenuOpen((current) => !current);
                }}
                onSelect={applyBlockFormat}
              />
              <ToolbarDivider />
              <FontSizeMenu
                value={toolbarState.fontSize}
                isOpen={isFontSizeMenuOpen}
                onToggle={() => {
                  setOpenColorMenu(null);
                  setIsBlockMenuOpen(false);
                  setIsFontSizeMenuOpen((current) => !current);
                }}
                onSelect={applyFontSize}
              />
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
                onToggle={() => {
                  setIsBlockMenuOpen(false);
                  setIsFontSizeMenuOpen(false);
                  setOpenColorMenu((current) => (current === 'text' ? null : 'text'));
                }}
                onSelect={(color) => applyEditorColor('foreColor', color)}
              />
              <ColorMenu
                title="Evidenzia"
                icon={<Highlighter className="w-4 h-4" />}
                options={colors.contractEditor.highlightPalette}
                isOpen={openColorMenu === 'highlight'}
                selectedColor={highlightColor}
                onToggle={() => {
                  setIsBlockMenuOpen(false);
                  setIsFontSizeMenuOpen(false);
                  setOpenColorMenu((current) => (current === 'highlight' ? null : 'highlight'));
                }}
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
              <ToolbarButton title="Giustifica" onClick={() => runCommand('justifyFull')}>
                <AlignJustify className="w-4 h-4" />
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
              onKeyUp={handleEditorKeyUp}
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
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(
                  value.replaceAll('{{FIRMA}}', '<div style="display:inline-flex;align-items:center;justify-content:center;width:220px;height:80px;border:2px dashed #8B1A1A;border-radius:6px;background:#fdf5f5;color:#8B1A1A;font-size:12px;font-style:italic;margin:8px 0;">[ Riquadro Firma ]</div>')
                ) }} />
              </div>
            )}
          </div>

      <div className="space-y-2">
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
          <div className={`w-full rounded-xl border ${colors.border.primary} ${colors.background.card} ${colors.effects.shadow.xl} p-3`}>
            <div className={`mb-3 flex flex-wrap items-center gap-2 rounded-xl border ${colors.border.primary} ${colors.background.secondary} p-2`}>
              {currentYearPlaceholder && (
                <button
                  type="button"
                  title={currentYearPlaceholder.desc}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertPlaceholder(currentYearPlaceholder)}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg border ${colors.border.primary} ${colors.background.secondary} ${colors.text.secondary} px-2.5 text-xs font-medium hover:opacity-80 transition-opacity`}
                >
                  Anno corrente
                </button>
              )}
              <div className="w-44">
                <CustomSelect
                  value=""
                  options={yearOffsetContractPlaceholders.map((placeholder) => ({
                    value: placeholder.offset.toString(),
                    label: placeholder.label,
                  }))}
                  onChange={handleYearOffsetChange}
                  placeholder={`Anno +${selectedYearOffset}`}
                  size="sm"
                  className="w-full"
                  dropdownClassName="text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 overflow-visible">
              {regularPlaceholders.map((placeholder) => (
                <button
                  key={placeholder.tag}
                  type="button"
                  title={placeholder.desc}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertPlaceholder(placeholder)}
                  className={`inline-flex max-w-full items-center gap-2 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-mono ${colors.background.secondary} ${colors.text.secondary} border ${colors.border.primary} hover:opacity-80 transition-opacity`}
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