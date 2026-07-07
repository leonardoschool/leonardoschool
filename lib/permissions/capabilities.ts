/**
 * Capability catalog — the single source of truth for the app's fine-grained permissions.
 *
 * A "capability" is an atomic, human-meaningful permission (e.g. "correct open answers")
 * that backend procedures, routes and UI all check against — instead of scattering
 * `role === 'X' && kind === 'Y'` conditions across the codebase.
 *
 * Who is allowed what is decided by a per-subject matrix. There are three CONFIGURABLE
 * subjects; ADMIN is intentionally NOT here because it is a fixed super-user that always
 * holds every capability (enforced in the resolver, so an admin can never lock itself out).
 *
 * The `defaults` on each capability MIRROR the behavior the app already had before this
 * system existed (derived from the existing role/kind checks in the tRPC routers). The
 * DB `RolePermission` table only stores OVERRIDES: when a row is absent the default below
 * is used, so an empty table === today's behavior, with zero migration risk.
 */

export type PermissionSubject = 'STUDENT' | 'COLLABORATOR_TUTOR' | 'COLLABORATOR_SECRETARY';

export const PERMISSION_SUBJECTS: PermissionSubject[] = [
  'STUDENT',
  'COLLABORATOR_TUTOR',
  'COLLABORATOR_SECRETARY',
];

/** User-facing label for each subject (Italian — shown in the admin permissions matrix). */
export const SUBJECT_LABELS: Record<PermissionSubject, string> = {
  STUDENT: 'Studente',
  COLLABORATOR_TUTOR: 'Collaboratore · Tutor',
  COLLABORATOR_SECRETARY: 'Collaboratore · Segreteria',
};

export interface CapabilityDef {
  /** Machine identifier, referenced from procedures/UI. Never change once shipped. */
  key: string;
  /** User-facing area used to group rows in the admin matrix (Italian). */
  area: string;
  /** User-facing label (Italian). */
  label: string;
  /** Optional clarification shown under the label (Italian). */
  description?: string;
  /** Default enabled state per subject — mirrors pre-existing behavior. */
  defaults: Record<PermissionSubject, boolean>;
}

// Shorthand builders for the defaults triple, to keep the catalog readable.
const d = (student: boolean, tutor: boolean, secretary: boolean): Record<PermissionSubject, boolean> => ({
  STUDENT: student,
  COLLABORATOR_TUTOR: tutor,
  COLLABORATOR_SECRETARY: secretary,
});

/**
 * The catalog. Order matters: it drives the rendering order in the admin matrix.
 * Only actions that are meaningfully configurable live here — inherently admin-only
 * operations (contracts, user management, candidature, ...) stay guarded by
 * `adminProcedure` and are not part of the configurable surface.
 */
