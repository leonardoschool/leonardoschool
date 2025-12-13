/**
 * Complete Seed Script
 * Crea utenti in Firebase Auth E nel database PostgreSQL
 * 
 * Usage: pnpm seed
 */

// MUST be first - Load environment variables from .env BEFORE any other imports
import { config } from 'dotenv';
config({ path: '.env' });

// Now we can import Firebase (which reads env vars on init)
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin - try file first, then env var
let serviceAccount: Record<string, unknown>;

// Try to load from local JSON file
const serviceAccountPath = join(process.cwd(), 'leonardo-school-1cd72-firebase-adminsdk-fbsvc-6c031d9728.json');
if (existsSync(serviceAccountPath)) {
  console.log('📄 Loading Firebase credentials from local JSON file...');
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.log('🔑 Loading Firebase credentials from environment variable...');
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  serviceAccount = {};
}

if (!serviceAccount.project_id) {
  console.error('❌ Firebase credentials not found!');
  console.error('   Option 1: Place the service account JSON file at: leonardo-school-1cd72-firebase-adminsdk-fbsvc-6c031d9728.json');
  console.error('   Option 2: Set FIREBASE_SERVICE_ACCOUNT_KEY in .env');
  process.exit(1);
}

const adminApp = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) })
  : getApps()[0];

const adminAuth = getAuth(adminApp);

