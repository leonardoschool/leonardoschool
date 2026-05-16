/**
 * Script di migrazione domande da Firestore a PostgreSQL
 * 
 * Questo script legge le domande dalla vecchia struttura Firestore:
 *   schools/{schoolId}/questions/{questionId}
 * 
 * E le inserisce nel nuovo database PostgreSQL, mappando i campi:
 * 
 * VECCHIO (Firestore)        →  NUOVO (PostgreSQL)
 * ─────────────────────────────────────────────────
 * id                         →  externalId (campo per riferimento)
 * title                      →  (non usato, testo già in text)
 * text                       →  text
 * images                     →  imageUrl (prima immagine) / imageStoragePath
 * options                    →  QuestionAnswer (relazione)
 * answers                    →  isCorrect in QuestionAnswer
 * database                   →  QuestionTagAssignment (tag) / source + year (se codificati)
 * section                    →  non usato per la categorizzazione delle domande
 * subject                    →  subjectId (materia, livello 2)
 * argument                   →  topicId (argomento, livello 3)
 * status                     →  status (enabled→PUBLISHED, disabled→ARCHIVED)
 * author                     →  source / legacyTags
 * severity                   →  difficulty (mappato)
 * comment                    →  generalExplanation
 * commentImages              →  explanationPdfUrl (se presente)
 * 
 * Usage: npx tsx scripts/migrate-questions-from-firestore.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DifficultyLevel, QuestionStatus, QuestionType } from '@prisma/client';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import prisma from '../lib/prisma/client';

// ===================== CONFIG =====================

// Limite domande (unico parametro opzionale)
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');

// Flag per dry run (non scrive nel database, solo mostra cosa farebbe)
const DRY_RUN = process.argv.includes('--dry-run');

// Flag per verbose output
const VERBOSE = process.argv.includes('--verbose');

// Flag per inspect
const INSPECT_ONLY = process.argv.includes('--inspect');

// Flag per preview (mostra mappatura senza connessione al database)
const PREVIEW_ONLY = process.argv.includes('--preview');

// Flag per ritentare solo le domande fallite (legge migration-errors.json)
const RETRY_ERRORS = process.argv.includes('--retry-errors');

// School ID (verrà trovato automaticamente)
let FIRESTORE_SCHOOL_ID = '';

// ===================== FIREBASE INIT =====================

let serviceAccount: Record<string, unknown>;

// Cerca automaticamente il file delle credenziali
const possiblePaths = [
  join(process.cwd(), 'leonardo-school-service-account.json'), // Root del progetto (priorità 1)
  join(process.cwd(), 'webapp_old', 'cloudapp', 'functions', 'leonardo-school-service-account.json'),
];

let credentialsPath: string | null = null;
for (const path of possiblePaths) {
  if (existsSync(path)) {
    credentialsPath = path;
    break;
  }
}

if (credentialsPath) {
  console.log(`📄 Loading Firebase credentials: ${credentialsPath.split('\\').pop()}`);
  serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'));
} else if (process.env.FIREBASE_LEGACY_SERVICE_ACCOUNT_KEY) {
  // Credenziali dedicate alla migrazione (vecchio progetto Firestore)
  console.log('🔑 Loading legacy Firebase credentials from FIREBASE_LEGACY_SERVICE_ACCOUNT_KEY...');
  serviceAccount = JSON.parse(process.env.FIREBASE_LEGACY_SERVICE_ACCOUNT_KEY);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.log('🔑 Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT_KEY...');
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  console.error('❌ Nessuna credenziale Firebase trovata!');
  console.error('');
  console.error('   Le domande sono nel vecchio progetto Firestore "leonardo-school".');
  console.error('   Aggiungi nel .env le credenziali del vecchio progetto:');
  console.error('');
  console.error("   FIREBASE_LEGACY_SERVICE_ACCOUNT_KEY='{\"type\":\"service_account\",\"project_id\":\"leonardo-school\",...}'");
  console.error('');
  console.error('   Oppure scarica il JSON da Firebase Console e salvalo come:');
  console.error('   leonardo-school-service-account.json (nella root del progetto)');
  console.error('');
  console.error('   1. https://console.firebase.google.com/ → progetto "LeonardoSchool"');
  console.error('   2. Impostazioni progetto → Account di servizio → Genera nuova chiave privata');
  process.exit(1);
}

if (!serviceAccount.project_id) {
  console.error('❌ Invalid credentials file!');
  process.exit(1);
}

console.log(`📍 Firebase project: ${serviceAccount.project_id}`);

const adminApp = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) })
  : getApps()[0];

const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID;
if (FIRESTORE_DATABASE_ID) {
  console.log(`🗄️  Firestore database: ${FIRESTORE_DATABASE_ID}`);
}
const firestore = FIRESTORE_DATABASE_ID
  ? getFirestore(adminApp, FIRESTORE_DATABASE_ID)
  : getFirestore(adminApp);

// ===================== TYPES =====================

interface FirestoreOption {
  id?: string;
  text?: string;
  image?: string;
}

interface FirestoreQuestion {
  id: string;
  title?: string;
  text?: string;
  images?: string[];
  options?: FirestoreOption[];
  answers?: string[]; // IDs delle risposte corrette
  database?: string;
  section?: string;
  subject?: string;
  argument?: string;
  status?: string;
  author?: string;
  severity?: string;
  comment?: string;
  commentImages?: string[];
}

interface MigrationStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  subjects: Map<string, number>;
  topics: Map<string, number>;
  databases: Map<string, number>;
  difficulties: Map<string, number>;
}

// Interfaccia per la configurazione di simulazione
interface SectionConfig {
  id: string;
  title: string;
  color?: string;
  index?: number | null;
  children?: Record<string, SectionConfig>;
}

interface SimulationConfigData {
  databases?: Record<string, string>;
  severities?: Record<string, string>;
  sections?: Record<string, SectionConfig>;
}

// ===================== INTELLIGENT MAPPING FUNCTIONS =====================

/**
 * Verifica se un valore è "vuoto" (null, undefined, "*", stringa vuota)
 */
function isEmpty(value?: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  return trimmed === '' 
    || trimmed === '*' 
    || ['n/a', 'na', 'null', 'undefined', 'v...', 'v…'].includes(normalized)
    || normalized.startsWith('vuot')
    || /^v\d+\.\d+/.test(normalized); // version tags (es. "v1.1.5 chi7") → ignorati
}

