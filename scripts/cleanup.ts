/**
 * Database Cleanup Script
 * 
 * Run manually to clean up old data from the database.
 * 
 * Usage: 
 *   pnpm cleanup              # Run cleanup
 *   pnpm cleanup --dry-run    # Preview what would be deleted
 *   pnpm cleanup --stats      # Show database stats
 */

import { config } from 'dotenv';
config({ path: '.env' });

import prisma from '../lib/prisma/client';
import { runCleanup, getDatabaseStats } from '../server/services/cleanupService';

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const showStats = args.includes('--stats');

  console.log('🧹 Database Cleanup Tool\n');

  if (showStats) {
    console.log('📊 Database Statistics:\n');
    const stats = await getDatabaseStats(prisma);
    
    console.log('Table Counts:');
    for (const [table, count] of Object.entries(stats.tableCounts)) {
      console.log(`  ${table}: ${count}`);
    }
    
    console.log('\nEstimated Cleanable Records:');
    for (const [table, count] of Object.entries(stats.estimatedCleanable)) {
      if (count > 0) {
        console.log(`  ${table}: ${count}`);
      }
    }
    
    const totalCleanable = Object.values(stats.estimatedCleanable).reduce((a, b) => a + b, 0);
    console.log(`\n  Total cleanable: ${totalCleanable}`);
    return;
  }

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No data will be deleted\n');
  }

  const result = await runCleanup(prisma, { dryRun: isDryRun });

  console.log('\n📋 Results:');
  for (const [task, data] of Object.entries(result.results)) {
    if (data.error) {
      console.log(`  ❌ ${task}: Error - ${data.error}`);
    } else {
      console.log(`  ✓ ${task}: ${data.deleted} deleted`);
    }
  }

  console.log(`\n⏱️  Duration: ${result.duration}ms`);
  console.log(`🗑️  Total deleted: ${result.totalDeleted}`);
  
  if (result.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
