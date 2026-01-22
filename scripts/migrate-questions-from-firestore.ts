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
 * database                   →  QuestionTagAssignment (tag)
 * section                    →  subjectId (mappato)
 * subject                    →  topicId (mappato)
 * argument                   →  subTopicId (mappato)
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
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.log('🔑 Loading Firebase credentials from environment variable...');
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  console.error('❌ File leonardo-school-service-account.json not found!');
  console.error('');
  console.error('   Download from Firebase Console:');
  console.error('   1. Go to https://console.firebase.google.com/');
  console.error('   2. Select "leonardo-school" project');
  console.error('   3. Project Settings → Service Accounts → Generate new private key');
  console.error('   4. Save as leonardo-school-service-account.json in project root');
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

const firestore = getFirestore(adminApp);

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
  migrated: number;
  skipped: number;
  errors: number;
  subjects: Map<string, number>;
  topics: Map<string, number>;
  databases: Map<string, number>;
  difficulties: Map<string, number>;
}

// ===================== MAPPING FUNCTIONS =====================

/**
 * Mappa il campo severity del vecchio sistema al nuovo DifficultyLevel
 */
function mapSeverityToDifficulty(severity?: string): DifficultyLevel {
  if (!severity) return DifficultyLevel.MEDIUM;
  
  const severityLower = severity.toLowerCase();
  
  // Mappatura basata su valori comuni
  if (severityLower.includes('facile') || severityLower.includes('easy') || severity === '1') {
    return DifficultyLevel.EASY;
  }
  if (severityLower.includes('difficile') || severityLower.includes('hard') || severity === '3') {
    return DifficultyLevel.HARD;
  }
  
  // Default: medio
  return DifficultyLevel.MEDIUM;
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
  
  // Rimuovi whitespace extra
  return text.trim();
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
 * Ottiene o crea una materia (CustomSubject) basata sul nome
 */
async function getOrCreateSubject(sectionName: string, subjectsCache: Map<string, string>): Promise<string | null> {
  if (!sectionName) return null;
  
  // Check cache
  if (subjectsCache.has(sectionName)) {
    return subjectsCache.get(sectionName)!;
  }
  
  // Normalizza il nome
  const normalizedName = sectionName.trim();
  
  // Cerca nel database
  let subject = await prisma.customSubject.findFirst({
    where: {
      OR: [
        { name: { contains: normalizedName, mode: 'insensitive' } },
        { code: { contains: normalizedName.substring(0, 3).toUpperCase(), mode: 'insensitive' } }
      ]
    }
  });
  
  if (!subject && !DRY_RUN) {
    // Crea una nuova materia
    const code = normalizedName.substring(0, 3).toUpperCase();
    subject = await prisma.customSubject.create({
      data: {
        name: normalizedName,
        code: code,
        description: `Materia importata da Firestore: ${normalizedName}`,
        isActive: true,
        order: 99 // Metti in fondo
      }
    });
    console.log(`   📚 Created new subject: ${subject.name} (${subject.code})`);
  }
  
  if (subject) {
    subjectsCache.set(sectionName, subject.id);
    return subject.id;
  }
  
  return null;
}

/**
 * Ottiene o crea un topic basato sul nome e subjectId
 */
async function getOrCreateTopic(
  topicName: string, 
  subjectId: string | null, 
  topicsCache: Map<string, string>
): Promise<string | null> {
  if (!topicName || !subjectId) return null;
  
  const cacheKey = `${subjectId}:${topicName}`;
  
  if (topicsCache.has(cacheKey)) {
    return topicsCache.get(cacheKey)!;
  }
  
  const normalizedName = topicName.trim();
  
  let topic = await prisma.topic.findFirst({
    where: {
      subjectId: subjectId,
      name: { contains: normalizedName, mode: 'insensitive' }
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
 * Ottiene o crea un tag per il database
 */
async function getOrCreateDatabaseTag(
  database: string, 
  categoryId: string,
  tagsCache: Map<string, string>
): Promise<string | null> {
  if (!database) return null;
  
  if (tagsCache.has(database)) {
    return tagsCache.get(database)!;
  }
  
  const normalizedName = database.trim();
  
  let tag = await prisma.questionTag.findFirst({
    where: {
      name: { contains: normalizedName, mode: 'insensitive' },
      categoryId: categoryId
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
    tagsCache.set(database, tag.id);
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
    migrated: 0,
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
    const simulationConfig = configDoc.exists ? configDoc.data() : null;
    
    if (simulationConfig) {
      console.log('   ✅ Found simulation config');
      if (VERBOSE) {
        console.log('   Databases:', Object.keys(simulationConfig.databases || {}));
        console.log('   Severities:', Object.keys(simulationConfig.severities || {}));
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
    
    let query: FirebaseFirestore.Query = questionsRef;
    if (LIMIT > 0) {
      query = query.limit(LIMIT);
    }
    
    const questionsSnapshot = await query.get();
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
          where: { externalId: firestoreQuestion.id }
        });
        
        if (existingQuestion) {
          stats.skipped++;
          if (VERBOSE) console.log(`   ⏭️ Skipped (already exists)`);
          continue;
        }
        
        // Mappa i campi
        const subjectId = await getOrCreateSubject(
          simulationConfig?.sections?.[firestoreQuestion.section || '']?.title || firestoreQuestion.section || '',
          subjectsCache
        );
        
        // Aggiorna stats
        if (firestoreQuestion.section) {
          stats.subjects.set(firestoreQuestion.section, (stats.subjects.get(firestoreQuestion.section) || 0) + 1);
        }
        
        const topicId = await getOrCreateTopic(
          simulationConfig?.sections?.[firestoreQuestion.section || '']?.children?.[firestoreQuestion.subject || '']?.title 
            || firestoreQuestion.subject || '',
          subjectId,
          topicsCache
        );
        
        if (firestoreQuestion.subject) {
          stats.topics.set(firestoreQuestion.subject, (stats.topics.get(firestoreQuestion.subject) || 0) + 1);
        }
        
        const difficulty = mapSeverityToDifficulty(
          simulationConfig?.severities?.[firestoreQuestion.severity || ''] || firestoreQuestion.severity
        );
        stats.difficulties.set(difficulty, (stats.difficulties.get(difficulty) || 0) + 1);
        
        const databaseName = simulationConfig?.databases?.[firestoreQuestion.database || ''] || firestoreQuestion.database;
        if (databaseName) {
          stats.databases.set(databaseName, (stats.databases.get(databaseName) || 0) + 1);
        }
        
        const status = mapStatus(firestoreQuestion.status);
        const questionType = determineQuestionType(firestoreQuestion.answers, firestoreQuestion.options);
        
        if (DRY_RUN) {
          stats.migrated++;
          continue;
        }
        
        // Crea la domanda nel database
        const newQuestion = await prisma.question.create({
          data: {
            // Content
            text: cleanText(firestoreQuestion.text) || 'Domanda senza testo',
            type: questionType,
            status: status,
            
            // Categorization
            subjectId: subjectId,
            topicId: topicId,
            // subTopicId non utilizzato - nel vecchio sistema si usavano solo gli argomenti
            difficulty: difficulty,
            
            // Images (prendi la prima se presente)
            imageUrl: firestoreQuestion.images?.[0] || null,
            
            // Explanations
            generalExplanation: cleanText(firestoreQuestion.comment) || null,
            
            // Metadata
            source: firestoreQuestion.author || null,
            externalId: firestoreQuestion.id,
            legacyTags: [
              firestoreQuestion.database,
              firestoreQuestion.author
            ].filter(Boolean) as string[],
            
            // Scoring defaults
            points: 1.0,
            negativePoints: 0.0,
            blankPoints: 0.0,
            
            // Display
            shuffleAnswers: false,
            showExplanation: true,
            
            // Timestamp
            publishedAt: status === QuestionStatus.PUBLISHED ? new Date() : null,
            
            // Create answers
            answers: {
              create: (firestoreQuestion.options || []).map((opt, index) => ({
                text: cleanText(opt.text) || `Opzione ${index + 1}`,
                imageUrl: opt.image || null,
                isCorrect: (firestoreQuestion.answers || []).includes(opt.id || ''),
                order: index,
                label: String.fromCharCode(65 + index) // A, B, C, D...
              }))
            }
          }
        });
        
        // Crea tag per il database se presente
        if (databaseName) {
          const tagId = await getOrCreateDatabaseTag(databaseName, databaseCategoryId, tagsCache);
          if (tagId) {
            await prisma.questionTagAssignment.create({
              data: {
                questionId: newQuestion.id,
                tagId: tagId
              }
            });
          }
        }
        
        stats.migrated++;
        
        if (VERBOSE) {
          console.log(`   ✅ Migrated: ${newQuestion.id}`);
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
    console.log(`   Total questions found:    ${stats.total}`);
    console.log(`   Successfully migrated:    ${stats.migrated}`);
    console.log(`   Skipped (already exist):  ${stats.skipped}`);
    console.log(`   Errors:                   ${stats.errors}`);
    console.log('');
    
    console.log('📚 Subjects distribution:');
    Array.from(stats.subjects.entries()).forEach(([subject, count]) => {
      console.log(`   - ${subject}: ${count} questions`);
    });
    
    console.log('\n🏷️ Databases distribution:');
    Array.from(stats.databases.entries()).forEach(([db, count]) => {
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

// ===================== INSPECT FUNCTION =====================

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
    console.error('❌ Error inspecting Firestore:', error);
    console.error(error);
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
- Migra tutte le domande

Options:
  --limit=N     Migra solo N domande (per test)
  --dry-run     Test senza scrivere nel database
  --verbose     Output dettagliato
  --inspect     Solo ispeziona, non migrare
  --help        Mostra questo help

Examples:
  pnpm migrate:questions                    # Migra tutto
  pnpm migrate:questions --limit=100        # Test con 100 domande
  pnpm migrate:questions --dry-run          # Test senza scrivere
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
