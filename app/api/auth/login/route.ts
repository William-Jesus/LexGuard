import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password || username !== process.env.AUTH_USER || password !== process.env.AUTH_PASS) {
    return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  session.authenticated = true
  await session.save()
  return res
}
