import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

const PUBLIC = ['/login', '/api/auth/']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') return NextResponse.next()

  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, sessionOptions)

  if (!session.authenticated) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
