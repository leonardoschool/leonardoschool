/**
 * Database Seed Script
 * Popola il database con dati di test in ambiente di sviluppo
 * 
 * Usage: pnpm prisma:seed
 */

import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// Dati seed per Firebase (usare questi per creare account in Firebase)
// Password di test: "TestPassword123!" per tutti gli account
const SEED_USERS = {
  admins: [
    { email: 'admin1@leonardoschool.test', name: 'Mario Rossi' },
    { email: 'admin2@leonardoschool.test', name: 'Laura Bianchi' },
    { email: 'admin3@leonardoschool.test', name: 'Giuseppe Verdi' },
  ],
  collaboratori: [
    { email: 'collab1@leonardoschool.test', name: 'Anna Ferrari', phone: '3331234567', fiscalCode: 'FRRNNA80A01H501Z' },
    { email: 'collab2@leonardoschool.test', name: 'Marco Ricci', phone: '3332345678', fiscalCode: 'RCCMRC85B02H501Z' },
    { email: 'collab3@leonardoschool.test', name: 'Giulia Marino', phone: '3333456789', fiscalCode: 'MRNGLI90C03H501Z' },
    { email: 'collab4@leonardoschool.test', name: 'Francesco Romano', phone: '3334567890', fiscalCode: 'RMNFNC88D04H501Z' },
    { email: 'collab5@leonardoschool.test', name: 'Sara Colombo', phone: '3335678901', fiscalCode: 'CLMSRA92E05H501Z' },
    { email: 'collab6@leonardoschool.test', name: 'Alessandro Bruno', phone: '3336789012', fiscalCode: 'BRNLSN87F06H501Z' },
    { email: 'collab7@leonardoschool.test', name: 'Elena Gallo', phone: '3337890123', fiscalCode: 'GLLLNE91G07H501Z' },
    { email: 'collab8@leonardoschool.test', name: 'Davide Costa', phone: '3338901234', fiscalCode: 'CSTDVD89H08H501Z' },
    { email: 'collab9@leonardoschool.test', name: 'Chiara Conti', phone: '3339012345', fiscalCode: 'CNTCHR93I09H501Z' },
    { email: 'collab10@leonardoschool.test', name: 'Luca Giordano', phone: '3340123456', fiscalCode: 'GRDLCU86L10H501Z' },
  ],
  studenti: [
    { email: 'studente1@leonardoschool.test', name: 'Matteo De Luca', phone: '3341234567', fiscalCode: 'DLCMTT02A01H501Z', dateOfBirth: '2002-01-15', address: 'Via Roma 123', postalCode: '00100', city: 'Roma', province: 'RM' },
    { email: 'studente2@leonardoschool.test', name: 'Sofia Esposito', phone: '3342345678', fiscalCode: 'SPSSFO03B02H501Z', dateOfBirth: '2003-02-20', address: 'Via Milano 45', postalCode: '20100', city: 'Milano', province: 'MI' },
    { email: 'studente3@leonardoschool.test', name: 'Lorenzo Fontana', phone: '3343456789', fiscalCode: 'FNTLRN02C03H501Z', dateOfBirth: '2002-03-25', address: 'Via Napoli 67', postalCode: '80100', city: 'Napoli', province: 'NA' },
    { email: 'studente4@leonardoschool.test', name: 'Giulia Santoro', phone: '3344567890', fiscalCode: 'SNTGLI03D04H501Z', dateOfBirth: '2003-04-10', address: 'Via Torino 89', postalCode: '10100', city: 'Torino', province: 'TO' },
    { email: 'studente5@leonardoschool.test', name: 'Alessandro Moretti', phone: '3345678901', fiscalCode: 'MRTLSN02E05H501Z', dateOfBirth: '2002-05-15', address: 'Via Bologna 12', postalCode: '40100', city: 'Bologna', province: 'BO' },
    { email: 'studente6@leonardoschool.test', name: 'Francesca Leone', phone: '3346789012', fiscalCode: 'LNEFNC03F06H501Z', dateOfBirth: '2003-06-20', address: 'Via Firenze 34', postalCode: '50100', city: 'Firenze', province: 'FI' },
    { email: 'studente7@leonardoschool.test', name: 'Marco Benedetti', phone: '3347890123', fiscalCode: 'BNDMRC02G07H501Z', dateOfBirth: '2002-07-25', address: 'Via Genova 56', postalCode: '16100', city: 'Genova', province: 'GE' },
    { email: 'studente8@leonardoschool.test', name: 'Valentina Serra', phone: '3348901234', fiscalCode: 'SRRVNT03H08H501Z', dateOfBirth: '2003-08-30', address: 'Via Palermo 78', postalCode: '90100', city: 'Palermo', province: 'PA' },
    { email: 'studente9@leonardoschool.test', name: 'Gabriele Vitale', phone: '3349012345', fiscalCode: 'VTLGBR02I09H501Z', dateOfBirth: '2002-09-05', address: 'Via Catania 90', postalCode: '95100', city: 'Catania', province: 'CT' },
    { email: 'studente10@leonardoschool.test', name: 'Martina Orlando', phone: '3350123456', fiscalCode: 'RLNMRT03L10H501Z', dateOfBirth: '2003-10-10', address: 'Via Venezia 23', postalCode: '30100', city: 'Venezia', province: 'VE' },
    { email: 'studente11@leonardoschool.test', name: 'Andrea Ferri', phone: '3351234567', fiscalCode: 'FRRNDR02M11H501Z', dateOfBirth: '2002-11-15', address: 'Via Verona 45', postalCode: '37100', city: 'Verona', province: 'VR' },
    { email: 'studente12@leonardoschool.test', name: 'Beatrice Mancini', phone: '3352345678', fiscalCode: 'MNCBTR03N12H501Z', dateOfBirth: '2003-12-20', address: 'Via Padova 67', postalCode: '35100', city: 'Padova', province: 'PD' },
    { email: 'studente13@leonardoschool.test', name: 'Riccardo Greco', phone: '3353456789', fiscalCode: 'GRCRCC02A13H501Z', dateOfBirth: '2002-01-25', address: 'Via Trieste 89', postalCode: '34100', city: 'Trieste', province: 'TS' },
    { email: 'studente14@leonardoschool.test', name: 'Camilla Russo', phone: '3354567890', fiscalCode: 'RSSCML03B14H501Z', dateOfBirth: '2003-02-28', address: 'Via Bari 12', postalCode: '70100', city: 'Bari', province: 'BA' },
    { email: 'studente15@leonardoschool.test', name: 'Tommaso Marchetti', phone: '3355678901', fiscalCode: 'MRCTMS02C15H501Z', dateOfBirth: '2002-03-10', address: 'Via Brescia 34', postalCode: '25100', city: 'Brescia', province: 'BS' },
    { email: 'studente16@leonardoschool.test', name: 'Alice Monti', phone: '3356789012', fiscalCode: 'MNTLCA03D16H501Z', dateOfBirth: '2003-04-15', address: 'Via Parma 56', postalCode: '43100', city: 'Parma', province: 'PR' },
    { email: 'studente17@leonardoschool.test', name: 'Edoardo Barbieri', phone: '3357890123', fiscalCode: 'BRBRDR02E17H501Z', dateOfBirth: '2002-05-20', address: 'Via Modena 78', postalCode: '41100', city: 'Modena', province: 'MO' },
    { email: 'studente18@leonardoschool.test', name: 'Emma Silvestri', phone: '3358901234', fiscalCode: 'SLVMMA03F18H501Z', dateOfBirth: '2003-06-25', address: 'Via Reggio 90', postalCode: '42100', city: 'Reggio Emilia', province: 'RE' },
    { email: 'studente19@leonardoschool.test', name: 'Nicolò Lombardi', phone: '3359012345', fiscalCode: 'LMBNCL02G19H501Z', dateOfBirth: '2002-07-30', address: 'Via Piacenza 12', postalCode: '29100', city: 'Piacenza', province: 'PC' },
    { email: 'studente20@leonardoschool.test', name: 'Greta Pellegrini', phone: '3360123456', fiscalCode: 'PLLGRT03H20H501Z', dateOfBirth: '2003-08-05', address: 'Via Ravenna 34', postalCode: '48100', city: 'Ravenna', province: 'RA' },
  ],
};

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Check environment
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot seed database in production environment!');
    process.exit(1);
  }

  console.log('⚠️  IMPORTANTE: Questo script crea SOLO i record PostgreSQL.');
  console.log('⚠️  Devi PRIMA creare gli account in Firebase Auth con la stessa email.');
  console.log('⚠️  Oppure usa Firebase Admin SDK per creare gli account automaticamente.\n');

  // Pulisci database esistente (opzionale - commenta se vuoi preservare dati)
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
    await prisma.user.create({
      data: {
        firebaseUid: `seed-admin-${admin.email}`, // Placeholder - sostituire con vero UID Firebase
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
    await prisma.user.create({
      data: {
        firebaseUid: `seed-collab-${collab.email}`, // Placeholder
        email: collab.email,
        name: collab.name,
        role: UserRole.COLLABORATOR,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        collaborator: {
          create: {
            phone: collab.phone,
            fiscalCode: collab.fiscalCode,
          },
        },
      },
    });
    console.log(`  ✓ ${collab.name} (${collab.email})`);
  }

  // Create Studenti
  console.log('\n🎓 Creating 20 student accounts...');
  for (const student of SEED_USERS.studenti) {
    await prisma.user.create({
      data: {
        firebaseUid: `seed-student-${student.email}`, // Placeholder
        email: student.email,
        name: student.name,
        role: UserRole.STUDENT,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        student: {
          create: {
            phone: student.phone,
            fiscalCode: student.fiscalCode,
            dateOfBirth: new Date(student.dateOfBirth),
            address: student.address,
            postalCode: student.postalCode,
            city: student.city,
            province: student.province,
          },
        },
      },
    });
    console.log(`  ✓ ${student.name} (${student.email})`);
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`   • 3 Admins`);
  console.log(`   • 10 Collaborators`);
  console.log(`   • 20 Students`);
  console.log('\n🔐 Test credentials:');
  console.log(`   Email: Use any email above`);
  console.log(`   Password: TestPassword123! (if created in Firebase)`);
  console.log('\n⚠️  NEXT STEPS:');
  console.log('   1. Create corresponding Firebase Auth accounts with the same emails');
  console.log('   2. Update firebaseUid in database with real Firebase UIDs');
  console.log('   3. Or use the Firebase Admin SDK script to automate this\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