/**
 * Risolve un nome in chiaro, restituendo null se vuoto o "*"
 */
function resolveToReadable(value?: string | null): string | null {
  if (isEmpty(value)) return null;
  return value!.trim();
}

/**
 * Cerca ricorsivamente nella struttura sections per trovare il titolo di un ID
 * La struttura è: section → subject → argument (3 livelli)
 * 
 * @param sections - L'oggetto sections dalla configurazione
 * @param id - L'ID da cercare
 * @returns { title, level, parentId } o null se non trovato
 */
function findInSections(
  sections: Record<string, SectionConfig> | undefined,
  id: string
): { title: string; level: 'section' | 'subject' | 'argument'; parentId: string | null; parentTitle: string | null } | null {
  if (!sections || isEmpty(id)) return null;
  
  // Livello 1: Sections (es. "biology", "chemistry", "math")
  if (sections[id]) {
    return { 
      title: sections[id].title, 
      level: 'section',
      parentId: null,
      parentTitle: null
    };
  }
  
  // Livello 2 e 3: Cerca ricorsivamente
  for (const [sectionId, section] of Object.entries(sections)) {
    if (!section.children) continue;
    
    // Livello 2: Subjects (es. "biolg", "cto4R")
    if (section.children[id]) {
      return { 
        title: section.children[id].title, 
        level: 'subject',
        parentId: sectionId,
        parentTitle: section.title
      };
    }
    
    // Livello 3: Arguments (es. "3cznQ", "iWHzy")
    for (const [subjectId, subject] of Object.entries(section.children)) {
      if (subject.children && subject.children[id]) {
        return { 
          title: subject.children[id].title, 
          level: 'argument',
          parentId: subjectId,
          parentTitle: subject.title
        };
      }
    }
  }
  
  return null;
}

/**
 * Risolve la gerarchia completa di una domanda.
 * Firestore: section → subject → argument
 * PostgreSQL: subject → topic.
 *
 * La vecchia section resta disponibile per le simulazioni, ma non viene usata
 * nell'organizzazione delle domande.
 */
function resolveQuestionHierarchy(
  config: SimulationConfigData | null,
  rawSection?: string,
  rawSubject?: string,
  rawArgument?: string
): {
  subjectName: string | null;
  topicName: string | null;
  rawValues: { section: string | null; subject: string | null; argument: string | null };
} {
  const result = {
    subjectName: null as string | null,
    topicName: null as string | null,
    rawValues: {
      section: resolveToReadable(rawSection),
      subject: resolveToReadable(rawSubject),
      argument: resolveToReadable(rawArgument)
    }
  };
  
  if (!config?.sections) {
    // Fallback: usa i valori grezzi di livello 2 e 3 se non c'è configurazione
    result.subjectName = result.rawValues.subject;
    result.topicName = result.rawValues.argument;
    return result;
  }
  
  // 1. Risolvi Subject (livello 2) → Subject/Materia
  if (!isEmpty(rawSubject)) {
    const subjectInfo = findInSections(config.sections, rawSubject!);
    if (subjectInfo) {
      result.subjectName = subjectInfo.title;
    } else {
      // ID non trovato, usa come fallback se non è una sigla e non è "*"
      const cleaned = rawSubject!.trim();
      if (cleaned.length > 5 && cleaned !== '*') {
        result.subjectName = cleaned;
      }
    }
  }

  // Alcune domande legacy hanno subject/argument vuoti ("*") ma section valorizzata.
  // In quel caso usiamo section come fallback per evitare materie mancanti.
  if (!result.subjectName && !isEmpty(rawSection)) {
    const sectionInfo = findInSections(config.sections, rawSection!);
    if (sectionInfo) {
      result.subjectName = sectionInfo.title;
    }
  }
  
  // 2. Risolvi Argument (livello 3) → Topic/Argomento
  if (!isEmpty(rawArgument)) {
    const argumentInfo = findInSections(config.sections, rawArgument!);
    if (argumentInfo) {
      result.topicName = argumentInfo.title;
    } else {
      // ID non trovato, usa come fallback se non è una sigla e non è "*"
      const cleaned = rawArgument!.trim();
      if (cleaned.length > 5 && cleaned !== '*') {
        result.topicName = cleaned;
      }
    }
  }

  return result;
}

interface ParsedQuestionMetadata {
  source: string | null;
  year: number | null;
}

function emptyQuestionMetadata(): ParsedQuestionMetadata {
  return { source: null, year: null };
}

function isMiurDatabaseCode(value?: string | null): boolean {
  const readable = resolveToReadable(value);
  return readable?.toLowerCase().startsWith('miur_') ?? false;
}

/**
 * Risolve il nome fonte CINECA dal codice miur, distinguendo mese se presente.
 * Es: miur_5_2024 → "CINECA MAGGIO", miur_7_2024 → "CINECA LUGLIO", miur_2024 → "CINECA"
 */
const MONTH_NAMES_IT: Record<number, string> = {
  1: 'GENNAIO', 2: 'FEBBRAIO', 3: 'MARZO', 4: 'APRILE',
  5: 'MAGGIO', 6: 'GIUGNO', 7: 'LUGLIO', 8: 'AGOSTO',
  9: 'SETTEMBRE', 10: 'OTTOBRE', 11: 'NOVEMBRE', 12: 'DICEMBRE',
};

function resolveCinecaSource(value?: string | null): string {
  const readable = resolveToReadable(value);
  if (!readable) return 'CINECA';

  // CINECA MAGGIO/LUGLIO solo per miur_05_2024 e miur_07_2024 (con eventuale suffisso _s).
  // Tutto il resto (anni precedenti, altri mesi) → "CINECA" generico.
  const match = readable.toLowerCase().match(/^miur_0?(\d{1,2})_(\d{4})(?:_s)?$/);
    if (match) {
    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);
    const monthName = MONTH_NAMES_IT[month];
    if (monthName && year >= 2024) return `CINECA ${monthName}`;
  }

  return 'CINECA';
}

function parseYearFromText(value?: string | null): number | null {
  const readable = resolveToReadable(value);
  if (!readable) return null;

  const match = readable.match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
  if (!match) return null;

  const year = Number(match[1]);
  return year >= 1900 && year <= 2100 ? year : null;
}

