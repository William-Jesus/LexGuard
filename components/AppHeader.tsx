'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AppHeaderProps {
  subtitle?: string
  extra?: React.ReactNode
}

function ShieldIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true">
      <path
        d="M8 1L1 3.8V9C1 12.9 4.2 16.5 8 17.5C11.8 16.5 15 12.9 15 9V3.8L8 1Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9L7.5 11L11 7"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AppHeader({ subtitle, extra }: AppHeaderProps) {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const links: { href: string; label: string }[] = []
  if (pathname !== '/') links.push({ href: '/', label: 'Nova análise' })
  if (!pathname.startsWith('/history')) links.push({ href: '/history', label: 'Histórico' })
  if (pathname !== '/dashboard') links.push({ href: '/dashboard', label: 'Dashboard' })
  if (!pathname.startsWith('/knowledge-base')) links.push({ href: '/knowledge-base', label: 'Base' })

  return (
    <header className="bg-[#1C2B4A] border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="h-8 w-8 bg-[#C4901B] rounded-lg flex items-center justify-center transition-opacity group-hover:opacity-90">
            <ShieldIcon />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">LexGuard</p>
            {subtitle && (
              <p className="text-xs text-white/50 leading-none mt-0.5">{subtitle}</p>
            )}
          </div>
        </Link>

        <nav className="flex items-center gap-5 flex-wrap justify-end">
          {extra}
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors whitespace-nowrap ${
                pathname.startsWith(href) && href !== '/'
                  ? 'text-white font-medium'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  )
}