export const CAPABILITIES: CapabilityDef[] = [
  // ── Simulazioni ────────────────────────────────────────────────────────────
  { key: 'simulations.view', area: 'Simulazioni', label: 'Vedere le simulazioni', defaults: d(false, true, true) },
  { key: 'simulations.manage', area: 'Simulazioni', label: 'Creare e modificare simulazioni', description: 'Creazione, modifica, pubblicazione e archiviazione delle proprie simulazioni.', defaults: d(false, true, true) },
  { key: 'simulations.manageAll', area: 'Simulazioni', label: 'Gestire le simulazioni di tutti', description: 'Modificare, pubblicare e archiviare anche le simulazioni create da altri, non solo le proprie.', defaults: d(false, false, false) },
  { key: 'simulations.assign', area: 'Simulazioni', label: 'Gestire le assegnazioni', description: 'Assegnare, chiudere e riaprire simulazioni a studenti e gruppi.', defaults: d(false, true, true) },
  { key: 'simulations.manageAllAssignments', area: 'Simulazioni', label: 'Gestire le assegnazioni di tutti', description: 'Chiudere, riaprire, modificare ed eliminare anche le assegnazioni create da altri, non solo le proprie.', defaults: d(false, false, false) },
  { key: 'simulations.manageAttempts', area: 'Simulazioni', label: 'Gestire i tentativi degli studenti', description: 'Inserire manualmente uno studente in una simulazione in corso (anche in virtual room) e resettare il tentativo di uno studente mantenendo le risposte salvate.', defaults: d(false, false, false) },
  { key: 'simulations.correctOpenAnswers', area: 'Simulazioni', label: 'Correggere le risposte aperte', description: 'Accesso alla correzione delle risposte aperte delle simulazioni.', defaults: d(false, true, false) },
  { key: 'simulations.viewStats', area: 'Simulazioni', label: 'Vedere le statistiche delle simulazioni', defaults: d(false, true, true) },
  { key: 'simulations.paperResults', area: 'Simulazioni', label: 'Gestire i risultati cartacei', defaults: d(false, true, true) },

  // ── Domande ────────────────────────────────────────────────────────────────
  { key: 'questions.view', area: 'Domande', label: 'Vedere le domande', defaults: d(false, true, true) },
  { key: 'questions.manage', area: 'Domande', label: 'Creare e modificare domande', description: 'Creazione, modifica, archiviazione ed eliminazione delle proprie domande.', defaults: d(false, true, true) },
  { key: 'questions.manageAll', area: 'Domande', label: 'Gestire le domande di tutti', description: 'Modificare, archiviare ed eliminare anche le domande create da altri, non solo le proprie.', defaults: d(false, false, false) },
  { key: 'questions.publish', area: 'Domande', label: 'Pubblicare le domande', description: 'Rendere una domanda pubblicata/ufficiale.', defaults: d(false, false, false) },
  { key: 'questions.import', area: 'Domande', label: 'Importare domande', defaults: d(false, false, false) },
  { key: 'questions.bulkOps', area: 'Domande', label: 'Operazioni massive sulle domande', description: 'Modifiche in blocco: stato, tag, materia, lingua, eliminazione multipla.', defaults: d(false, false, false) },
  { key: 'questions.reviewFeedback', area: 'Domande', label: 'Gestire le segnalazioni sulle domande', description: 'Gestire le segnalazioni delle proprie materie (solo Tutor delle materie assegnate).', defaults: d(false, true, false) },
  { key: 'questions.reviewAllFeedback', area: 'Domande', label: 'Gestire le segnalazioni di tutte le materie', description: 'Vedere e gestire le segnalazioni di qualsiasi materia, non solo quelle assegnate. Richiede "Gestire le segnalazioni sulle domande".', defaults: d(false, false, false) },

  // ── Tag domande ──────────────────────────────────────────────────────────────
  { key: 'tags.manage', area: 'Tag', label: 'Gestire categorie e tag delle domande', description: 'Creazione, modifica ed eliminazione delle proprie categorie e tag.', defaults: d(false, true, true) },
  { key: 'tags.manageAll', area: 'Tag', label: 'Gestire categorie e tag di tutti', description: 'Modificare ed eliminare anche le categorie e i tag creati da altri, non solo i propri.', defaults: d(false, false, false) },

  // ── Studenti ─────────────────────────────────────────────────────────────────
  { key: 'students.view', area: 'Studenti', label: 'Vedere gli studenti', description: 'Di base un collaboratore vede solo gli studenti dei propri gruppi.', defaults: d(false, true, true) },
  { key: 'students.viewAll', area: 'Studenti', label: 'Vedere tutti gli studenti', description: 'Estende la visibilità a tutti gli studenti della piattaforma, non solo a quelli dei propri gruppi. Richiede "Vedere gli studenti".', defaults: d(false, false, false) },
  { key: 'students.viewSensitive', area: 'Studenti', label: 'Vedere i dati sensibili degli studenti', description: 'Dati anagrafici completi e dati del genitore/tutore.', defaults: d(false, true, true) },

  // ── Materiali ────────────────────────────────────────────────────────────────
  { key: 'materials.view', area: 'Materiali', label: 'Vedere i materiali (staff)', defaults: d(false, true, true) },
  { key: 'materials.manage', area: 'Materiali', label: 'Creare e modificare materiali', description: 'Materiali, categorie, materie e argomenti.', defaults: d(false, true, true) },
  { key: 'materials.manageAccess', area: 'Materiali', label: 'Gestire gli accessi ai materiali', description: 'Assegnare o rimuovere l’accesso a studenti e gruppi.', defaults: d(false, true, true) },

  // ── Gruppi ───────────────────────────────────────────────────────────────────
  { key: 'groups.view', area: 'Gruppi', label: 'Vedere i gruppi', defaults: d(false, true, true) },
  { key: 'groups.manageMembers', area: 'Gruppi', label: 'Gestire i membri dei gruppi', description: 'Aggiungere e rimuovere membri dai gruppi di cui si è referente.', defaults: d(false, true, true) },
  { key: 'groups.manageAllMembers', area: 'Gruppi', label: 'Gestire i membri di tutti i gruppi', description: 'Aggiungere e rimuovere membri anche nei gruppi di cui non si è referente. Richiede "Gestire i membri dei gruppi".', defaults: d(false, false, false) },
  { key: 'groups.manage', area: 'Gruppi', label: 'Creare ed eliminare gruppi', defaults: d(false, false, false) },

  // ── Calendario, presenze e assenze ───────────────────────────────────────────
  { key: 'calendar.view', area: 'Calendario', label: 'Vedere il calendario', defaults: d(true, true, true) },
  { key: 'events.manage', area: 'Calendario', label: 'Creare e modificare eventi', description: 'Creare, modificare e annullare i propri eventi.', defaults: d(false, true, true) },
  { key: 'events.manageAll', area: 'Calendario', label: 'Gestire gli eventi di tutti', description: 'Modificare, annullare e gestire gli inviti anche degli eventi creati da altri, non solo i propri.', defaults: d(false, false, false) },
  { key: 'attendance.manage', area: 'Calendario', label: 'Registrare le presenze', description: 'Registrare le presenze dei propri eventi.', defaults: d(false, true, true) },
  { key: 'attendance.manageAll', area: 'Calendario', label: 'Registrare le presenze di tutti gli eventi', description: 'Registrare le presenze anche degli eventi creati da altri, non solo dei propri.', defaults: d(false, false, false) },
  { key: 'absences.requestOwn', area: 'Calendario', label: 'Richiedere le proprie assenze', defaults: d(false, true, true) },

  // ── Statistiche ──────────────────────────────────────────────────────────────
  { key: 'stats.viewPlatform', area: 'Statistiche', label: 'Vedere le statistiche di piattaforma', description: 'Statistiche di studenti e simulazioni. Di base un collaboratore vede solo gli studenti dei propri gruppi.', defaults: d(false, true, true) },
  { key: 'stats.viewAllStudents', area: 'Statistiche', label: 'Vedere le statistiche di tutti gli studenti', description: 'Estende le statistiche a tutti gli studenti della piattaforma, non solo a quelli dei propri gruppi. Richiede "Vedere le statistiche di piattaforma".', defaults: d(false, false, false) },
  { key: 'stats.viewFinancial', area: 'Statistiche', label: 'Vedere le statistiche riservate (economiche e collaboratori)', description: 'Ricavi/andamento economico e attività dei collaboratori. Nascoste ai collaboratori senza questo flag.', defaults: d(false, false, false) },

  // ── Messaggi ─────────────────────────────────────────────────────────────────
  { key: 'messages.use', area: 'Messaggi', label: 'Usare la messaggistica', defaults: d(true, true, true) },

  // ── Area studente ────────────────────────────────────────────────────────────
  { key: 'student.takeSimulations', area: 'Area studente', label: 'Svolgere le simulazioni', defaults: d(true, false, false) },
  { key: 'student.selfPractice', area: 'Area studente', label: 'Creare esercitazioni personali', description: 'Quiz rapidi ed esercitazioni self-practice.', defaults: d(true, false, false) },
  { key: 'student.favorites', area: 'Area studente', label: 'Salvare domande preferite', defaults: d(true, false, false) },
  { key: 'student.viewOwnStats', area: 'Area studente', label: 'Vedere le proprie statistiche', defaults: d(true, false, false) },
  { key: 'student.viewMaterials', area: 'Area studente', label: 'Vedere i materiali assegnati', defaults: d(true, false, false) },
  { key: 'student.viewGroup', area: 'Area studente', label: 'Vedere il proprio gruppo', defaults: d(true, false, false) },
  { key: 'student.submitQuestionFeedback', area: 'Area studente', label: 'Segnalare domande', defaults: d(true, false, false) },
];

/** All valid capability keys, as a union type derived at runtime + a Set for validation. */
export type CapabilityKey = (typeof CAPABILITIES)[number]['key'];

export const CAPABILITY_KEYS: string[] = CAPABILITIES.map((c) => c.key);

const CAPABILITY_BY_KEY = new Map<string, CapabilityDef>(CAPABILITIES.map((c) => [c.key, c]));

export function isValidCapability(key: string): boolean {
  return CAPABILITY_BY_KEY.has(key);
}

/**
 * The default enabled capabilities for a subject, as a Set. Used as the fallback
 * whenever the DB has no explicit override row for a (subject, capability) pair.
 */
export function getDefaultCapabilities(subject: PermissionSubject): Set<string> {
  const set = new Set<string>();
  for (const cap of CAPABILITIES) {
    if (cap.defaults[subject]) set.add(cap.key);
  }
  return set;
}

/** Whether a subject holds a capability by default (ignoring DB overrides). */
export function isDefaultEnabled(subject: PermissionSubject, capability: string): boolean {
  return CAPABILITY_BY_KEY.get(capability)?.defaults[subject] ?? false;
}
