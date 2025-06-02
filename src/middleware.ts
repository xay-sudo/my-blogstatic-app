
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSettings } from './lib/settings-service';

const SESSION_COOKIE_NAME = 'newstoday-adminsession';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to /login page
  if (pathname === '/login') {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME);
    // If logged in and trying to access login, redirect to admin dashboard
    if (sessionCookie && sessionCookie.value === 'true') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next(); // Allow access to login page if not logged in
  }

  if (pathname.startsWith('/admin')) {
    const settings = await getSettings();
    const isAdminConfigured = settings.adminUsername && settings.adminUsername.trim() !== '';
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME);
    const isAuthenticated = sessionCookie && sessionCookie.value === 'true';

    if (pathname === '/admin/settings') {
      // If admin is not configured, allow access to settings page to set them up.
      // Otherwise, require authentication for the settings page.
      if (!isAdminConfigured) {
        return NextResponse.next();
      }
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        // loginUrl.searchParams.set('redirect', pathname); // Optional: add redirect query param
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // For all other /admin routes
      if (!isAuthenticated) {
        // If not authenticated, redirect to login.
        // The login page will inform if admin credentials need to be set up.
        const loginUrl = new URL('/login', request.url);
        // loginUrl.searchParams.set('redirect', pathname); // Optional: add redirect query param
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
