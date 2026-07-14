'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'
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
    <main className="min-h-screen bg-[#F7F6F3]">
      <AppHeader
        subtitle="Histórico"
        extra={
          <Link
            href="/history"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            ← Histórico
          </Link>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading && (
          <p className="text-sm text-gray-400 text-center py-16">Carregando…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 text-center py-16">{error}</p>
        )}
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
