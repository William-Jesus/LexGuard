const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string, windowMs: number, max: number): boolean {
  const now = Date.now()
  const entry = store.get(ip)
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

export function getClientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()) ?? 'unknown'
}
