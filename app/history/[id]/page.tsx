'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AnalysisResult } from '@/components/AnalysisResult'
import { ContractAnalysis } from '@/types/contract'

interface HistoryDetail {
  id: number
  filename: string
  contract_type: string
  analyzed_at: string
  full_analysis: ContractAnalysis
}

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<HistoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/history/${id}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error)))
      .then(setData)
      .catch(err => setError(typeof err === 'string' ? err : 'Erro ao carregar análise.'))
      .finally(() => setLoading(false))
  }, [id])

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
              <p className="text-xs text-gray-500">Histórico</p>
            </div>
          </div>
          <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Voltar ao histórico
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading && <p className="text-sm text-gray-500 text-center py-12">Carregando...</p>}
        {error && <p className="text-sm text-red-600 text-center py-12">{error}</p>}
        {data && (
          <AnalysisResult
            analysis={data.full_analysis}
            meta={{
              contractName: data.filename,
              contractType: data.contract_type,
              analyzedAt: data.analyzed_at,
            }}
          />
        )}
      </div>
    </main>
  )
}
