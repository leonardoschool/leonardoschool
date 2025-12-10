import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get auth token and user data from cookies
  const authToken = request.cookies.get('auth-token')?.value;
  const userRole = request.cookies.get('user-role')?.value;
  const profileCompleted = request.cookies.get('profile-completed')?.value === 'true';
  
  // Protect /app/* routes (private application area)
  if (pathname.startsWith('/app')) {
    if (!authToken) {
      // Not authenticated, redirect to login
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Check if student has completed profile (skip for admins)
    if (userRole === 'STUDENT' && !profileCompleted && !pathname.startsWith('/auth/complete-profile')) {
      // Profile incomplete, redirect to complete profile page
      return NextResponse.redirect(new URL('/auth/complete-profile', request.url));
    }
    
    // Check role-based access
    if (pathname.startsWith('/app/admin') && userRole !== 'ADMIN') {
      // Not admin, redirect to student dashboard
      return NextResponse.redirect(new URL('/app/studente', request.url));
    }
    
    if (pathname.startsWith('/app/studente') && userRole !== 'STUDENT') {
      // Not student, redirect to admin dashboard
      return NextResponse.redirect(new URL('/app/admin', request.url));
    }
    
    // Redirect /app to role-specific dashboard
    if (pathname === '/app' || pathname === '/app/') {
      if (userRole === 'ADMIN') {
        return NextResponse.redirect(new URL('/app/admin', request.url));
      } else if (userRole === 'STUDENT') {
        return NextResponse.redirect(new URL('/app/studente', request.url));
      }
    }
  }
  
  // If authenticated and trying to access auth pages (except complete-profile), redirect to dashboard
  if (authToken && pathname.startsWith('/auth') && !pathname.startsWith('/auth/complete-profile')) {
    // If student with incomplete profile, allow access to complete-profile
    if (userRole === 'STUDENT' && !profileCompleted) {
      return NextResponse.redirect(new URL('/auth/complete-profile', request.url));
    }
    
    // Otherwise redirect to dashboard
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/app/admin', request.url));
    } else if (userRole === 'STUDENT') {
      return NextResponse.redirect(new URL('/app/studente', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/app/:path*',
    '/auth/:path*',
  ],
};
