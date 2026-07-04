'use client'

import { useState } from 'react'
import { ContractUploadForm } from '@/components/ContractUploadForm'
import { AnalysisResult } from '@/components/AnalysisResult'
import type { AnalysisResult as AnalysisResultType, AnalysisMeta } from '@/types/contract'

interface AnalyzeResponse {
  analysis: AnalysisResultType
  meta: AnalysisMeta
}

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'docx' | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setErrorMessage(undefined)
    setResult(null)

    try {
      const response = await fetch('/api/analyze-contract', { method: 'POST', body: formData })
      const body = await response.json()

      if (!response.ok) {
        setErrorMessage(body.error ?? 'Ocorreu um erro ao analisar o contrato.')
        return
      }

      setResult(body)
    } catch {
      setErrorMessage('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleExport(format: 'pdf' | 'docx') {
    if (!result) return
    setExportingFormat(format)

    try {
      const response = await fetch(`/api/export-report?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })

      if (!response.ok) {
        setErrorMessage('Não foi possível exportar o relatório. Tente novamente.')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio-${result.meta.contractName}.${format}`
      link.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setExportingFormat(null)
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Analisar contrato</h1>

      <ContractUploadForm onSubmit={handleSubmit} isSubmitting={isSubmitting} errorMessage={errorMessage} />

      {result && (
        <div className="space-y-4 border-t pt-8">
          <AnalysisResult analysis={result.analysis} meta={result.meta} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={exportingFormat !== null}
              className="rounded bg-gray-800 px-4 py-2 text-white disabled:opacity-50"
            >
              {exportingFormat === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('docx')}
              disabled={exportingFormat !== null}
              className="rounded bg-gray-800 px-4 py-2 text-white disabled:opacity-50"
            >
              {exportingFormat === 'docx' ? 'Exportando...' : 'Exportar DOCX'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
