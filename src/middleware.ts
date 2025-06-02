
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'newstoday-adminsession';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if trying to access an admin route
  if (pathname.startsWith('/admin')) {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME);

    if (!sessionCookie || sessionCookie.value !== 'true') {
      // Not authenticated, redirect to login page, preserving the intended destination
      const loginUrl = new URL('/login', request.url);
      // loginUrl.searchParams.set('redirect', pathname); // Optional: add redirect query param
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // If trying to access login page while already logged in, redirect to admin
  if (pathname === '/login') {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME);
    if (sessionCookie && sessionCookie.value === 'true') {
      return NextResponse.redirect(new URL('/admin', request.url));
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
