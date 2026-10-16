import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/icon.svg',
  '/icon.png',
  '/brand-icon.png',
  '/wired-outline-298-coins.json',
  '/manifest.webmanifest',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and static assets
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // Check for session cookie
  const session = request.cookies.get('acount_session')
  if (!session || session.value !== 'authenticated') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|icon.png|brand-icon.png|wired-outline-298-coins.json|sitemap.xml|robots.txt).*)',
  ],
}