function parseAuthorMetadata(rawAuthor?: string): ParsedQuestionMetadata {
  const readable = resolveToReadable(rawAuthor);
  if (!readable) return emptyQuestionMetadata();

  // Se author è un codice miur (es. "miur_05_2024"), deleghiamo al parser database
  if (isMiurDatabaseCode(readable)) {
    return { source: null, year: parseYearFromText(readable) };
  }

  const [sourcePart, ...yearParts] = readable.split(',');
  if (yearParts.length > 0) {
    return {
      source: resolveToReadable(sourcePart),
      year: parseYearFromText(yearParts.join(',')),
    };
  }

  const year = parseYearFromText(readable);
  return {
    source: readable === String(year) ? null : readable,
    year,
  };
}

function parseDatabaseMetadata(rawDatabase: string | undefined, databaseName: string | null): ParsedQuestionMetadata {
  const readable = resolveToReadable(rawDatabase);
  if (!readable) return emptyQuestionMetadata();

  const year = parseYearFromText(readable);
  if (isMiurDatabaseCode(readable)) {
    return { source: resolveCinecaSource(readable), year };
  }

  return {
    source: databaseName,
    year,
  };
}

function resolveQuestionMetadata(
  rawAuthor: string | undefined,
  rawDatabase: string | undefined,
  databaseName: string | null
): ParsedQuestionMetadata {
  const authorMetadata = parseAuthorMetadata(rawAuthor);
  const databaseMetadata = parseDatabaseMetadata(rawDatabase, databaseName);

  return {
    source: authorMetadata.source ?? databaseMetadata.source,
    year: authorMetadata.year ?? databaseMetadata.year,
  };
}

/**
 * Risolve il nome del database dalla configurazione
 */
function resolveDatabaseName(config: SimulationConfigData | null, rawDatabase?: string): string | null {
  if (isEmpty(rawDatabase)) return null;

  if (isMiurDatabaseCode(rawDatabase)) {
    return resolveCinecaSource(rawDatabase);
  }
  
  // Prova a cercare nella configurazione
  if (config?.databases && config.databases[rawDatabase!]) {
    return config.databases[rawDatabase!];
  }
  
  // Se non trovato e non è una sigla corta, usa il valore grezzo
  if (rawDatabase!.length > 5) {
    return rawDatabase!;
  }
  
  // Sigla non risolta - meglio null che una sigla incomprensibile
  console.warn(`   ⚠️ Database ID non risolto: "${rawDatabase}"`);
  return null;
}

/**
 * Risolve il nome della severity dalla configurazione e mappa a DifficultyLevel
 */
function resolveSeverity(config: SimulationConfigData | null, rawSeverity?: string): { name: string | null; level: DifficultyLevel } {
  if (isEmpty(rawSeverity)) {
    return { name: null, level: DifficultyLevel.MEDIUM };
  }
  
  // Prova a cercare nella configurazione
  let severityName: string | null = null;
  if (config?.severities && config.severities[rawSeverity!]) {
    severityName = config.severities[rawSeverity!];
  } else {
    severityName = rawSeverity!;
  }
  
  // Mappa il nome italiano al DifficultyLevel
  const nameLower = severityName.toLowerCase();
  let level: DifficultyLevel;
  
  if (nameLower.includes('facile') || nameLower.includes('easy') || rawSeverity === '0') {
    level = DifficultyLevel.EASY;
  } else if (nameLower.includes('difficile') || nameLower.includes('hard') || rawSeverity === '2') {
    level = DifficultyLevel.HARD;
  } else {
    level = DifficultyLevel.MEDIUM;
  }
  
  return { name: severityName, level };
}

/**
 * Mappa lo status del vecchio sistema al nuovo QuestionStatus
 */
function mapStatus(status?: string): QuestionStatus {
  if (!status) return QuestionStatus.PUBLISHED;
  
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'enabled' || statusLower === 'active' || statusLower === 'published') {
    return QuestionStatus.PUBLISHED;
  }
  if (statusLower === 'disabled' || statusLower === 'inactive' || statusLower === 'archived') {
    return QuestionStatus.ARCHIVED;
  }
  if (statusLower === 'draft' || statusLower === 'bozza') {
    return QuestionStatus.DRAFT;
  }
  
  return QuestionStatus.PUBLISHED;
}

/**
 * Pulisce il testo LaTeX rimuovendo formattazione problematica
 */
function cleanText(text?: string): string {
  if (!text) return '';

  // Rimuovi null bytes (0x00) che PostgreSQL rifiuta, poi whitespace extra
  return text.replace(/\0/g, '').trim();
}

/**
 * Determina il tipo di domanda basandosi sul numero di risposte corrette
 */
function determineQuestionType(answers?: string[], options?: FirestoreOption[]): QuestionType {
  if (!answers || answers.length === 0) {
    // Se non ci sono risposte, potrebbe essere open text
    if (!options || options.length === 0) {
      return QuestionType.OPEN_TEXT;
    }
    // Fallback a single choice
    return QuestionType.SINGLE_CHOICE;
  }
  
  // Se più di una risposta corretta, è multiple choice
  if (answers.length > 1) {
    return QuestionType.MULTIPLE_CHOICE;
  }
  
  return QuestionType.SINGLE_CHOICE;
}

// ===================== DATABASE HELPERS =====================

/**
 * Ottiene o crea una materia (CustomSubject) basata sul nome leggibile
 */
async function getOrCreateSubject(subjectName: string | null, subjectsCache: Map<string, string>): Promise<string | null> {
  if (!subjectName) return null;
  
  // Normalizza il nome
  const normalizedName = subjectName.trim();
  
  // Check cache
  if (subjectsCache.has(normalizedName)) {
    return subjectsCache.get(normalizedName)!;
  }
  
  // Cerca nel database per nome esatto o simile
  let subject = await prisma.customSubject.findFirst({
    where: {
      OR: [
        { name: { equals: normalizedName, mode: 'insensitive' } },
        { name: { contains: normalizedName, mode: 'insensitive' } }
      ]
    }
  });
  
  if (!subject && !DRY_RUN) {
    // Genera un codice dal nome
    const code = normalizedName
      .split(' ')
      .map(w => w[0]?.toUpperCase() || '')
      .join('')
      .substring(0, 4) || normalizedName.substring(0, 3).toUpperCase();
    
    subject = await prisma.customSubject.create({
      data: {
        name: normalizedName,
        code: code,
        description: `Materia importata da Firestore: ${normalizedName}`,
        isActive: true,
        order: 99
      }
    });
    console.log(`   📚 Created new subject: ${subject.name} (${subject.code})`);
  }
  
  if (subject) {
    subjectsCache.set(normalizedName, subject.id);
    return subject.id;
  }
  
  return null;
}

