/**
 * Migration script to generate matricola for existing students
 * Run this after the Prisma migration to populate matricola for existing students
 * 
 * Usage: npx ts-node scripts/migrateStudentMatricola.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateMatricola(year: number, existingMatricolas: Set<string>): Promise<string> {
  const prefix = `LS${year}`;
  let nextNumber = 1;

  // Find the next available number for this year
  for (const matricola of existingMatricolas) {
    if (matricola.startsWith(prefix)) {
      const num = parseInt(matricola.slice(-4), 10);
      if (!isNaN(num) && num >= nextNumber) {
        nextNumber = num + 1;
      }
    }
  }

  const paddedNumber = nextNumber.toString().padStart(4, '0');
  const newMatricola = `${prefix}${paddedNumber}`;
  
  // Add to set to track it
  existingMatricolas.add(newMatricola);
  
  return newMatricola;
}

async function migrateStudentMatricola() {
  console.log('🔄 Starting matricola migration for existing students...\n');

  try {
    // Get all students that don't have a matricola (null)
    const studentsWithoutMatricola = await prisma.student.findMany({
      where: {
        OR: [
          { matricola: null },
          { matricola: '' },
        ],
      },
      include: {
        user: {
          select: {
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'asc', // Process in order of enrollment
      },
    });

    if (studentsWithoutMatricola.length === 0) {
      console.log('✅ All students already have a matricola. Nothing to migrate.\n');
      return;
    }

    console.log(`📋 Found ${studentsWithoutMatricola.length} students without matricola.\n`);

    // Get all existing matricolas to avoid duplicates
    const existingStudents = await prisma.student.findMany({
      where: {
        matricola: { not: null },
      },
      select: {
        matricola: true,
      },
    });

    const existingMatricolas = new Set(
      existingStudents.map(s => s.matricola).filter((m): m is string => m !== null)
    );

    console.log(`📊 Found ${existingMatricolas.size} existing matricolas.\n`);

    let migrated = 0;
    let errors = 0;

    for (const student of studentsWithoutMatricola) {
      try {
        // Use enrollment year or creation year for the matricola
        const enrollmentYear = student.enrollmentDate?.getFullYear() || 
                              student.user.createdAt?.getFullYear() || 
                              new Date().getFullYear();
        
        const matricola = await generateMatricola(enrollmentYear, existingMatricolas);

        await prisma.student.update({
          where: { id: student.id },
          data: { matricola },
        });

        console.log(`✅ ${student.user.name}: ${matricola}`);
        migrated++;
      } catch (error) {
        console.error(`❌ Failed to migrate student ${student.user.name}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total: ${studentsWithoutMatricola.length}`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateStudentMatricola()
  .then(() => {
    console.log('✅ Migration completed successfully.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
