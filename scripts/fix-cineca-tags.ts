/**
 * Fix tag CINECA MAGGIO: sposta in "CINECA" le domande con year < 2024
 * che sono erroneamente taggate come "CINECA MAGGIO".
 *
 * Uso: npx tsx scripts/fix-cineca-tags.ts
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(process.cwd(), '.env') });

// Assicura che DATABASE_URL sia disponibile prima di inizializzare Prisma
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non trovato. Esegui prima: pnpm env:prod');
  process.exit(1);
}

import prisma from '../lib/prisma/client';

async function main() {
  console.log('🔍 Cerco tag "CINECA MAGGIO"...');

  const cinecaMaggioTag = await prisma.questionTag.findFirst({
    where: { name: 'CINECA MAGGIO' },
  });

  if (!cinecaMaggioTag) {
    console.error('❌ Tag "CINECA MAGGIO" non trovato.');
    process.exit(1);
  }

  // Trova o crea il tag "CINECA" generico
  let cinecaTag = await prisma.questionTag.findFirst({
    where: { name: 'CINECA' },
  });

  if (!cinecaTag) {
    console.log('➕ Creo tag "CINECA"...');
    const category = await prisma.questionTagCategory.findFirst();
    if (!category) {
      console.error('❌ Nessuna categoria tag trovata.');
      process.exit(1);
    }
    cinecaTag = await prisma.questionTag.create({
      data: {
        name: 'CINECA',
        description: 'Database importato da Firestore',
        categoryId: category.id,
      },
    });
  }

  console.log(`   Tag "CINECA MAGGIO" id: ${cinecaMaggioTag.id}`);
  console.log(`   Tag "CINECA"        id: ${cinecaTag.id}\n`);

  // Trova le domande taggate "CINECA MAGGIO" con year < 2024 (o null)
  const wrongAssignments = await prisma.questionTagAssignment.findMany({
    where: {
      tagId: cinecaMaggioTag.id,
      question: {
        year: { lt: 2024 },
      },
    },
    select: { questionId: true, id: true },
  });

  console.log(`📊 Domande da spostare: ${wrongAssignments.length}`);

  if (wrongAssignments.length === 0) {
    console.log('✅ Nessuna correzione necessaria.');
    return;
  }

  const questionIds = wrongAssignments.map(a => a.questionId);
  const assignmentIds = wrongAssignments.map(a => a.id);

  // Rimuovi i vecchi assignment "CINECA MAGGIO"
  await prisma.questionTagAssignment.deleteMany({
    where: { id: { in: assignmentIds } },
  });
  console.log(`🗑️  Rimossi ${assignmentIds.length} assignment "CINECA MAGGIO"`);

  // Crea i nuovi assignment "CINECA" (solo per quelli che non ce l'hanno già)
  const existing = await prisma.questionTagAssignment.findMany({
    where: { tagId: cinecaTag.id, questionId: { in: questionIds } },
    select: { questionId: true },
  });
  const existingIds = new Set(existing.map(e => e.questionId));
  const toCreate = questionIds.filter(id => !existingIds.has(id));

  if (toCreate.length > 0) {
    await prisma.questionTagAssignment.createMany({
      data: toCreate.map(questionId => ({
        questionId,
        tagId: cinecaTag!.id,
      })),
    });
  }

  console.log(`✅ Creati ${toCreate.length} assignment "CINECA"`);
  console.log('\n🎉 Fix completato!');
}

main()
  .catch(e => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