/**
 * Ottiene o crea un topic basato sul nome leggibile e subjectId
 */
async function getOrCreateTopic(
  topicName: string | null, 
  subjectId: string | null, 
  topicsCache: Map<string, string>
): Promise<string | null> {
  if (!topicName || !subjectId) return null;
  
  const normalizedName = topicName.trim();
  const cacheKey = `${subjectId}:${normalizedName}`;
  
  if (topicsCache.has(cacheKey)) {
    return topicsCache.get(cacheKey)!;
  }
  
  let topic = await prisma.topic.findFirst({
    where: {
      subjectId: subjectId,
      OR: [
        { name: { equals: normalizedName, mode: 'insensitive' } },
        { name: { contains: normalizedName, mode: 'insensitive' } }
      ]
    }
  });
  
  if (!topic && !DRY_RUN) {
    topic = await prisma.topic.create({
      data: {
        name: normalizedName,
        subjectId: subjectId,
        description: `Argomento importato da Firestore`,
        isActive: true,
        order: 99
      }
    });
    console.log(`   📖 Created new topic: ${topic.name}`);
  }
  
  if (topic) {
    topicsCache.set(cacheKey, topic.id);
    return topic.id;
  }
  
  return null;
}

/**
 * Ottiene o crea un tag per il database (già con nome leggibile)
 */
async function getOrCreateDatabaseTag(
  databaseName: string | null, 
  categoryId: string,
  tagsCache: Map<string, string>
): Promise<string | null> {
  if (!databaseName) return null;
  
  const normalizedName = databaseName.trim();
  
  if (tagsCache.has(normalizedName)) {
    return tagsCache.get(normalizedName)!;
  }
  
  let tag = await prisma.questionTag.findFirst({
    where: {
      categoryId: categoryId,
      OR: [
        { name: { equals: normalizedName, mode: 'insensitive' } },
        { name: { contains: normalizedName, mode: 'insensitive' } }
      ]
    }
  });
  
  if (!tag && !DRY_RUN) {
    tag = await prisma.questionTag.create({
      data: {
        name: normalizedName,
        categoryId: categoryId,
        description: `Database importato da Firestore`,
        isActive: true
      }
    });
    console.log(`   🏷️ Created new tag: ${tag.name}`);
  }
  
  if (tag) {
    tagsCache.set(normalizedName, tag.id);
    return tag.id;
  }
  
  return null;
}

/**
 * Ottiene o crea la categoria "Database" per i tag
 */
async function getOrCreateDatabaseCategory(): Promise<string> {
  let category = await prisma.questionTagCategory.findFirst({
    where: { name: 'Database' }
  });
  
  if (!category && !DRY_RUN) {
    category = await prisma.questionTagCategory.create({
      data: {
        name: 'Database',
        description: 'Database di provenienza delle domande (es. TOLC, Alpha Test)',
        color: '#3B82F6',
        isActive: true,
        order: 1
      }
    });
    console.log('   📁 Created "Database" tag category');
  }
  
  return category?.id || 'database-category';
}

// ===================== MIGRATION FUNCTION =====================

