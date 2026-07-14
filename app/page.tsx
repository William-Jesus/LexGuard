'use client'
import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { ContractUploadForm } from '@/components/ContractUploadForm'
import { AnalysisResult } from '@/components/AnalysisResult'
import { ContractAnalysis } from '@/types/contract'

interface AnalysisResultData {
  analysis: ContractAnalysis
  meta: { contractName: string; contractType: string; analyzedAt: string }
}

export default function Home() {
  const [result, setResult] = useState<AnalysisResultData | null>(null)

  return (
    <main className="min-h-screen bg-[#F7F6F3]">
      <AppHeader
        subtitle="Revisão de contratos assistida por IA"
        extra={
          result ? (
            <button
              onClick={() => setResult(null)}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              ← Nova análise
            </button>
          ) : undefined
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {!result ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-[#1C2B4A] mb-2">Análise de Contrato</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Envie o contrato e o modelo aprovado para receber uma análise estruturada de riscos,
                cláusulas ausentes e divergências.
              </p>
            </div>
            <ContractUploadForm onResult={setResult} />
          </div>
        ) : (
          <AnalysisResult analysis={result.analysis} meta={result.meta} />
        )}
      </div>
    </main>
  )
}
