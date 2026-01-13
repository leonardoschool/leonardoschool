import { NextRequest } from 'next/server';
import { handleContactRequest } from '@/lib/api/contactApi';

/**
 * Contact form API endpoint
 * 
 * Uses shared validation, rate limiting, and email service from lib/api/contactApi
 */
export async function POST(request: NextRequest) {
  return handleContactRequest({
    request,
    type: 'contact',
  });
}
