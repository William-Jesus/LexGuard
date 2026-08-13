import type { SessionOptions } from 'iron-session'

export interface SessionData {
  authenticated?: boolean
}

const SESSION_PASSWORD = process.env.SESSION_PASSWORD
if (!SESSION_PASSWORD) {
  throw new Error('[LexGuard] SESSION_PASSWORD não configurado. Defina no .env.local (mínimo 32 chars).')
}

export const sessionOptions: SessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: 'lexguard_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 8 * 60 * 60,
  },
}
