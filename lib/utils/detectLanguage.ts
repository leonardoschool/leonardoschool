/**
 * Riconoscimento della lingua di una domanda dal suo testo.
 *
 * Usa le parole funzionali (articoli, preposizioni, congiunzioni) invece di
 * termini di argomento: sono le più frequenti in qualunque testo e non dipendono
 * dalla materia, quindi funzionano anche su una domanda di matematica o fisica
 * dove il lessico specifico è quasi identico nelle due lingue.
 */

import type { QuestionLanguage } from '@/lib/validations/questionValidation';

// Escluse di proposito le parole ambigue fra le due lingue ("in", "a", "e", "no").
const IT_STOPWORDS = new Set([
  'di', 'che', 'il', 'la', 'le', 'lo', 'gli', 'un', 'una', 'uno', 'per', 'con',
  'non', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'nel', 'nella', 'nei',
  'sono', 'come', 'quale', 'quali', 'questo', 'questa', 'queste', 'questi',
  'alla', 'allo', 'agli', 'alle', 'dal', 'dalla', 'più', 'anche', 'se', 'ma',
  'sia', 'essere', 'viene', 'seguenti', 'seguente', 'rispetto', 'ciascun',
]);

const EN_STOPWORDS = new Set([
  'the', 'of', 'and', 'is', 'are', 'which', 'that', 'with', 'for', 'from',
  'this', 'these', 'those', 'following', 'what', 'was', 'were', 'have', 'has',
  'been', 'their', 'they', 'its', 'each', 'both', 'only', 'than', 'then',
  'when', 'where', 'while', 'about', 'into', 'between', 'because', 'does',
]);

/**
 * Toglie i tag HTML sostituendoli con uno SPAZIO.
 *
 * Non riusa `stripHtml` di sanitizeHtml.ts perché quello li elimina senza
 * separatore: `a<br>b` diventerebbe `ab`, saldando due parole e falsando il
 * conteggio. Scritto a indici invece che con una regex, come lì, per non
 * incorrere in `sonarjs/slow-regex`.
 */
function stripTags(input: string): string {
  let result = '';
  let cursor = 0;
  let open = input.indexOf('<');
  while (open !== -1) {
    const close = input.indexOf('>', open);
    if (close === -1) break;
    result += input.slice(cursor, open) + ' ';
    cursor = close + 1;
    open = input.indexOf('<', cursor);
  }
  return result + input.slice(cursor);
}

/** Via HTML, comandi LaTeX e immagini inline: resta il testo leggibile. */
function plainText(raw: string): string {
  // Classi negate senza quantificatori annidati: match lineare, nessun rischio ReDoS.
  const withoutImages = raw.replace(/\\includegraphics[^{]*\{[^}]*\}/g, ' ');
  return stripTags(withoutImages)
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}$\\]/g, ' ')
    .toLowerCase();
}

export interface LanguageScore {
  it: number;
  en: number;
  words: number;
}

export function scoreLanguage(text: string): LanguageScore {
  const words = plainText(text).split(/[^a-zàèéìòóùü]+/).filter(Boolean);
  let it = 0;
  let en = 0;
  for (const word of words) {
    if (IT_STOPWORDS.has(word)) it++;
    if (EN_STOPWORDS.has(word)) en++;
  }
  return { it, en, words: words.length };
}

/**
 * La lingua della domanda, o `null` quando il testo non basta a deciderlo
 * (formule, tabelle, poche parole): in quel caso decide chi importa, non noi.
 *
 * Volutamente prudente: serve una netta prevalenza di una delle due lingue,
 * perché un'etichetta sbagliata è peggio di un'etichetta lasciata al default —
 * una domanda inglese marcata italiana finisce nelle esercitazioni "solo italiano".
 */
export function detectQuestionLanguage(...texts: string[]): QuestionLanguage | null {
  const { it, en, words } = scoreLanguage(texts.filter(Boolean).join(' \n '));
  if (words < 8) return null;
  if (en >= 3 && it === 0) return 'EN';
  if (it >= 3 && en === 0) return 'IT';
  // Testo misto (es. domanda inglese con una citazione italiana): non decidiamo.
  return null;
}