const prisma = new PrismaClient();
const TEST_PASSWORD = 'TestPassword123!';

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
    { email: 'collab6@leonardoschool.test', name: 'Alessandro Bruno', telefono: '3336789012', codiceFiscale: 'BRNLSN87F06H501Z' },
    { email: 'collab7@leonardoschool.test', name: 'Elena Gallo', telefono: '3337890123', codiceFiscale: 'GLLLNE91G07H501Z' },
    { email: 'collab8@leonardoschool.test', name: 'Davide Costa', telefono: '3338901234', codiceFiscale: 'CSTDVD89H08H501Z' },
    { email: 'collab9@leonardoschool.test', name: 'Chiara Conti', telefono: '3339012345', codiceFiscale: 'CNTCHR93I09H501Z' },
    { email: 'collab10@leonardoschool.test', name: 'Luca Giordano', telefono: '3340123456', codiceFiscale: 'GRDLCU86L10H501Z' },
  ],
  studenti: [
    { email: 'studente1@leonardoschool.test', name: 'Matteo De Luca', telefono: '3341234567', codiceFiscale: 'DLCMTT02A01H501Z', dataNascita: '2002-01-15', luogoNascita: 'Roma', indirizzo: 'Via Roma 123', cap: '00100', citta: 'Roma', provincia: 'RM' },
    { email: 'studente2@leonardoschool.test', name: 'Sofia Esposito', telefono: '3342345678', codiceFiscale: 'SPSSFO03B02H501Z', dataNascita: '2003-02-20', luogoNascita: 'Milano', indirizzo: 'Via Milano 45', cap: '20100', citta: 'Milano', provincia: 'MI' },
    { email: 'studente3@leonardoschool.test', name: 'Lorenzo Fontana', telefono: '3343456789', codiceFiscale: 'FNTLRN02C03H501Z', dataNascita: '2002-03-25', luogoNascita: 'Napoli', indirizzo: 'Via Napoli 67', cap: '80100', citta: 'Napoli', provincia: 'NA' },
    { email: 'studente4@leonardoschool.test', name: 'Giulia Santoro', telefono: '3344567890', codiceFiscale: 'SNTGLI03D04H501Z', dataNascita: '2003-04-10', luogoNascita: 'Torino', indirizzo: 'Via Torino 89', cap: '10100', citta: 'Torino', provincia: 'TO' },
    { email: 'studente5@leonardoschool.test', name: 'Alessandro Moretti', telefono: '3345678901', codiceFiscale: 'MRTLSN02E05H501Z', dataNascita: '2002-05-15', luogoNascita: 'Bologna', indirizzo: 'Via Bologna 12', cap: '40100', citta: 'Bologna', provincia: 'BO' },
    { email: 'studente6@leonardoschool.test', name: 'Francesca Leone', telefono: '3346789012', codiceFiscale: 'LNEFNC03F06H501Z', dataNascita: '2003-06-20', luogoNascita: 'Firenze', indirizzo: 'Via Firenze 34', cap: '50100', citta: 'Firenze', provincia: 'FI' },
    { email: 'studente7@leonardoschool.test', name: 'Marco Benedetti', telefono: '3347890123', codiceFiscale: 'BNDMRC02G07H501Z', dataNascita: '2002-07-25', luogoNascita: 'Genova', indirizzo: 'Via Genova 56', cap: '16100', citta: 'Genova', provincia: 'GE' },
    { email: 'studente8@leonardoschool.test', name: 'Valentina Serra', telefono: '3348901234', codiceFiscale: 'SRRVNT03H08H501Z', dataNascita: '2003-08-30', luogoNascita: 'Palermo', indirizzo: 'Via Palermo 78', cap: '90100', citta: 'Palermo', provincia: 'PA' },
    { email: 'studente9@leonardoschool.test', name: 'Gabriele Vitale', telefono: '3349012345', codiceFiscale: 'VTLGBR02I09H501Z', dataNascita: '2002-09-05', luogoNascita: 'Catania', indirizzo: 'Via Catania 90', cap: '95100', citta: 'Catania', provincia: 'CT' },
    { email: 'studente10@leonardoschool.test', name: 'Martina Orlando', telefono: '3350123456', codiceFiscale: 'RLNMRT03L10H501Z', dataNascita: '2003-10-10', luogoNascita: 'Venezia', indirizzo: 'Via Venezia 23', cap: '30100', citta: 'Venezia', provincia: 'VE' },
    { email: 'studente11@leonardoschool.test', name: 'Andrea Ferri', telefono: '3351234567', codiceFiscale: 'FRRNDR02M11H501Z', dataNascita: '2002-11-15', luogoNascita: 'Verona', indirizzo: 'Via Verona 45', cap: '37100', citta: 'Verona', provincia: 'VR' },
    { email: 'studente12@leonardoschool.test', name: 'Beatrice Mancini', telefono: '3352345678', codiceFiscale: 'MNCBTR03N12H501Z', dataNascita: '2003-12-20', luogoNascita: 'Padova', indirizzo: 'Via Padova 67', cap: '35100', citta: 'Padova', provincia: 'PD' },
    { email: 'studente13@leonardoschool.test', name: 'Riccardo Greco', telefono: '3353456789', codiceFiscale: 'GRCRCC02A13H501Z', dataNascita: '2002-01-25', luogoNascita: 'Trieste', indirizzo: 'Via Trieste 89', cap: '34100', citta: 'Trieste', provincia: 'TS' },
    { email: 'studente14@leonardoschool.test', name: 'Camilla Russo', telefono: '3354567890', codiceFiscale: 'RSSCML03B14H501Z', dataNascita: '2003-02-28', luogoNascita: 'Bari', indirizzo: 'Via Bari 12', cap: '70100', citta: 'Bari', provincia: 'BA' },
    { email: 'studente15@leonardoschool.test', name: 'Tommaso Marchetti', telefono: '3355678901', codiceFiscale: 'MRCTMS02C15H501Z', dataNascita: '2002-03-10', luogoNascita: 'Brescia', indirizzo: 'Via Brescia 34', cap: '25100', citta: 'Brescia', provincia: 'BS' },
    { email: 'studente16@leonardoschool.test', name: 'Alice Monti', telefono: '3356789012', codiceFiscale: 'MNTLCA03D16H501Z', dataNascita: '2003-04-15', luogoNascita: 'Parma', indirizzo: 'Via Parma 56', cap: '43100', citta: 'Parma', provincia: 'PR' },
    { email: 'studente17@leonardoschool.test', name: 'Edoardo Barbieri', telefono: '3357890123', codiceFiscale: 'BRBRDR02E17H501Z', dataNascita: '2002-05-20', luogoNascita: 'Modena', indirizzo: 'Via Modena 78', cap: '41100', citta: 'Modena', provincia: 'MO' },
    { email: 'studente18@leonardoschool.test', name: 'Emma Silvestri', telefono: '3358901234', codiceFiscale: 'SLVMMA03F18H501Z', dataNascita: '2003-06-25', luogoNascita: 'Reggio Emilia', indirizzo: 'Via Reggio 90', cap: '42100', citta: 'Reggio Emilia', provincia: 'RE' },
    { email: 'studente19@leonardoschool.test', name: 'Nicolò Lombardi', telefono: '3359012345', codiceFiscale: 'LMBNCL02G19H501Z', dataNascita: '2002-07-30', luogoNascita: 'Piacenza', indirizzo: 'Via Piacenza 12', cap: '29100', citta: 'Piacenza', provincia: 'PC' },
    { email: 'studente20@leonardoschool.test', name: 'Greta Pellegrini', telefono: '3360123456', codiceFiscale: 'PLLGRT03H20H501Z', dataNascita: '2003-08-05', luogoNascita: 'Ravenna', indirizzo: 'Via Ravenna 34', cap: '48100', citta: 'Ravenna', provincia: 'RA' },
  ],
};

