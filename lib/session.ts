import type { SessionOptions } from 'iron-session'

export interface SessionData {
  authenticated?: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD ?? 'changeme-set-a-real-32char-secret!!',
  cookieName: 'lexguard_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 8 * 60 * 60,
  },
}
