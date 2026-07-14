'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'

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
    <main className="min-h-screen bg-[#F7F6F3]">
      <AppHeader subtitle="Histórico de análises" />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-[#1C2B4A] mb-6">Análises anteriores</h2>

        {loading && (
          <p className="text-sm text-gray-400 text-center py-16">Carregando…</p>
        )}

        {!loading && rows.length === 0 && (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white border border-gray-200 mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-4">Nenhuma análise realizada ainda.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C2B4A] hover:bg-[#152037] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Enviar o primeiro contrato →
            </Link>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {rows.map(row => (
              <Link
                key={row.id}
                href={`/history/${row.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[#F7F6F3] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{row.filename}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{row.contract_type}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate">{row.summary}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
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
