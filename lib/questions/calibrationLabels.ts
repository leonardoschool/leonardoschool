/**
 * Italian copy for the calibration codes stored in the database.
 *
 * `reasonCode` and `qualityFlagCode` stay in English in the DB on purpose: the audit
 * trail has to remain readable years later, and freezing user-facing wording into rows
 * makes the history unreadable the first time the copy changes.
 */

export const reasonCodeLabels: Record<string, string> = {
  TOO_HARD_FOR_LEVEL:
    'Gli studenti la sbagliano o la saltano molto più di quanto ci si aspetti dal livello che ha adesso.',
  TOO_EASY_FOR_LEVEL:
    'Gli studenti la azzeccano molto più di quanto ci si aspetti dal livello che ha adesso.',
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
  HIGH_OMISSION:
    'Da verificare: moltissimi la lasciano in bianco. Saltarla conviene, visto che sbagliare toglie punti, quindi qui il sistema misura quanto viene evitata più di quanto sia difficile. Spesso è un testo troppo lungo, un argomento fuori programma o una consegna poco chiara.',
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
