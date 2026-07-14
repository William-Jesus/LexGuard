import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import type { SessionData } from '@/lib/session'

const SESSION_PASSWORD = process.env.SESSION_PASSWORD ?? 'changeme-set-a-real-32char-secret!!'

const PUBLIC = ['/login', '/api/auth/']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') return NextResponse.next()

  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, {
    password: SESSION_PASSWORD,
    cookieName: 'lexguard_session',
    cookieOptions: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax' },
  })

  if (!session.authenticated) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