async function createFirebaseUser(email: string, displayName: string) {
  try {
    // Controlla se l'utente esiste già
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      return existingUser.uid;
    } catch (error: unknown) {
      // Utente non esiste, crealo
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/user-not-found') {
        const userRecord = await adminAuth.createUser({
          email,
          emailVerified: true,
          password: TEST_PASSWORD,
          displayName,
          disabled: false,
        });
        return userRecord.uid;
      }
      throw error;
    }
  } catch (error) {
    console.error(`  ❌ Failed to create Firebase user ${displayName}:`, error);
    return null;
  }
}

async function main() {
  console.log('🌱 Starting complete seed (Firebase + PostgreSQL)...\n');

  // Check environment
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot seed database in production environment!');
    process.exit(1);
  }

  // Pulisci database esistente
  console.log('🗑️  Cleaning existing seed data...');
  await prisma.student.deleteMany({
    where: {
      user: {
        email: {
          endsWith: '@leonardoschool.test',
        },
      },
    },
  });
  await prisma.collaborator.deleteMany({
    where: {
      user: {
        email: {
          endsWith: '@leonardoschool.test',
        },
      },
    },
  });
  await prisma.admin.deleteMany({
    where: {
      user: {
        email: {
          endsWith: '@leonardoschool.test',
        },
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@leonardoschool.test',
      },
    },
  });

  console.log('✅ Cleanup complete\n');

  // Create Admins
  console.log('👑 Creating 3 admin accounts...');
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
        admin: {
          create: {},
        },
      },
    });
    console.log(`  ✓ ${admin.name} (${admin.email})`);
  }

  // Create Collaboratori
  console.log('\n🤝 Creating 10 collaborator accounts...');
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
    console.log(`  ✓ ${collab.name} (${collab.email})`);
  }

  // Create Studenti
  console.log('\n🎓 Creating 20 student accounts...');
  for (const student of SEED_USERS.studenti) {
    const firebaseUid = await createFirebaseUser(student.email, student.name);
    if (!firebaseUid) continue;

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
          },
        },
      },
    });
    console.log(`  ✓ ${student.name} (${student.email})`);
  }

  console.log('\n✅ Complete seed successful!');
  console.log('\n📋 Summary:');
  console.log(`   • 3 Admins`);
  console.log(`   • 10 Collaborators`);
  console.log(`   • 20 Students`);
  console.log('\n🔐 Test credentials:');
  console.log(`   Email: Use any email above`);
  console.log(`   Password: ${TEST_PASSWORD}`);
  console.log('\n🎉 You can now login with these accounts!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
