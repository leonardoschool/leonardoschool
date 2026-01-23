/**
 * Seed Script - Solo Utenti
 * - Cancella utenti seed da Firebase Auth (best-effort)
 * - Crea utenti seed (admin, collaboratori, studenti) su Firebase + PostgreSQL
 *
 * Usage: pnpm seed
 * 
 * File Firebase usato:
 * - TEST/LOCAL: leonardo-school-1cd72-firebase-adminsdk-fbsvc-6c031d9728.json
 * - PROD: leonardo-school-service-account.json (o env var)
 */

// IMPORTANTE: caricare dotenv PRIMA di qualsiasi altro import
import { config } from 'dotenv';
import { resolve, join } from 'node:path';
config({ path: resolve(__dirname, '../.env') });

// Ora gli import che usano process.env
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { UserRole, PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Crea Prisma client direttamente qui (dopo che dotenv ha caricato DATABASE_URL)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- Intentional test password for seed data
const TEST_PASSWORD = 'TestPassword123!';

// Determina ambiente da DATABASE_URL (il modo più affidabile)
// Branch main di Neon prod ha 'ep-mute-heart', branch test ha 'ep-sweet-tooth'
const isProduction = process.env.DATABASE_URL?.includes('ep-mute-heart') ?? false;

console.log(`\n🌍 Ambiente rilevato: ${isProduction ? 'PRODUCTION' : 'TEST/LOCAL'}`);
console.log(`   Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost'}\n`);

// Firebase init - file diverso per ambiente
let serviceAccount: Record<string, unknown>;

// Prova file locale appropriato per ambiente
const testServiceAccountPath = join(process.cwd(), 'leonardo-school-1cd72-firebase-adminsdk-fbsvc-6c031d9728.json');
const prodServiceAccountPath = join(process.cwd(), 'leonardo-school-service-account.json');
const serviceAccountPath = isProduction ? prodServiceAccountPath : testServiceAccountPath;

if (existsSync(serviceAccountPath)) {
  console.log(`📄 Loading Firebase credentials from: ${isProduction ? 'PROD' : 'TEST'} JSON file...`);
  console.log(`   File: ${serviceAccountPath}`);
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.log('🔑 Loading Firebase credentials from environment variable...');
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  serviceAccount = {};
}

if (!serviceAccount.project_id) {
  console.error('❌ Firebase credentials not found!');
  console.error(`   Expected file: ${serviceAccountPath}`);
  console.error('   Or set FIREBASE_SERVICE_ACCOUNT_KEY env var');
  process.exit(1);
}

const adminApp = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) })
  : getApps()[0];
const adminAuth = getAuth(adminApp);

// ===================== DATA =====================
const SEED_USERS = {
  admins: [
    { email: 'admin1@leonardoschool.test', name: 'Mario Rossi' },
    { email: 'admin2@leonardoschool.test', name: 'Laura Bianchi' },
    { email: 'admin3@leonardoschool.test', name: 'Giuseppe Verdi' },
  ],
  collaboratori: [
    { email: 'collab1@leonardoschool.test', name: 'Anna Ferrari', telefono: '3331234567', codiceFiscale: 'FRRNNA80A01H501Z' },
    { email: 'collab2@leonardoschool.test', name: 'Marco Ricci', telefono: '3332345678', codiceFiscale: 'RCCMRC85B02H501Z' },
    { email: 'collab3@leonardoschool.test', name: 'Giulia Marino', telefono: '3333456789', codiceFiscale: 'MRNGLI90C03H501Z' },
    { email: 'collab4@leonardoschool.test', name: 'Francesco Romano', telefono: '3334567890', codiceFiscale: 'RMNFNC88D04H501Z' },
    { email: 'collab5@leonardoschool.test', name: 'Sara Colombo', telefono: '3335678901', codiceFiscale: 'CLMSRA92E05H501Z' },
  ],
  studenti: [
    { email: 'studente1@leonardoschool.test', name: 'Matteo De Luca', telefono: '3341234567', codiceFiscale: 'DLCMTT02A01H501Z', dataNascita: '2002-01-15', luogoNascita: 'Roma', indirizzo: 'Via Roma 123', cap: '00100', citta: 'Roma', provincia: 'RM' },
    { email: 'studente2@leonardoschool.test', name: 'Sofia Esposito', telefono: '3342345678', codiceFiscale: 'SPSSFO03B02H501Z', dataNascita: '2003-02-20', luogoNascita: 'Milano', indirizzo: 'Via Milano 45', cap: '20100', citta: 'Milano', provincia: 'MI' },
    { email: 'studente3@leonardoschool.test', name: 'Lorenzo Fontana', telefono: '3343456789', codiceFiscale: 'FNTLRN02C03H501Z', dataNascita: '2002-03-25', luogoNascita: 'Napoli', indirizzo: 'Via Napoli 67', cap: '80100', citta: 'Napoli', provincia: 'NA' },
    { email: 'studente4@leonardoschool.test', name: 'Giulia Santoro', telefono: '3344567890', codiceFiscale: 'SNTGLI03D04H501Z', dataNascita: '2003-04-10', luogoNascita: 'Torino', indirizzo: 'Via Torino 89', cap: '10100', citta: 'Torino', provincia: 'TO' },
    { email: 'studente5@leonardoschool.test', name: 'Alessandro Moretti', telefono: '3345678901', codiceFiscale: 'MRTLSN02E05H501Z', dataNascita: '2002-05-15', luogoNascita: 'Bologna', indirizzo: 'Via Bologna 12', cap: '40100', citta: 'Bologna', provincia: 'BO' },
  ],
};

