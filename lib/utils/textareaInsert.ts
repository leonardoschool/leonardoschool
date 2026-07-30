/**
 * Drops a snippet at the caret of a text field and leaves the cursor right after it.
 * Shared by the question form and the PDF import editor so both insert symbols,
 * HTML shortcuts and inline images the same way.
 */
export function insertAtCaret(
  element: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
  setValue: (next: string) => void,
  snippet: string
): void {
  if (!element) {
    setValue(value + snippet);
    return;
  }
  const start = element.selectionStart ?? value.length;
  const end = element.selectionEnd ?? start;
  setValue(value.substring(0, start) + snippet + value.substring(end));
  const nextPosition = start + snippet.length;
  // The caret can only be restored once React has re-rendered with the new value.
  setTimeout(() => {
    element.focus();
    element.setSelectionRange(nextPosition, nextPosition);
  }, 0);
}
