import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('ahb_session')?.value;
  const { pathname } = request.nextUrl;

  // Routes protégées
  const isProtectedRoute =
    pathname === '/' ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/admin');

  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/projects/:path*', '/admin/:path*'],
};
