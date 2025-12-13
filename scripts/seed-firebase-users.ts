/**
 * Firebase Auth Seed Script
 * Crea automaticamente gli utenti in Firebase Auth per il seeding del database
 * 
 * Usage: tsx scripts/seed-firebase-users.ts
 */

import { adminAuth } from '@/lib/firebase/admin';

const TEST_PASSWORD = 'TestPassword123!';

const SEED_USERS = {
  admins: [
    { email: 'admin1@leonardoschool.test', name: 'Mario Rossi' },
    { email: 'admin2@leonardoschool.test', name: 'Laura Bianchi' },
    { email: 'admin3@leonardoschool.test', name: 'Giuseppe Verdi' },
  ],
  collaboratori: [
    { email: 'collab1@leonardoschool.test', name: 'Anna Ferrari' },
    { email: 'collab2@leonardoschool.test', name: 'Marco Ricci' },
    { email: 'collab3@leonardoschool.test', name: 'Giulia Marino' },
    { email: 'collab4@leonardoschool.test', name: 'Francesco Romano' },
    { email: 'collab5@leonardoschool.test', name: 'Sara Colombo' },
    { email: 'collab6@leonardoschool.test', name: 'Alessandro Bruno' },
    { email: 'collab7@leonardoschool.test', name: 'Elena Gallo' },
    { email: 'collab8@leonardoschool.test', name: 'Davide Costa' },
    { email: 'collab9@leonardoschool.test', name: 'Chiara Conti' },
    { email: 'collab10@leonardoschool.test', name: 'Luca Giordano' },
  ],
  studenti: [
    { email: 'studente1@leonardoschool.test', name: 'Matteo De Luca' },
    { email: 'studente2@leonardoschool.test', name: 'Sofia Esposito' },
    { email: 'studente3@leonardoschool.test', name: 'Lorenzo Fontana' },
    { email: 'studente4@leonardoschool.test', name: 'Giulia Santoro' },
    { email: 'studente5@leonardoschool.test', name: 'Alessandro Moretti' },
    { email: 'studente6@leonardoschool.test', name: 'Francesca Leone' },
    { email: 'studente7@leonardoschool.test', name: 'Marco Benedetti' },
    { email: 'studente8@leonardoschool.test', name: 'Valentina Serra' },
    { email: 'studente9@leonardoschool.test', name: 'Gabriele Vitale' },
    { email: 'studente10@leonardoschool.test', name: 'Martina Orlando' },
    { email: 'studente11@leonardoschool.test', name: 'Andrea Ferri' },
    { email: 'studente12@leonardoschool.test', name: 'Beatrice Mancini' },
    { email: 'studente13@leonardoschool.test', name: 'Riccardo Greco' },
    { email: 'studente14@leonardoschool.test', name: 'Camilla Russo' },
    { email: 'studente15@leonardoschool.test', name: 'Tommaso Marchetti' },
    { email: 'studente16@leonardoschool.test', name: 'Alice Monti' },
    { email: 'studente17@leonardoschool.test', name: 'Edoardo Barbieri' },
    { email: 'studente18@leonardoschool.test', name: 'Emma Silvestri' },
    { email: 'studente19@leonardoschool.test', name: 'Nicolò Lombardi' },
    { email: 'studente20@leonardoschool.test', name: 'Greta Pellegrini' },
  ],
};

async function createFirebaseUser(email: string, displayName: string) {
  try {
    // Controlla se l'utente esiste già
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      console.log(`  ⏭️  ${displayName} (${email}) - already exists (UID: ${existingUser.uid})`);
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
        console.log(`  ✓ ${displayName} (${email}) - UID: ${userRecord.uid}`);
        return userRecord.uid;
      }
      throw error;
    }
  } catch (error) {
    console.error(`  ❌ Failed to create ${displayName}:`, error);
    return null;
  }
}

async function main() {
  console.log('🔥 Starting Firebase Auth seed...\n');

  // Check environment
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot seed Firebase in production environment!');
    process.exit(1);
  }

  const createdUsers: { email: string; uid: string; name: string }[] = [];

  // Create Admins
  console.log('👑 Creating 3 admin accounts...');
  for (const admin of SEED_USERS.admins) {
    const uid = await createFirebaseUser(admin.email, admin.name);
    if (uid) {
      createdUsers.push({ email: admin.email, uid, name: admin.name });
    }
  }

  // Create Collaboratori
  console.log('\n🤝 Creating 10 collaborator accounts...');
  for (const collab of SEED_USERS.collaboratori) {
    const uid = await createFirebaseUser(collab.email, collab.name);
    if (uid) {
      createdUsers.push({ email: collab.email, uid, name: collab.name });
    }
  }

  // Create Studenti
  console.log('\n🎓 Creating 20 student accounts...');
  for (const student of SEED_USERS.studenti) {
    const uid = await createFirebaseUser(student.email, student.name);
    if (uid) {
      createdUsers.push({ email: student.email, uid, name: student.name });
    }
  }

  console.log('\n✅ Firebase Auth seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`   • Total users created/verified: ${createdUsers.length}`);
  console.log('\n🔐 Test credentials:');
  console.log(`   Email: Use any email above`);
  console.log(`   Password: ${TEST_PASSWORD}`);
  console.log('\n⚠️  NEXT STEPS:');
  console.log('   1. Update Prisma seed script with real Firebase UIDs');
  console.log('   2. Run: pnpm prisma:seed');
  console.log('   3. Or create a combined script that does both\n');

  // Opzionalmente, salva gli UID in un file per il seed Prisma
  const fs = await import('fs');
  const mapping = createdUsers.reduce((acc, user) => {
    acc[user.email] = user.uid;
    return acc;
  }, {} as Record<string, string>);
  
  await fs.promises.writeFile(
    'prisma/firebase-uids.json',
    JSON.stringify(mapping, null, 2)
  );
  console.log('💾 UIDs saved to prisma/firebase-uids.json\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  });
