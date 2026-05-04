import { NextRequest } from 'next/server';
import { handleContactRequest } from '@/lib/api/contactApi';

/**
 * Job application form API endpoint
 * 
 * Uses shared validation, rate limiting, and email service from lib/api/contactApi
 * Supports file upload for CV (max 5MB, PDF/DOC/DOCX only)
 */
export async function POST(request: NextRequest) {
  return handleContactRequest({
    request,
    type: 'job-application',
  });
}