// eslint-disable-next-line sonarjs/cognitive-complexity
async function migrateQuestions(): Promise<void> {
  console.log('\n🚀 Starting Firestore to PostgreSQL question migration...\n');
  
  // Trova automaticamente la scuola
  if (!FIRESTORE_SCHOOL_ID) {
    console.log('🔍 Finding schools in Firestore...');
    const schoolsSnapshot = await firestore.collection('schools').get();
    
    if (schoolsSnapshot.empty) {
      console.error('❌ No schools found in Firestore!');
      return;
    }
    
    if (schoolsSnapshot.size > 1) {
      console.log(`\n📂 Found ${schoolsSnapshot.size} schools:`);
      for (const doc of schoolsSnapshot.docs) {
        const questionsCount = await firestore
          .collection('schools')
          .doc(doc.id)
          .collection('questions')
          .count()
          .get();
        console.log(`   - ${doc.id} (${questionsCount.data().count} questions)`);
      }
      console.log('\n💡 Using the first school found...');
    }
    
    FIRESTORE_SCHOOL_ID = schoolsSnapshot.docs[0].id;
    console.log(`✅ Using school: ${FIRESTORE_SCHOOL_ID}\n`);
  }
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No data will be written to the database\n');
  }
  
  // Stats
  const stats: MigrationStats = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    subjects: new Map(),
    topics: new Map(),
    databases: new Map(),
    difficulties: new Map()
  };
  const subjectsCache = new Map<string, string>();
  const topicsCache = new Map<string, string>();
  const tagsCache = new Map<string, string>();
  
  try {
    // 1. Leggi la configurazione dal vecchio Firestore
    console.log('📂 Reading simulation config from Firestore...');
    const configRef = firestore.collection('schools').doc(FIRESTORE_SCHOOL_ID).collection('config').doc('simulations');
    const configDoc = await configRef.get();
    const simulationConfig: SimulationConfigData | null = configDoc.exists ? configDoc.data() as SimulationConfigData : null;
    
    if (simulationConfig) {
      console.log('   ✅ Found simulation config');
      console.log(`      📊 Databases: ${Object.keys(simulationConfig.databases || {}).length} mappings`);
      console.log(`      📊 Severities: ${Object.keys(simulationConfig.severities || {}).length} mappings`);
      console.log(`      📊 Sections: ${Object.keys(simulationConfig.sections || {}).length} top-level`);
      if (VERBOSE) {
        console.log('   Databases:', simulationConfig.databases);
        console.log('   Severities:', simulationConfig.severities);
        console.log('   Sections:', Object.keys(simulationConfig.sections || {}));
      }
    } else {
      console.log('   ⚠️ No simulation config found, will use raw values');
    }
    
    // 2. Ottieni o crea la categoria per i database tag
    console.log('\n📁 Preparing tag categories...');
    const databaseCategoryId = await getOrCreateDatabaseCategory();
    
    // 3. Leggi le domande da Firestore
    console.log('\n📖 Reading questions from Firestore...');
    const questionsRef = firestore.collection('schools').doc(FIRESTORE_SCHOOL_ID).collection('questions');

    let questionsSnapshot: FirebaseFirestore.QuerySnapshot;

    if (RETRY_ERRORS) {
      const errorLogPath = join(process.cwd(), 'migration-errors.json');
      if (!existsSync(errorLogPath)) {
        console.error('❌ migration-errors.json non trovato. Esegui prima la migrazione completa.');
        process.exit(1);
      }
      const errorIds: string[] = (JSON.parse(readFileSync(errorLogPath, 'utf-8')) as { id: string }[]).map(e => e.id);
      console.log(`   Retry mode: ${errorIds.length} domande fallite da ritentare\n`);
      const docs = await Promise.all(errorIds.map(id => questionsRef.doc(id).get()));
      questionsSnapshot = { docs: docs.filter(d => d.exists), size: docs.filter(d => d.exists).length } as unknown as FirebaseFirestore.QuerySnapshot;
    } else {
      let query: FirebaseFirestore.Query = questionsRef;
      if (LIMIT > 0) {
        query = query.limit(LIMIT);
      }
      questionsSnapshot = await query.get();
    }

    stats.total = questionsSnapshot.size;
    console.log(`   Found ${stats.total} questions to migrate\n`);
    
    if (stats.total === 0) {
      console.log('❌ No questions found in Firestore. Check the FIRESTORE_SCHOOL_ID.');
      console.log(`   Current school ID: ${FIRESTORE_SCHOOL_ID}`);
      return;
    }
    
    // 4. Migra ogni domanda
    console.log('🔄 Migrating questions...\n');
    
    const errorLog: { id: string; error: string }[] = [];
    
    for (const doc of questionsSnapshot.docs) {
      const firestoreQuestion = { id: doc.id, ...doc.data() } as FirestoreQuestion;
      
      try {
        if (VERBOSE) {
          console.log(`\n📝 Processing question: ${firestoreQuestion.id}`);
          console.log(`   Text: ${(firestoreQuestion.text || '').substring(0, 50)}...`);
        } else {
          process.stdout.write('.');
        }
        
        // Verifica se la domanda esiste già (per externalId)
        const existingQuestion = await prisma.question.findFirst({
          where: { externalId: firestoreQuestion.id },
          include: { answers: true, questionTags: true }
        });
        
        const isUpdate = !!existingQuestion;
        
        // === RISOLUZIONE INTELLIGENTE DEI CAMPI ===
        
        // 1. Risolvi la gerarchia section → subject → argument
        const hierarchy = resolveQuestionHierarchy(
          simulationConfig,
          firestoreQuestion.section,
          firestoreQuestion.subject,
          firestoreQuestion.argument
        );
        
        if (VERBOSE) {
          console.log(`   📚 Hierarchy resolved:`);
          console.log(`      Section "${firestoreQuestion.section}" → Fallback Subject when subject is empty`);
          console.log(`      Subject "${firestoreQuestion.subject}" → Subject: "${hierarchy.subjectName || '(vuoto)'}"`);
          console.log(`      Argument "${firestoreQuestion.argument}" → Topic: "${hierarchy.topicName || '(vuoto)'}"`);
        }
        
        // 2. Crea/trova Subject e Topic nel database PostgreSQL
        const subjectId = await getOrCreateSubject(hierarchy.subjectName, subjectsCache);
        const topicId = await getOrCreateTopic(hierarchy.topicName, subjectId, topicsCache);
        
        // 3. Aggiorna stats con i nomi leggibili
        if (hierarchy.subjectName) {
          stats.subjects.set(hierarchy.subjectName, (stats.subjects.get(hierarchy.subjectName) || 0) + 1);
        }
        if (hierarchy.topicName) {
          stats.topics.set(hierarchy.topicName, (stats.topics.get(hierarchy.topicName) || 0) + 1);
        }
        // 4. Risolvi la difficoltà
        const severityInfo = resolveSeverity(simulationConfig, firestoreQuestion.severity);
        const difficulty = severityInfo.level;
        if (severityInfo.name) {
          stats.difficulties.set(severityInfo.name, (stats.difficulties.get(severityInfo.name) || 0) + 1);
        }
        
        if (VERBOSE && severityInfo.name) {
          console.log(`   📈 Severity "${firestoreQuestion.severity}" → "${severityInfo.name}" (${difficulty})`);
        }
        
        // 5. Risolvi il database
        const databaseName = resolveDatabaseName(simulationConfig, firestoreQuestion.database);
        if (databaseName) {
          stats.databases.set(databaseName, (stats.databases.get(databaseName) || 0) + 1);
        }
        
        if (VERBOSE && firestoreQuestion.database) {
          console.log(`   🗄️ Database "${firestoreQuestion.database}" → "${databaseName || '(non risolto)'}"`);
        }
        
        // 6. Risolvi fonte/anno da author e database (gestisce valori vuoti)
        const metadata = resolveQuestionMetadata(firestoreQuestion.author, firestoreQuestion.database, databaseName);
        
        if (VERBOSE && (firestoreQuestion.author || firestoreQuestion.database)) {
          console.log(`   👤 Author/Database → Source: "${metadata.source || '(vuoto)'}", Year: "${metadata.year || '(vuoto)'}"`);
        }
        
        // 7. Status e tipo domanda
        const status = mapStatus(firestoreQuestion.status);
        const questionType = determineQuestionType(firestoreQuestion.answers, firestoreQuestion.options);
        
        if (DRY_RUN) {
          if (isUpdate) {
            stats.updated++;
            if (VERBOSE) console.log(`   🔄 Would UPDATE existing question`);
          } else {
            stats.created++;
            if (VERBOSE) console.log(`   ➕ Would CREATE new question`);
          }
          continue;
        }
        
        // Dati comuni per create/update
        const questionData = {
          // Content
          text: cleanText(firestoreQuestion.text) || 'Domanda senza testo',
          type: questionType,
          status: status,
          
          // Categorization - section ignored
          subjectId: subjectId,
          topicId: topicId,
          difficulty: difficulty,
          
          // Images (prendi la prima se presente)
          imageUrl: cleanText(firestoreQuestion.images?.[0]) || null,

          // Explanations
          generalExplanation: cleanText(firestoreQuestion.comment) || null,

          // Metadata - valori leggibili e anno numerico
          source: cleanText(metadata.source ?? undefined) || null,
          year: metadata.year,
          externalId: firestoreQuestion.id,
          // Legacy tags con nomi leggibili invece di sigle
          legacyTags: Array.from(new Set([
            databaseName,
            metadata.source
          ].filter(Boolean) as string[])),
          
          // Scoring defaults
          points: 1.0,
          negativePoints: 0.0,
          blankPoints: 0.0,
          
          // Display
          shuffleAnswers: false,
          showExplanation: true,
        };
        
        let questionId: string;
        
        if (isUpdate && existingQuestion) {
          // === UPDATE: Aggiorna domanda esistente ===
          
          // 1. Elimina le vecchie risposte
          await prisma.questionAnswer.deleteMany({
            where: { questionId: existingQuestion.id }
          });
          
          // 2. Elimina i vecchi tag assignments
          await prisma.questionTagAssignment.deleteMany({
            where: { questionId: existingQuestion.id }
          });
          
          // 3. Aggiorna la domanda
          const updatedQuestion = await prisma.question.update({
            where: { id: existingQuestion.id },
            data: {
              ...questionData,
              updatedAt: new Date(),
              // Ricrea le risposte
              answers: {
                create: (firestoreQuestion.options || []).map((opt, index) => ({
                  text: cleanText(opt.text) || `Opzione ${index + 1}`,
                  imageUrl: cleanText(opt.image) || null,
                  isCorrect: (firestoreQuestion.answers || []).includes(opt.id || ''),
                  order: index,
                  label: String.fromCharCode(65 + index) // A, B, C, D...
                }))
              }
            }
          });
          
          questionId = updatedQuestion.id;
          stats.updated++;
          
          if (VERBOSE) {
            console.log(`   🔄 Updated: ${questionId}`);
          }
        } else {
          // === CREATE: Crea nuova domanda ===
          const newQuestion = await prisma.question.create({
            data: {
              ...questionData,
              // Timestamp
              publishedAt: status === QuestionStatus.PUBLISHED ? new Date() : null,
              // Create answers
              answers: {
                create: (firestoreQuestion.options || []).map((opt, index) => ({
                  text: cleanText(opt.text) || `Opzione ${index + 1}`,
                  imageUrl: cleanText(opt.image) || null,
                  isCorrect: (firestoreQuestion.answers || []).includes(opt.id || ''),
                  order: index,
                  label: String.fromCharCode(65 + index) // A, B, C, D...
                }))
              }
            }
          });
          
          questionId = newQuestion.id;
          stats.created++;
          
          if (VERBOSE) {
            console.log(`   ✅ Created: ${questionId}`);
          }
        }
        
        // Crea tag per il database se presente (nome leggibile)
        if (databaseName) {
          const tagId = await getOrCreateDatabaseTag(databaseName, databaseCategoryId, tagsCache);
          if (tagId) {
            await prisma.questionTagAssignment.create({
              data: {
                questionId: questionId,
                tagId: tagId
              }
            });
          }
        }
        
      } catch (error) {
        stats.errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errorLog.push({ id: firestoreQuestion.id, error: errorMessage });
        
        if (VERBOSE) {
          console.error(`   ❌ Error: ${errorMessage}`);
        } else {
          process.stdout.write('x');
        }
      }
    }
    
    // 5. Report finale
    console.log('\n\n' + '═'.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   Total questions processed: ${stats.total}`);
    console.log(`   ➕ Created (new):          ${stats.created}`);
    console.log(`   🔄 Updated (existing):     ${stats.updated}`);
    console.log(`   ❌ Errors:                 ${stats.errors}`);
    console.log('');
    
    console.log('📚 Subjects (Materie) distribution:');
    Array.from(stats.subjects.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([subject, count]) => {
        console.log(`   - ${subject}: ${count} questions`);
      });
    
    console.log('\n📖 Topics (Argomenti) distribution (top 10):');
    Array.from(stats.topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([topic, count]) => {
        console.log(`   - ${topic}: ${count} questions`);
      });
    if (stats.topics.size > 10) {
      console.log(`   ... and ${stats.topics.size - 10} more topics`);
    }
    
    console.log('\n🏷️ Databases distribution:');
    Array.from(stats.databases.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([db, count]) => {
        console.log(`   - ${db}: ${count} questions`);
      });
    
    console.log('\n📈 Difficulty distribution:');
    Array.from(stats.difficulties.entries()).forEach(([diff, count]) => {
      console.log(`   - ${diff}: ${count} questions`);
    });
    
    if (errorLog.length > 0) {
      console.log('\n❌ Errors:');
      for (const { id, error } of errorLog.slice(0, 10)) {
        console.log(`   - ${id}: ${error}`);
      }
      if (errorLog.length > 10) {
        console.log(`   ... and ${errorLog.length - 10} more errors`);
      }
      
      // Salva log errori su file
      const errorLogPath = join(process.cwd(), 'migration-errors.json');
      writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
      console.log(`\n   Full error log saved to: ${errorLogPath}`);
    }
    
    console.log('\n' + '═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// ===================== PREVIEW FUNCTION =====================

/**
 * Mostra un'anteprima di come verrebbero mappati i dati
 * senza richiedere connessione al database PostgreSQL
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
async function previewMapping(): Promise<void> {
  console.log('\n🔮 PREVIEW MODE - Showing how data would be mapped\n');
  console.log('   (No database connection required)\n');
  
  // Trova automaticamente la scuola
  if (!FIRESTORE_SCHOOL_ID) {
    console.log('🔍 Finding schools in Firestore...');
    const schoolsSnapshot = await firestore.collection('schools').get();
    
    if (schoolsSnapshot.empty) {
      console.error('❌ No schools found in Firestore!');
      return;
    }
    
    FIRESTORE_SCHOOL_ID = schoolsSnapshot.docs[0].id;
    console.log(`✅ Using school: ${FIRESTORE_SCHOOL_ID}\n`);
  }
  
  // 1. Leggi la configurazione dal vecchio Firestore
  console.log('📂 Reading simulation config from Firestore...');
  const configRef = firestore.collection('schools').doc(FIRESTORE_SCHOOL_ID).collection('config').doc('simulations');
  const configDoc = await configRef.get();
  const simulationConfig: SimulationConfigData | null = configDoc.exists ? configDoc.data() as SimulationConfigData : null;
  
  if (!simulationConfig) {
    console.error('❌ No simulation config found! Cannot preview mapping.');
    return;
  }
  
  console.log('   ✅ Found simulation config\n');
  
  // 2. Leggi alcune domande esempio
  console.log('📖 Reading sample questions...');
  const questionsRef = firestore.collection('schools').doc(FIRESTORE_SCHOOL_ID).collection('questions');
  const limit = LIMIT > 0 ? LIMIT : 10;
  const questionsSnapshot = await questionsRef.limit(limit).get();
  
  console.log(`   Found ${questionsSnapshot.size} questions to preview\n`);
  
  // Stats per il riepilogo
  const stats = {
    subjects: new Map<string, number>(),
    topics: new Map<string, number>(),
    databases: new Map<string, number>(),
    difficulties: new Map<string, number>(),
    unresolvedSections: new Set<string>(),
    unresolvedSubjects: new Set<string>(),
    unresolvedArguments: new Set<string>(),
    unresolvedDatabases: new Set<string>(),
  };
  
  console.log('═'.repeat(80));
  console.log('🔄 MAPPING PREVIEW');
  console.log('═'.repeat(80));
  
  for (const doc of questionsSnapshot.docs) {
    const q = doc.data() as FirestoreQuestion;
    
    console.log(`\n📝 Question: ${doc.id}`);
    console.log(`   Text: "${(q.text || '').substring(0, 60)}..."`);
    console.log('');
    
    // Hierarchy mapping
    const hierarchy = resolveQuestionHierarchy(
      simulationConfig,
      q.section,
      q.subject,
      q.argument
    );
    
    console.log('   📊 HIERARCHY MAPPING:');
    console.log(`      section: "${q.section || '(vuoto)'}" → Ignored for question categorization`);
    console.log(`      subject: "${q.subject || '(vuoto)'}" → Subject: "${hierarchy.subjectName || '⚠️ NON RISOLTO'}"`);
    console.log(`      argument: "${q.argument || '(vuoto)'}" → Topic: "${hierarchy.topicName || '⚠️ NON RISOLTO'}"`);
    
    // Track stats
    if (hierarchy.subjectName) {
      stats.subjects.set(hierarchy.subjectName, (stats.subjects.get(hierarchy.subjectName) || 0) + 1);
    } else if (q.subject && !isEmpty(q.subject)) {
      stats.unresolvedSubjects.add(q.subject);
    }
    
    if (hierarchy.topicName) {
      stats.topics.set(hierarchy.topicName, (stats.topics.get(hierarchy.topicName) || 0) + 1);
    } else if (q.argument && !isEmpty(q.argument)) {
      stats.unresolvedArguments.add(q.argument);
    }
    
    // Database mapping
    const databaseName = resolveDatabaseName(simulationConfig, q.database);
    console.log(`      database: "${q.database || '(vuoto)'}" → Tag: "${databaseName || '⚠️ NON RISOLTO'}"`);
    
    if (databaseName) {
      stats.databases.set(databaseName, (stats.databases.get(databaseName) || 0) + 1);
    } else if (q.database && !isEmpty(q.database)) {
      stats.unresolvedDatabases.add(q.database);
    }
    
    // Severity mapping
    const severityInfo = resolveSeverity(simulationConfig, q.severity);
    console.log(`      severity: "${q.severity || '(vuoto)'}" → Difficulty: "${severityInfo.name}" (${severityInfo.level})`);
    
    if (severityInfo.name) {
      stats.difficulties.set(severityInfo.name, (stats.difficulties.get(severityInfo.name) || 0) + 1);
    }
    
    // Author/Database source and year mapping
    const metadata = resolveQuestionMetadata(q.author, q.database, databaseName);
    console.log(`      author/database → Source: "${metadata.source || '(vuoto)'}", Year: "${metadata.year || '(vuoto)'}"`);
    
    // Status mapping
    const status = mapStatus(q.status);
    console.log(`      status: "${q.status || '(vuoto)'}" → Status: "${status}"`);
    
    // Answers
    if (q.options && q.options.length > 0) {
      console.log(`      options: ${q.options.length} answers`);
      const correctCount = (q.answers || []).length;
      const type = determineQuestionType(q.answers, q.options);
      console.log(`      correct answers: ${correctCount} → Type: ${type}`);
    }
  }
  
  // Final summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 PREVIEW SUMMARY');
  console.log('═'.repeat(80));
  
  console.log('\n📚 Subjects (Materie) that would be created:');
  Array.from(stats.subjects.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([subject, count]) => {
      console.log(`   ✅ ${subject}: ${count} questions`);
    });
  
  console.log('\n📖 Topics (Argomenti) that would be created:');
  Array.from(stats.topics.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([topic, count]) => {
      console.log(`   ✅ ${topic}: ${count} questions`);
    });
  
  console.log('\n🏷️ Database Tags that would be created:');
  Array.from(stats.databases.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([db, count]) => {
      console.log(`   ✅ ${db}: ${count} questions`);
    });
  
  console.log('\n📈 Difficulty distribution:');
  Array.from(stats.difficulties.entries()).forEach(([diff, count]) => {
    console.log(`   ${diff}: ${count} questions`);
  });
  
  // Warnings for unresolved values
  if (stats.unresolvedSections.size > 0) {
    console.log('\n⚠️ SECTIONS IGNORED FOR QUESTION CATEGORIZATION:');
    stats.unresolvedSections.forEach(s => console.log(`   - "${s}"`));
  }
  
  if (stats.unresolvedSubjects.size > 0) {
    console.log('\n⚠️ UNRESOLVED SUBJECTS (will be left empty):');
    stats.unresolvedSubjects.forEach(s => console.log(`   - "${s}"`));
  }
  
  if (stats.unresolvedArguments.size > 0) {
    console.log('\n⚠️ UNRESOLVED ARGUMENTS (will be left empty):');
    stats.unresolvedArguments.forEach(s => console.log(`   - "${s}"`));
  }
  
  if (stats.unresolvedDatabases.size > 0) {
    console.log('\n⚠️ UNRESOLVED DATABASES (will be left empty):');
    stats.unresolvedDatabases.forEach(s => console.log(`   - "${s}"`));
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('💡 Run without --preview to actually migrate the data.');
  console.log('═'.repeat(80));
}

// ===================== INSPECT FUNCTION =====================

// eslint-disable-next-line sonarjs/cognitive-complexity
async function inspectFirestore(): Promise<void> {
  console.log('\n🔍 Inspecting Firestore structure...\n');
  
  try {
    // 1. Cerca le scuole disponibili
    console.log('📂 Available schools:');
    const schoolsSnapshot = await firestore.collection('schools').get();
    
    if (schoolsSnapshot.empty) {
      console.log('   ⚠️  No schools found in the "schools" collection');
      console.log('\n   Checking root collections...');
      
      // Prova a listare le collection radice
      const rootCollections = await firestore.listCollections();
      console.log('\n   Root collections found:');
      for (const col of rootCollections) {
        console.log(`   - ${col.id}`);
        
        // Se troviamo "questions" direttamente nella root, avvisiamo
        if (col.id === 'questions') {
          console.log('     📝 Found "questions" collection at root level!');
          const count = await col.count().get();
          console.log(`     Questions count: ${count.data().count}`);
        }
      }
      
      console.log('\n💡 Tip: Your Firestore structure might be different.');
      console.log('   Check the Firestore console to find where questions are stored.');
      return;
    }
    
    for (const doc of schoolsSnapshot.docs) {
      console.log(`   - ${doc.id}`);
      
      // Conta domande per questa scuola
      try {
        const questionsSnapshot = await firestore
          .collection('schools')
          .doc(doc.id)
          .collection('questions')
          .count()
          .get();
        
        console.log(`     Questions: ${questionsSnapshot.data().count}`);
      } catch (err) {
        console.log(`     Questions: Error counting - ${err}`);
      }
      
      // Leggi config
      try {
        const configDoc = await firestore
          .collection('schools')
          .doc(doc.id)
          .collection('config')
          .doc('simulations')
          .get();
        
        if (configDoc.exists) {
          const config = configDoc.data();
          console.log(`     Databases: ${Object.keys(config?.databases || {}).join(', ') || 'none'}`);
          console.log(`     Sections: ${Object.keys(config?.sections || {}).join(', ') || 'none'}`);
          console.log(`     Severities: ${Object.keys(config?.severities || {}).join(', ') || 'none'}`);
        } else {
          console.log('     Config: not found');
        }
      } catch (err) {
        console.log(`     Config: Error reading - ${err}`);
      }
      
      // Mostra esempio domanda
      try {
        const exampleQuestion = await firestore
          .collection('schools')
          .doc(doc.id)
          .collection('questions')
          .limit(1)
          .get();
        
        if (!exampleQuestion.empty) {
          console.log('\n     📝 Example question structure:');
          const q = exampleQuestion.docs[0].data();
          for (const [key, value] of Object.entries(q)) {
            const displayValue = typeof value === 'object' 
              ? JSON.stringify(value).substring(0, 50) + '...'
              : String(value).substring(0, 50);
            console.log(`        ${key}: ${displayValue}`);
          }
        }
      } catch (err) {
        console.log(`     Example question: Error - ${err}`);
      }
      
      console.log('');
    }
  } catch (error) {
    const isNotFound = error instanceof Error && error.message.includes('5 NOT_FOUND');
    if (isNotFound) {
      console.error('❌ Firestore database not found (gRPC 5 NOT_FOUND)');
      console.error('');
      console.error('   This usually means the Firestore database has a custom name (not "(default)").');
      console.error('   Fix: add FIRESTORE_DATABASE_ID=<nome-database> to your .env file.');
      console.error('');
      console.error('   How to find the database name:');
      console.error(`   → https://console.firebase.google.com/project/${serviceAccount.project_id}/firestore`);
      console.error('   Look at the database selector in the top-left of the Firestore page.');
    } else {
      console.error('❌ Error inspecting Firestore:', error);
    }
  }
}

