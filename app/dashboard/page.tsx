'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'

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
const RISK_BAR: Record<string, string> = {
  alto: 'bg-red-500',
  medio: 'bg-yellow-500',
  baixo: 'bg-green-500',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-[#F7F6F3]">
      <AppHeader subtitle="Dashboard" />

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        {loading && (
          <p className="text-sm text-gray-400 text-center py-16">Carregando…</p>
        )}

        {stats && stats.total === 0 && (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white border border-gray-200 mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-4">Nenhum contrato analisado ainda.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C2B4A] hover:bg-[#152037] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Enviar o primeiro contrato →
            </Link>
          </div>
        )}

        {stats && stats.total > 0 && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Total</p>
                <p className="text-3xl font-bold text-[#1C2B4A]">{stats.total}</p>
              </div>
              {(['alto', 'medio', 'baixo'] as const).map(level => {
                const found = stats.byRisk.find(r => r.risk_level === level)
                return (
                  <div key={level} className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Risco {RISK_LABEL[level]}
                    </p>
                    <p className="text-3xl font-bold text-[#1C2B4A]">{found?.count ?? 0}</p>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição de risco */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-[#1C2B4A] text-base mb-4 pb-2 border-b border-gray-100">
                  Distribuição de risco
                </h2>
                <div className="space-y-4">
                  {(['alto', 'medio', 'baixo'] as const).map(level => {
                    const found = stats.byRisk.find(r => r.risk_level === level)
                    const count = found?.count ?? 0
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                    return (
                      <div key={level}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-700 font-medium">{RISK_LABEL[level]}</span>
                          <span className="text-gray-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${RISK_BAR[level]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top problemas */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-[#1C2B4A] text-base mb-4 pb-2 border-b border-gray-100">
                  Problemas mais recorrentes
                </h2>
                {stats.topIssues.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum dado ainda.</p>
                ) : (
                  <ol className="space-y-2.5">
                    {stats.topIssues.map((issue, i) => (
                      <li key={issue.title} className="flex items-center gap-3 text-sm">
                        <span className="h-5 w-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-gray-700 truncate flex-1">{issue.title}</span>
                        <span className="text-gray-400 flex-shrink-0 text-xs">{issue.count}×</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Análises recentes */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-[#1C2B4A] text-base">Análises recentes</h2>
              </div>
              {stats.recent.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Nenhuma análise ainda.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.recent.map(row => (
                    <Link
                      key={row.id}
                      href={`/history/${row.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F7F6F3] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{row.filename}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{row.summary}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
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
