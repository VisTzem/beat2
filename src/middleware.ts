// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('tribe_session');

  if (
    request.nextUrl.pathname.startsWith('/guide/group') || 
    request.nextUrl.pathname.startsWith('/guide/masters') ||
    request.nextUrl.pathname.startsWith('/battle/panel') ||
    request.nextUrl.pathname.startsWith('/peak-battle/leader') ||
    request.nextUrl.pathname.startsWith('/peak-battle/boss')
  ) {
    if (!session) {
      if (request.nextUrl.pathname.startsWith('/peak-battle')) {
        return NextResponse.redirect(new URL('/peak-battle', request.url));
      }
      if (request.nextUrl.pathname.startsWith('/battle')) {
        return NextResponse.redirect(new URL('/battle', request.url));
      }
      return NextResponse.redirect(new URL('/guide', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/guide/:path*', '/battle/:path*', '/peak-battle/:path*'],
};