// ===================== HELPERS =====================
async function deleteFirebaseSeedUsers() {
  console.log('\n🗑️  Deleting existing Firebase seed users...');
  for (const email of [
    ...SEED_USERS.admins.map((u) => u.email),
    ...SEED_USERS.collaboratori.map((u) => u.email),
    ...SEED_USERS.studenti.map((u) => u.email),
  ]) {
    try {
      const user = await adminAuth.getUserByEmail(email);
      await adminAuth.deleteUser(user.uid);
      console.log(`   🗑️  Deleted Firebase user ${email}`);
    } catch (error) {
      const err = error as { code?: string };
      if (err.code !== 'auth/user-not-found') {
        console.warn(`   ⚠️  Skipping delete for ${email}:`, err.code || err);
      }
    }
  }
}

async function createFirebaseUser(email: string, displayName: string) {
  try {
    const existing = await adminAuth.getUserByEmail(email).catch(() => null);
    if (existing) {
      console.log(`   ⚠️  Firebase user ${email} already exists (UID: ${existing.uid})`);
      return existing.uid;
    }

    const userRecord = await adminAuth.createUser({
      email,
      password: TEST_PASSWORD,
      displayName,
      emailVerified: true,
    });

    console.log(`   ✅ Created Firebase user: ${email} (UID: ${userRecord.uid})`);
    return userRecord.uid;
  } catch (error) {
    console.error(`   ❌ Failed to create Firebase user ${email}:`, error);
    return null;
  }
}

async function cleanSeedUsers() {
  console.log('\n🧹 Cleaning seed users from database...');

  // Delete only seed users (filter by test domain for safety)
  await prisma.student.deleteMany({ where: { user: { email: { endsWith: '@leonardoschool.test' } } } });
  await prisma.collaborator.deleteMany({ where: { user: { email: { endsWith: '@leonardoschool.test' } } } });
  await prisma.admin.deleteMany({ where: { user: { email: { endsWith: '@leonardoschool.test' } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@leonardoschool.test' } } });

  console.log('✅ Seed users cleaned from database');
}

// ===================== MAIN =====================
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 SEED - Creating test users (Firebase + PostgreSQL)');
  console.log('═'.repeat(60));

  // 1) Clean Firebase seed users (best-effort)
  await deleteFirebaseSeedUsers();

  // 2) Clean database seed users
  await cleanSeedUsers();

  // 3) Create admins
  console.log('\n👑 Creating admins...');
  let adminCount = 0;
  for (const admin of SEED_USERS.admins) {
    const firebaseUid = await createFirebaseUser(admin.email, admin.name);
    if (!firebaseUid) continue;

    await prisma.user.create({
      data: {
        firebaseUid,
        email: admin.email,
        name: admin.name,
        role: UserRole.ADMIN,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        admin: { create: {} },
      },
    });
    console.log(`   ✓ ${admin.name} (${admin.email})`);
    adminCount++;
  }

  // 4) Create collaborators
  console.log('\n🤝 Creating collaborators...');
  let collabCount = 0;
  for (const collab of SEED_USERS.collaboratori) {
    const firebaseUid = await createFirebaseUser(collab.email, collab.name);
    if (!firebaseUid) continue;

    await prisma.user.create({
      data: {
        firebaseUid,
        email: collab.email,
        name: collab.name,
        role: UserRole.COLLABORATOR,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        collaborator: {
          create: {
            phone: collab.telefono,
            fiscalCode: collab.codiceFiscale,
          },
        },
      },
    });
    console.log(`   ✓ ${collab.name} (${collab.email})`);
    collabCount++;
  }

  // 5) Create students
  console.log('\n👨‍🎓 Creating students...');
  const currentYear = new Date().getFullYear();
  let studentIndex = 1;
  let studentCount = 0;
  for (const student of SEED_USERS.studenti) {
    const firebaseUid = await createFirebaseUser(student.email, student.name);
    if (!firebaseUid) continue;

    // Generate matricola: LS{year}{4-digit-progressive}
    const matricola = `LS${currentYear}${String(studentIndex).padStart(4, '0')}`;

    await prisma.user.create({
      data: {
        firebaseUid,
        email: student.email,
        name: student.name,
        role: UserRole.STUDENT,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        student: {
          create: {
            phone: student.telefono,
            fiscalCode: student.codiceFiscale,
            dateOfBirth: new Date(student.dataNascita),
            address: student.indirizzo,
            postalCode: student.cap,
            city: student.citta,
            province: student.provincia,
            matricola: matricola,
          },
        },
      },
    });
    console.log(`   ✓ ${student.name} - Matricola: ${matricola}`);
    studentIndex++;
    studentCount++;
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 SEEDING COMPLETE');
  console.log('═'.repeat(60));
  console.log(`👑 Admins:         ${adminCount}`);
  console.log(`🤝 Collaborators:  ${collabCount}`);
  console.log(`👨‍🎓 Students:       ${studentCount}`);
  console.log('═'.repeat(60));
  console.log(`\n🔐 Test password: ${TEST_PASSWORD}`);
  console.log('🔗 Login: http://localhost:3000/auth/login\n');
}

// Execute seed with proper cleanup
try {
  await main();
} catch (e) {
  console.error('❌ Seed failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
