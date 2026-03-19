import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_APP_PREFIX, ADMIN_ROUTE_PREFIXES } from './lib/admin-routes';

function isAdminLegacyPath(pathname: string) {
  return ADMIN_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === ADMIN_APP_PREFIX) {
    return NextResponse.next();
  }

  if (pathname.startsWith(`${ADMIN_APP_PREFIX}/`)) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = pathname.slice(ADMIN_APP_PREFIX.length) || '/';
    return NextResponse.rewrite(nextUrl);
  }

  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/employee')
  ) {
    return NextResponse.next();
  }

  if (isAdminLegacyPath(pathname)) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = `${ADMIN_APP_PREFIX}${pathname}`;
    return NextResponse.redirect(nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
