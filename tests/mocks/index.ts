/**
 * Test Utilities Index
 * Centralized exports for all test mocks and utilities
 */

// Mock exports
export * from './firebase';
export * from './prisma';

// Re-export default mocks
export { default as firebaseMocks } from './firebase';
export { default as prismaMock } from './prisma';
