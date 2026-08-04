import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hasAuth = request.cookies.has('auth');
  const isLoginPage = request.nextUrl.pathname === '/login';

  // If trying to access a protected route without auth, redirect to login
  if (!hasAuth && !isLoginPage && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If trying to access login while already authenticated, redirect to dashboard
  if (hasAuth && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except api, _next/static, _next/image, and favicon
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
