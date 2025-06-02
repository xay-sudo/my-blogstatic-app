
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Import settings.json directly using a relative path from src/ to data/
// This is generally more robust for Edge middleware.
import settingsData from '../data/settings.json';

const SESSION_COOKIE_NAME = 'newstoday-adminsession';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Directly use the imported settings data
  const currentSettings = settingsData;
  const isAdminConfigured = currentSettings.adminUsername && currentSettings.adminUsername.trim() !== '';
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME);
  const isAuthenticated = sessionCookie && sessionCookie.value === 'true';

  // Allow access to /login page
  if (pathname === '/login') {
    // If logged in and trying to access login, redirect to admin dashboard
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next(); // Allow access to login page if not logged in
  }

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/settings') {
      // If admin is not configured, allow access to settings page to set them up.
      // Otherwise, require authentication for the settings page.
      if (!isAdminConfigured) {
        return NextResponse.next();
      }
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        // Preserve the original destination in query params for redirect after login
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // For all other /admin routes
      // First, check if admin is configured. If not, redirect to settings to force setup.
      if (!isAdminConfigured) {
        const settingsUrl = new URL('/admin/settings', request.url);
        // Preserve the original destination in query params for redirect after setup
        settingsUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(settingsUrl);
      }
      // If admin is configured, then require authentication.
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, uploads (publicly served image assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)',
  ],
};
