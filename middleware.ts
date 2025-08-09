import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

// 1. Specify protected and public routes
const protectedRoutes = ['/admin'];
const publicRoutes = ['/admin/login', '/', '/spielplan', '/ergebnisse', '/helfer', '/anmeldung'];

export default async function middleware(req: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = req.nextUrl.pathname;
  
  // Important: Check login route first before checking protected routes
  const isLoginRoute = path === '/admin/login';
  const isProtectedRoute = path.startsWith('/admin') && !isLoginRoute;
  const isPublicRoute = publicRoutes.includes(path) || isLoginRoute;

  // Skip authentication checks for login route and truly public routes
  if (isLoginRoute || isPublicRoute) {
    // For login route, check if user is already authenticated
    if (isLoginRoute) {
      const cookie = req.cookies.get('session')?.value;
      if (cookie) {
        try {
          // Only try to decrypt if cookie looks like a valid JWT
          if (cookie.includes('.') && cookie.split('.').length === 3) {
            const session = await decrypt(cookie);
            // If user is authenticated, redirect to admin dashboard
            if (session?.userId) {
              return NextResponse.redirect(new URL('/admin', req.nextUrl));
            }
          }
        } catch (error) {
          // Clear invalid cookie and continue to login page
          const response = NextResponse.next();
          response.cookies.delete('session');
          return response;
        }
      }
    }
    return NextResponse.next();
  }

  // 3. For protected routes, decrypt the session from the cookie
  let session = null;
  const cookie = req.cookies.get('session')?.value;
  
  if (cookie) {
    try {
      // Only try to decrypt if cookie looks like a valid JWT (has dots)
      if (cookie.includes('.') && cookie.split('.').length === 3) {
        session = await decrypt(cookie);
      }
    } catch (error) {
      // If decryption fails, clear the invalid cookie and redirect to login
      console.log('Invalid session cookie detected, will be cleared');
      const response = NextResponse.redirect(new URL('/admin/login', req.nextUrl));
      response.cookies.delete('session');
      return response;
    }
  }

  // 4. Redirect to /admin/login if the user is not authenticated
  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/admin/login', req.nextUrl));
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
