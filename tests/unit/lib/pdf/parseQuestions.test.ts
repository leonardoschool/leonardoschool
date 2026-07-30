import { describe, it, expect } from 'vitest';
import { parseQuestions, type PdfTextItem } from '@/lib/pdf/parseQuestions';

/**
 * Builds one text item per line on a page, laid out top-to-bottom.
 * PDF y grows upward, so earlier lines get the higher y.
 */
function page(lines: string[], pageIdx = 0, startY = 800, step = 20): PdfTextItem[] {
  return lines.map((text, i) => ({ str: text, x: 50, y: startY - i * step, page: pageIdx }));
}

/** Same as `page`, but every line carries an explicit x so indentation matters. */
function laidOut(
  lines: { text: string; x: number }[],
  pageIdx = 0,
  startY = 800,
  step = 20
): PdfTextItem[] {
  return lines.map((l, i) => ({ str: l.text, x: l.x, y: startY - i * step, page: pageIdx }));
}

/** The y of the nth line produced by `page`/`laidOut` with default spacing. */
const lineY = (index: number, startY = 800, step = 20) => startY - index * step;

const CLEAN_Q1 = [
  '1 What is 2 plus 2?',
  'A Four',
  'B Three',
  'C Five',
  'D Six',
  'E Seven',
];

