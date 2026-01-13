/**
 * Test database connection before deploy
 * Usage: DATABASE_URL="postgresql://..." pnpm tsx scripts/test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');
    
    // Test basic query
    const userCount = await prisma.user.count();
    console.log(`📊 Database stats:`);
    console.log(`   Users: ${userCount}`);
    
    const questionCount = await prisma.question.count();
    console.log(`   Questions: ${questionCount}`);
    
    const subjectCount = await prisma.customSubject.count();
    console.log(`   Subjects: ${subjectCount}\n`);
    
    // Test database version
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    console.log(`🐘 PostgreSQL version:`);
    console.log(`   ${result[0].version.split(',')[0]}\n`);
    
    console.log('✅ All checks passed! Database ready for deploy.');
    
  } catch (error) {
    console.error('❌ Database connection failed!\n');
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('   Connection refused. Check:');
        console.error('   - Database is running');
        console.error('   - Host/port are correct');
        console.error('   - Firewall allows connections\n');
      } else if (error.message.includes('password authentication failed')) {
        console.error('   Authentication failed. Check:');
        console.error('   - Username is correct');
        console.error('   - Password is correct\n');
      } else if (error.message.includes('does not exist')) {
        console.error('   Database does not exist. Run:');
        console.error('   pnpm prisma db push\n');
      } else {
        console.error(`   Error: ${error.message}\n`);
      }
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
