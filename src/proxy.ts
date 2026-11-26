import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'scene_session';
const PROTECTED_PATHS = ['/events', '/create', '/profile', '/admin'];
const AUTH_PATHS = ['/login', '/register', '/forgot-password'];

const matchesPath = (pathname: string, paths: string[]): boolean =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * Lightweight UX gate. The API remains the security boundary and validates the
 * session on every request; this proxy only avoids rendering private screens
 * for visitors without a session cookie.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (hasSession && AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/events', request.url));
  }

  if (!hasSession && matchesPath(pathname, PROTECTED_PATHS)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|uploads|_next/static|_next/image|favicon.ico|img|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico)$).*)',
  ],
};
