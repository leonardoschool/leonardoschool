/**
 * Utility functions for generating student matricola (enrollment number)
 * Format: LS + year (4 digits) + progressive number (4 digits zero-padded)
 * Example: LS20250001
 */

import { PrismaClient } from '@prisma/client';

/**
 * Generate a unique matricola for a new student
 * Format: LS{year}{4-digit-progressive}
 * @example LS20250001, LS20250002, etc.
 */
export async function generateMatricola(prisma: PrismaClient): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `LS${currentYear}`;

  // Find the highest matricola for the current year
  const lastStudent = await prisma.student.findFirst({
    where: {
      matricola: {
        startsWith: prefix,
      },
    },
    orderBy: {
      matricola: 'desc',
    },
    select: {
      matricola: true,
    },
  });

  let nextNumber = 1;

  if (lastStudent?.matricola) {
    // Extract the numeric part from the last matricola
    const lastNumber = parseInt(lastStudent.matricola.slice(-4), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Zero-pad the number to 4 digits
  const paddedNumber = nextNumber.toString().padStart(4, '0');

  return `${prefix}${paddedNumber}`;
}

/**
 * Validate matricola format
 * @param matricola The matricola string to validate
 * @returns true if valid, false otherwise
 */
export function isValidMatricola(matricola: string): boolean {
  // Format: LS + 4 digit year + 4 digit number
  const regex = /^LS\d{4}\d{4}$/;
  return regex.test(matricola);
}
