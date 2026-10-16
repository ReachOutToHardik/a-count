import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/sw.js',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon.svg',
  '/icon.png',
  '/brand-icon.png',
  '/icons',
  '/apple-touch-icon',
  '/favicon',
  '/wired-outline-298-coins.json',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for session cookie
  const session = request.cookies.get('acount_session')
  const isAuthenticated = session?.value === 'authenticated'

  // If already authenticated and visiting /login, redirect to /
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Allow public paths and static assets
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // Block unauthenticated API requests with 401
  if (!isAuthenticated && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized. Passcode required.' }, { status: 401 })
  }

  // Block unauthenticated page requests and redirect to /login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon-.*|apple-touch-icon.*|icon.svg|icon.png|brand-icon.png|icons/.*|sw.js|offline.html|manifest.json|manifest.webmanifest|wired-outline-298-coins.json|sitemap.xml|robots.txt).*)',
  ],
}