describe('parseQuestions', () => {
  it('parses sequential questions with five options', () => {
    const items = page([
      'Ministero della Istruzione',
      ...CLEAN_Q1,
      '2 What is the capital of France?',
      'A Paris',
      'B London',
      'C Rome',
      'D Berlin',
      'E Madrid',
    ]);
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(2);
    expect(qs[0].number).toBe(1);
    expect(qs[0].text).toBe('What is 2 plus 2?');
    expect(qs[0].answers.map((a) => a.label)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(qs[0].answers[0].text).toBe('Four');
    expect(qs[0].correctLetter).toBe('A');
    expect(qs[0].suspicious).toBe(false);
    expect(qs[1].number).toBe(2);
    expect(qs[1].answers[0].text).toBe('Paris');
  });

  /**
   * A section heading is recognised by what FOLLOWS it: a new question. The last line
   * of the document follows nothing, so it can never be one — but reading its missing
   * successor as "a question starts here" dropped it every time, silently eating the
   * wrapped tail of the final option in the centred two-column IMAT layout.
   */
  it('keeps the wrapped tail of the last option instead of reading it as a heading', () => {
    const items = laidOut([
      { text: '1 What is 2 plus 2?', x: 50 },
      { text: 'A Four', x: 50 },
      { text: 'B Three', x: 50 },
      { text: 'C Five', x: 50 },
      { text: 'D Six', x: 50 },
      { text: 'E Seven of the above', x: 50 },
      // Indented continuation with no terminal punctuation: heading-shaped, but final.
      { text: 'and none of the others', x: 120 },
    ]);
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(1);
    expect(qs[0].answers).toHaveLength(5);
    expect(qs[0].answers[4].text).toContain('none of the others');
  });

  it('drops repeated header/footer noise lines', () => {
    const items = page([
      'IMAT 2011 - MIUR 2011',
      'General Knowledge and Logical Reasoning',
      ...CLEAN_Q1,
    ]);
    const qs = parseQuestions(items);
    expect(qs).toHaveLength(1);
    expect(qs[0].text).toBe('What is 2 plus 2?');
  });

  it('appends continuation lines to the current answer', () => {
    const items = page([
      '1 A question that wraps',
      'A first option that',
      'continues on next line',
      'B second',
      'C third',
      'D fourth',
      'E fifth',
    ]);
    const qs = parseQuestions(items);
    expect(qs[0].answers[0].text).toBe('first option that continues on next line');
  });

  it('appends continuation lines to the stem before any answer appears', () => {
    const items = page([
      '1 Stem line one',
      'stem line two',
      'A opt',
      'B opt',
      'C opt',
      'D opt',
      'E opt',
    ]);
    const qs = parseQuestions(items);
    expect(qs[0].text).toBe('Stem line one stem line two');
  });

  it('flags a question with the wrong number of options as suspicious', () => {
    const items = page(['1 Broken question', 'A only option']);
    const qs = parseQuestions(items);
    expect(qs[0].suspicious).toBe(true);
    expect(qs[0].suspiciousReasons.join(' ')).toMatch(/1 risposte/);
  });

  it('flags visual/table content as suspicious even with five options', () => {
    const items = page([
      '1 The table below shows the results',
      'A one',
      'B two',
      'C three',
      'D four',
      'E five',
    ]);
    const qs = parseQuestions(items);
    expect(qs[0].suspicious).toBe(true);
    expect(qs[0].suspiciousReasons.join(' ')).toMatch(/tabella/i);
  });

  it('does not flag plain arithmetic stems that merely contain numbers', () => {
    const items = page([
      '1 A taxi charges 1 euro per km for 3 km then 70 cents after that',
      'A ten',
      'B twenty',
      'C thirty',
      'D forty',
      'E fifty',
    ]);
    const qs = parseQuestions(items);
    expect(qs[0].suspicious).toBe(false);
  });

  it('parses the punctuated marker style used by Italian university papers', () => {
    const items = page([
      '1. Quale delle seguenti affermazioni è corretta?',
      'A) Prima opzione',
      'B) Seconda opzione',
      'C) Terza opzione',
      'D) Quarta opzione',
      'E) Quinta opzione',
      '2. Seconda domanda?',
      'A)Senza spazio dopo la parentesi',
      'B. Con il punto',
      'C) Terza',
      'D) Quarta',
      'E) Quinta',
    ]);
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(2);
    expect(qs[0].text).toBe('Quale delle seguenti affermazioni è corretta?');
    expect(qs[0].answers[0].text).toBe('Prima opzione');
    expect(qs[0].suspicious).toBe(false);
    expect(qs[1].answers[0].text).toBe('Senza spazio dopo la parentesi');
    expect(qs[1].answers[1].text).toBe('Con il punto');
  });

  it('does not read a thousands-separated amount as a new question marker', () => {
    const items = page([
      '1. Per i primi',
      '15.000 € si applica una percentuale del 23%',
      'A) Prima',
      'B) Seconda',
      'C) Terza',
      'D) Quarta',
      'E) Quinta',
    ]);
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(1);
    expect(qs[0].text).toBe('Per i primi 15.000 € si applica una percentuale del 23%');
  });

  it('drops a centred section title but keeps a centred passage attribution', () => {
    const items = laidOut([
      { text: '1. Prima domanda?', x: 68 },
      { text: 'Marco Rossi, Il libro, Editore', x: 350 },
      { text: 'Quale affermazione si ricava dal testo?', x: 89 },
      { text: 'A) Prima', x: 110 },
      { text: 'B) Seconda', x: 110 },
      { text: 'C) Terza', x: 110 },
      { text: 'D) Quarta', x: 110 },
      { text: 'E) Quinta', x: 110 },
      { text: 'Test di Biologia', x: 277 },
      { text: '2. Seconda domanda?', x: 68 },
      { text: 'A) Prima', x: 110 },
      { text: 'B) Seconda', x: 110 },
      { text: 'C) Terza', x: 110 },
      { text: 'D) Quarta', x: 110 },
      { text: 'E) Quinta', x: 110 },
    ]);
    const qs = parseQuestions(items);

    expect(qs[0].text).toContain('Marco Rossi, Il libro, Editore');
    expect(qs[0].answers[4].text).toBe('Quinta');
    expect(qs[1].text).toBe('Seconda domanda?');
  });

  it('drops a repeated header without needing a noise pattern for it', () => {
    const header = 'Università degli Studi di Pavia';
    const items = [0, 1, 2, 3].flatMap((p) =>
      page([header, `${p + 1}. Domanda numero ${p + 1}?`, 'A) a', 'B) b', 'C) c', 'D) d', 'E) e'], p)
    );
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(4);
    qs.forEach((q) => expect(q.text).not.toContain('Università'));
  });

  it('takes the correct option from the PDF highlight', () => {
    const items = page(['1. Domanda?', 'A) a', 'B) b', 'C) c', 'D) d', 'E) e']);
    // Line 3 is option C; a highlight band brackets its baseline.
    const highlights = [{ page: 0, yTop: lineY(3) + 4, yBottom: lineY(3) - 4 }];
    const qs = parseQuestions(items, { highlights });

    expect(qs[0].correctLetter).toBe('C');
    expect(qs[0].answers[2].highlighted).toBe(true);
    expect(qs[0].suspicious).toBe(false);
  });

  it('flags a question the highlighted PDF left unmarked or marked twice', () => {
    const first = page(['1. Prima?', 'A) a', 'B) b', 'C) c', 'D) d', 'E) e'], 0);
    const second = page(['2. Seconda?', 'A) a', 'B) b', 'C) c', 'D) d', 'E) e'], 1);
    const highlights = [
      { page: 1, yTop: lineY(1) + 4, yBottom: lineY(1) - 4 },
      { page: 1, yTop: lineY(2) + 4, yBottom: lineY(2) - 4 },
    ];
    const qs = parseQuestions([...first, ...second], { highlights });

    expect(qs[0].suspiciousReasons.join(' ')).toMatch(/non evidenziata/i);
    expect(qs[1].suspiciousReasons.join(' ')).toMatch(/Più risposte evidenziate/i);
    expect(qs[1].correctLetter).toBe('A'); // never guessed from an ambiguous PDF
  });

  it('bounds the crop region only when the next question is on the same page', () => {
    const sceneSamePage = page([
      ...CLEAN_Q1,
      '2 Next on same page',
      'A a',
      'B b',
      'C c',
      'D d',
      'E e',
    ]);
    const same = parseQuestions(sceneSamePage);
    expect(Number.isFinite(same[0].region.yBottom)).toBe(true);

    const q1 = page(CLEAN_Q1, 0);
    const q2 = page(
      ['2 Next on another page', 'A a', 'B b', 'C c', 'D d', 'E e'],
      1
    );
    const crossPage = parseQuestions([...q1, ...q2]);
    expect(crossPage[0].region.yBottom).toBe(-Infinity);
    expect(crossPage[0].region.page).toBe(0);
  });

  it('ignores a numbered table of contents and starts at the real first question', () => {
    // The contents entries are numbered 1..2 in sequence, exactly like questions;
    // what separates them is that no option list follows.
    const contents = page(
      ['Indice', '1 Comprensione del Testo 3', '2 Ragionamento Logico 22'],
      0
    );
    const body = page(
      [
        '1. Polinice è figlio di:',
        'A. Creonte',
        'B. Edipo',
        'C. Eteocle',
        'D. Emone',
        'E. Antigone',
        '2. Antigone viene condannata perché:',
        'A. prima',
        'B. seconda',
        'C. terza',
        'D. quarta',
        'E. quinta',
      ],
      1
    );
    const qs = parseQuestions([...contents, ...body]);

    expect(qs).toHaveLength(2);
    expect(qs[0].text).toBe('Polinice è figlio di:');
    expect(qs[0].answers).toHaveLength(5);
    expect(qs[1].text).toBe('Antigone viene condannata perché:');
  });

  it('drops a running section head even though it reads as a question marker', () => {
    // Two sections, so no single wording covers enough pages to be caught by text:
    // it is the fixed slot, saying nearly the same thing, that gives it away.
    const items = [0, 1, 2, 3].flatMap((p) =>
      page(
        [
          `${p < 2 ? 1 : 2} - Sezione ${p < 2 ? 'Uno' : 'Due'}`,
          `${p + 1}. Domanda ${p + 1}?`,
          'A) a',
          'B) b',
          'C) c',
          'D) d',
          'E) e',
        ],
        p
      )
    );
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(4);
    qs.forEach((q) => {
      expect(q.text).not.toContain('Sezione');
      expect(q.answers[4].text).toBe('e');
    });
  });

  it('drops the printed page number without eating the last option', () => {
    const items = [0, 1, 2, 3].flatMap((p) =>
      page(
        [`${p + 1}. Domanda ${p + 1}?`, 'A) a', 'B) b', 'C) c', 'D) d', 'E) e', `${p + 1}`],
        p
      )
    );
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(4);
    qs.forEach((q) => expect(q.answers[4].text).toBe('e'));
  });

  it('reads a paper that prints the question number alone in its own column', () => {
    const items = laidOut([
      { text: '1', x: 37 },
      { text: "Che cos'è un gamete?", x: 64 },
      { text: 'A Una cellula sessuale', x: 65 },
      { text: 'B Ciascuno dei gemelli', x: 65 },
      { text: 'C La cellula fecondata', x: 65 },
      { text: 'D Una parte del corredo', x: 65 },
      { text: 'E Una fase dello sviluppo', x: 65 },
      { text: '2', x: 37 },
      { text: 'Dove si formano i globuli rossi?', x: 64 },
      { text: 'A Nel midollo osseo', x: 65 },
      { text: 'B Nei muscoli', x: 65 },
      { text: 'C Nei polmoni', x: 65 },
      { text: 'D Nel pancreas', x: 65 },
      { text: 'E Nel fegato', x: 65 },
    ]);
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(2);
    expect(qs[0].text).toBe("Che cos'è un gamete?");
    expect(qs[0].answers).toHaveLength(5);
    expect(qs[1].text).toBe('Dove si formano i globuli rossi?');
    expect(qs[1].answers[0].text).toBe('Nel midollo osseo');
  });

  it('does not swallow the next reading passage into the last option', () => {
    const first = laidOut(
      [
        { text: '1. La sconfitta di Creonte è dovuta:', x: 77 },
        { text: 'A. alla violenza', x: 107 },
        { text: 'B. al dolore', x: 107 },
        { text: 'C. all’arbitrio', x: 107 },
        { text: 'D. alla illegittimità', x: 107 },
        { text: 'E. al prevalere della pietas', x: 107 },
      ],
      0
    );
    const passage = laidOut(
      [
        { text: 'TESTO II', x: 268 },
        { text: 'La coesione sociale e la natura dell’uomo', x: 97 },
        { text: 'Brano tratto da B. Russell, Autorità e individuo', x: 78 },
        { text: 'Gli antenati dell’uomo primitivo discesero dagli alberi.', x: 57 },
      ],
      1
    );
    const qs = parseQuestions([...first, ...passage]);

    expect(qs).toHaveLength(1);
    expect(qs[0].answers[4].text).toBe('al prevalere della pietas');
  });

  it('marks the option-less questions of a completion section as open answers', () => {
    const items = laidOut([
      { text: 'DOMANDE A RISPOSTA MULTIPLA', x: 195 },
      { text: '1. Quale delle seguenti è corretta?', x: 57 },
      { text: 'A) prima', x: 100 },
      { text: 'B) seconda', x: 100 },
      { text: 'C) terza', x: 100 },
      { text: 'D) quarta', x: 100 },
      { text: 'E) quinta', x: 100 },
      { text: 'DOMANDE A RISPOSTA CON MODALITÀ A COMPLETAMENTO', x: 115 },
      { text: '2. La fosforilazione delle proteine regola l’attività', x: 57 },
      { text: 'enzimatica e la segnalazione cellulare.', x: 79 },
      { text: '3. L’imprinting genomico è un meccanismo epigenetico', x: 57 },
      { text: 'che dipende dal genitore di origine.', x: 79 },
    ]);
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(3);
    expect(qs[0].type).toBe('SINGLE_CHOICE');
    expect(qs[0].answers).toHaveLength(5);

    for (const open of qs.slice(1)) {
      expect(open.type).toBe('OPEN_TEXT');
      expect(open.answers).toHaveLength(0);
      // Nothing is missing here, so the row must not arrive flagged
      expect(open.suspicious).toBe(false);
      expect(open.suspiciousReasons).toEqual([]);
    }
    expect(qs[1].text).toBe(
      'La fosforilazione delle proteine regola l’attività enzimatica e la segnalazione cellulare.'
    );
  });

  it('keeps flagging an option-less question when no completion section is announced', () => {
    // Same shape, minus the heading: now the missing options are a parsing failure
    // worth a warning, not a written-answer section.
    const items = laidOut([
      { text: '1. Quale delle seguenti è corretta?', x: 57 },
      { text: 'A) prima', x: 100 },
      { text: 'B) seconda', x: 100 },
      { text: 'C) terza', x: 100 },
      { text: 'D) quarta', x: 100 },
      { text: 'E) quinta', x: 100 },
      { text: '2. Una domanda le cui opzioni non sono state lette', x: 57 },
      { text: 'perché impaginate in modo inatteso.', x: 79 },
      { text: '3. Un’altra nelle stesse condizioni, di seguito alla', x: 57 },
      { text: 'precedente.', x: 79 },
    ]);
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(3);
    for (const q of qs.slice(1)) {
      expect(q.type).toBe('SINGLE_CHOICE');
      expect(q.suspicious).toBe(true);
      expect(q.suspiciousReasons.join(' ')).toMatch(/Trovate 0 risposte/);
    }
  });

  it('still joins an option that wraps onto the next line of the same page', () => {
    const items = laidOut([
      { text: '1. Domanda?', x: 77 },
      { text: 'A. prima', x: 107 },
      { text: 'B. seconda', x: 107 },
      { text: 'C. terza', x: 107 },
      { text: 'D. quarta', x: 107 },
      { text: 'E. una risposta lunga che', x: 107 },
      // Ends with a full stop: prose, so the centred-heading heuristic leaves it be.
      { text: 'continua sulla riga dopo.', x: 107 },
    ]);
    const qs = parseQuestions(items);

    expect(qs[0].answers[4].text).toBe('una risposta lunga che continua sulla riga dopo.');
  });
});
