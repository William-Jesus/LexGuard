'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

function ShieldIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.125)} viewBox="0 0 16 18" fill="none" aria-hidden="true">
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

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Credenciais inválidas.')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex">
      {/* ─── Left: Brand panel ─── */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 bg-[#1C2B4A] px-12 py-14 relative overflow-hidden">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 bg-[#C4901B] rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldIcon size={20} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">LexGuard</span>
        </div>

        {/* Headline */}
        <div className="relative">
          <h2 className="text-white text-3xl font-light leading-tight mb-5">
            Contratos revisados<br />
            <span className="text-[#C4901B] font-semibold">com precisão jurídica</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Identifique riscos, cláusulas ausentes e divergências em relação ao modelo aprovado — antes de assinar.
          </p>

          {/* Decorative document lines */}
          <div className="mt-10 space-y-2 opacity-20">
            <div className="w-36 h-1 bg-white rounded-full" />
            <div className="w-28 h-1 bg-white rounded-full" />
            <div className="w-32 h-1 bg-white rounded-full" />
            <div className="w-20 h-1 bg-white rounded-full" />
            <div className="w-30 h-1 bg-white rounded-full" />
          </div>
        </div>

        {/* Disclaimer */}
        <p className="relative text-white/30 text-xs leading-relaxed max-w-xs">
          Ferramenta de auxílio jurídico. Sempre consulte um advogado para validação final dos contratos.
        </p>
      </div>

      {/* ─── Right: Login form ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-white">
        {/* Mobile-only logo */}
        <div className="lg:hidden mb-8 text-center">
          <div className="h-12 w-12 bg-[#1C2B4A] rounded-xl flex items-center justify-center mx-auto mb-3">
            <ShieldIcon size={22} />
          </div>
          <p className="text-xl font-bold text-[#1C2B4A]">LexGuard</p>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-[#1C2B4A] mb-1">Entrar</h1>
          <p className="text-sm text-gray-500 mb-8">Use as credenciais fornecidas pelo administrador.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2B4DA4] focus:border-transparent"
                placeholder="seu.usuario"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2B4DA4] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1C2B4A] hover:bg-[#152037] disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
