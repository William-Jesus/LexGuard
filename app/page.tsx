'use client'
import { useState } from 'react'
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
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">LG</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">LexGuard</h1>
              <p className="text-xs text-gray-500">Revisão de contratos assistida por IA</p>
            </div>
          </div>
          {result && (
            <button
              onClick={() => setResult(null)}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Nova análise
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!result ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Análise de Contrato</h2>
              <p className="text-gray-500 text-sm">
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