// ===================== HELP =====================
function showHelp() {
  console.log(`
Migration Script - Firestore to PostgreSQL

Usage:
  pnpm migrate:questions [options]

Lo script funziona automaticamente:
- Cerca leonardo-school-service-account.json nella root
- Trova automaticamente l'unica scuola presente
- Usa la configurazione Firestore per risolvere tutte le sigle in nomi leggibili
- Migra tutte le domande con la gerarchia corretta

Il mapping intelligente converte:
- section (es. "biology") → ignorata nella categorizzazione delle domande
- subject/livello 2 (es. "biolg") → Subject/Materia (es. "Biologia")
- argument/livello 3 (es. "3cznQ") → Topic/Argomento (es. "Fondamenti di genetica")
- database (es. "k7JL") → Tag (es. "CISIA")
- author/database (es. "M/O, 2020", "V, 2011", "miur_5_2024") → source/year
- severity (es. "0") → Difficulty (es. "Facile" → EASY)
- Valori "*", "N/A", "v..." e simili vengono trattati come vuoti

Options:
  --limit=N     Migra solo N domande (per test)
  --dry-run     Test senza scrivere nel database (richiede connessione DB)
  --preview     Mostra anteprima mappatura SENZA connessione DB
  --verbose     Output dettagliato
  --inspect     Solo ispeziona struttura Firestore
  --help        Mostra questo help

Examples:
  pnpm migrate:questions                    # Migra tutto
  pnpm migrate:questions --limit=100        # Test con 100 domande
  pnpm migrate:questions --dry-run          # Test senza scrivere
  pnpm migrate:questions --preview          # Anteprima mappatura (no DB)
  pnpm migrate:questions --preview --limit=20   # Anteprima con 20 domande
  pnpm migrate:questions:inspect            # Solo ispeziona
`);
}

// ===================== MAIN =====================
async function main() {
  if (process.argv.includes('--help')) {
    showHelp();
    return;
  }
  
  if (INSPECT_ONLY) {
    await inspectFirestore();
    return;
  }
  
  if (PREVIEW_ONLY) {
    await previewMapping();
    return;
  }
  
  await migrateQuestions();
  
  console.log('\n✅ Migration complete!\n');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
