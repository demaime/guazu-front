import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('token') || '';
  
  // Si la ruta es /dashboard y no hay token, redirigir a /login
  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si la ruta es /login y hay token, redirigir a /dashboard
  if (request.nextUrl.pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
}; 