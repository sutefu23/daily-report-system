import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/(auth)') || 
                     request.nextUrl.pathname === '/login' ||
                     request.nextUrl.pathname === '/signup' ||
                     request.nextUrl.pathname === '/forgot-password'
  
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')
  
  // In production, you would check for a valid JWT token here
  // For now, we'll just check if the auth-storage exists in cookies
  
  if (isDashboardPage && !request.cookies.has('auth-storage')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}