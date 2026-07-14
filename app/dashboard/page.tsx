'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  total: number
  byRisk: { risk_level: string; count: number }[]
  recent: { id: number; filename: string; contract_type: string; risk_level: string; summary: string; analyzed_at: string }[]
  topIssues: { title: string; count: number }[]
}

const RISK_LABEL: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' }
const RISK_COLOR: Record<string, string> = {
  baixo: 'bg-green-100 text-green-800',
  medio: 'bg-yellow-100 text-yellow-800',
  alto: 'bg-red-100 text-red-800',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">LG</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">LexGuard</h1>
              <p className="text-xs text-gray-500">Dashboard</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Nova análise</Link>
            <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Histórico</Link>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Sair</button>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {loading && <p className="text-sm text-gray-500 text-center py-12">Carregando...</p>}

        {stats && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Total analisados</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              {['alto', 'medio', 'baixo'].map(level => {
                const found = stats.byRisk.find(r => r.risk_level === level)
                return (
                  <div key={level} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Risco {RISK_LABEL[level]}</p>
                    <p className="text-3xl font-bold text-gray-900">{found?.count ?? 0}</p>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição de risco */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Distribuição de risco</h2>
                {stats.total === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma análise ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {['alto', 'medio', 'baixo'].map(level => {
                      const found = stats.byRisk.find(r => r.risk_level === level)
                      const count = found?.count ?? 0
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                      return (
                        <div key={level}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700">{RISK_LABEL[level]}</span>
                            <span className="text-gray-500">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${level === 'alto' ? 'bg-red-500' : level === 'medio' ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Top problemas */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Problemas mais recorrentes</h2>
                {stats.topIssues.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum dado ainda.</p>
                ) : (
                  <ol className="space-y-2">
                    {stats.topIssues.map((issue, i) => (
                      <li key={issue.title} className="flex items-center gap-3 text-sm">
                        <span className="h-5 w-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-medium shrink-0">{i + 1}</span>
                        <span className="text-gray-700 truncate flex-1">{issue.title}</span>
                        <span className="text-gray-400 shrink-0">{issue.count}×</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Análises recentes */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Análises recentes</h2>
              </div>
              {stats.recent.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhuma análise ainda.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.recent.map(row => (
                    <Link
                      key={row.id}
                      href={`/history/${row.id}`}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{row.filename}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{row.summary}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_COLOR[row.risk_level] ?? 'bg-gray-100 text-gray-700'}`}>
                          {RISK_LABEL[row.risk_level] ?? row.risk_level}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(row.analyzed_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
