'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HistoryRow {
  id: number
  filename: string
  contract_type: string
  risk_level: string
  summary: string
  analyzed_at: string
}

const RISK_LABEL: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' }
const RISK_COLOR: Record<string, string> = {
  baixo: 'bg-green-100 text-green-800',
  medio: 'bg-yellow-100 text-yellow-800',
  alto: 'bg-red-100 text-red-800',
}

export default function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(setRows).finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">LG</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">LexGuard</h1>
              <p className="text-xs text-gray-500">Histórico de análises</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Nova análise</Link>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Análises anteriores</h2>

        {loading && <p className="text-sm text-gray-500 text-center py-12">Carregando...</p>}

        {!loading && rows.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">Nenhuma análise realizada ainda.</p>
            <Link href="/" className="mt-2 inline-block text-sm text-gray-900 underline">Fazer primeira análise</Link>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {rows.map(row => (
              <Link
                key={row.id}
                href={`/history/${row.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{row.filename}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{row.contract_type}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate">{row.summary}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_COLOR[row.risk_level] ?? 'bg-gray-100 text-gray-700'}`}>
                    {RISK_LABEL[row.risk_level] ?? row.risk_level}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(row.analyzed_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
