/**
 * Italian copy for the calibration codes stored in the database.
 *
 * `reasonCode` and `qualityFlagCode` stay in English in the DB on purpose: the audit
 * trail has to remain readable years later, and freezing user-facing wording into rows
 * makes the history unreadable the first time the copy changes.
 */

export const reasonCodeLabels: Record<string, string> = {
  TOO_HARD_FOR_LEVEL:
    'Sbagliata o omessa molto più di quanto fosse prevedibile per il livello attuale.',
  TOO_EASY_FOR_LEVEL:
    'Indovinata molto più di quanto fosse prevedibile per il livello attuale.',
  STAFF_OVERRIDE: 'Difficoltà cambiata a mano dallo staff.',
  REVERT: 'Annullamento di una modifica precedente.',
};

/**
 * A low correlation with the rest of the test is a reason to look, not a verdict: it
 * can also mean the question covers a topic unlike the rest of its subject. The wording
 * here matters — "possibile" and "da verificare", never "sbagliata" — otherwise staff
 * will delete perfectly good questions.
 */
export const qualityFlagLabels: Record<string, string> = {
  KEY_SUSPECT:
    'Da verificare: gli studenti più preparati la sbagliano più degli altri. Spesso significa che la risposta segnata come corretta è quella sbagliata.',
  LOW_DISCRIMINATION:
    'Da verificare: l’esito non dipende dalla preparazione dello studente. Può indicare un testo ambiguo, oppure un argomento diverso dal resto della materia.',
  BELOW_CHANCE:
    'Da verificare: la percentuale di risposte corrette è inferiore a quella che darebbe il caso.',
};

/**
 * How much a subject's reference scale can be trusted.
 *
 * "Bassa" is not a fault: it is the honest state of a subject that has not yet
 * accumulated enough measured questions, and it tells a reviewer to weigh their own
 * judgement more heavily than the number.
 */
export const scaleConfidenceLabels: Record<string, string> = {
  HIGH: 'affidabilità alta',
  MEDIUM: 'affidabilità media',
  LOW: 'affidabilità bassa',
};

/** Short label for the direction of a proposal, for counters and chips. */
export const directionLabels = {
  harder: 'più difficili',
  easier: 'più facili',
} as const;
