'use client'
import { ContractAnalysis, MANDATORY_DISCLAIMER } from '@/types/contract'
import { RiskBadge } from './RiskBadge'
import { SuggestionList } from './SuggestionList'
import { HumanValidationChecklist } from './HumanValidationChecklist'
import { useState } from 'react'

interface Props {
  analysis: ContractAnalysis
  meta: { contractName: string; contractType: string; analyzedAt: string }
}

export function AnalysisResult({ analysis, meta }: Props) {
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)

  async function exportReport(format: 'pdf' | 'docx') {
    setExporting(format)
    try {
      const res = await fetch(`/api/export-report?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, meta }),
      })
      if (!res.ok) throw new Error('Erro ao exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lexguard-${meta.contractName.replace(/\s+/g, '-')}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao exportar relatório. Tente novamente.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
        <p className="text-sm font-semibold text-amber-800">⚠️ {MANDATORY_DISCLAIMER}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{meta.contractName}</h2>
          <p className="text-sm text-gray-500">{meta.contractType} · {new Date(meta.analyzedAt).toLocaleString('pt-BR')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportReport('pdf')}
            disabled={!!exporting}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {exporting === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <button
            onClick={() => exportReport('docx')}
            disabled={!!exporting}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {exporting === 'docx' ? 'Exportando...' : 'Exportar DOCX'}
          </button>
        </div>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Risco Geral</h3>
        <RiskBadge level={analysis.generalRisk} />
        <p className="mt-3 text-sm text-gray-700">{analysis.executiveSummary}</p>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados Principais</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {(
            [
              ['Partes', analysis.mainData.parties.join(', ')],
              ['Objeto', analysis.mainData.object],
              ['Prazo', analysis.mainData.term],
              ['Valor', analysis.mainData.value],
              ['Pagamento', analysis.mainData.paymentTerms],
              ['Multas', analysis.mainData.penalties],
              ['Rescisão', analysis.mainData.termination],
              ['Foro', analysis.mainData.jurisdiction],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="font-medium text-gray-500">{label}</dt>
              <dd className="text-gray-900">{value || '—'}</dd>
            </div>
          ))}
        </dl>
        {analysis.mainData.mainObligations.length > 0 && (
          <div className="mt-3">
            <p className="font-medium text-gray-500 text-sm">Obrigações Principais</p>
            <ul className="mt-1 list-disc list-inside text-sm text-gray-700 space-y-1">
              {analysis.mainData.mainObligations.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Pontos Críticos ({analysis.criticalPoints.length})
        </h3>
        {analysis.criticalPoints.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum ponto crítico identificado.</p>
        ) : (
          <ul className="space-y-4">
            {analysis.criticalPoints.map((cp, i) => (
              <li key={i} className="border-l-4 pl-4" style={{ borderColor: cp.riskLevel === 'alto' ? '#dc2626' : cp.riskLevel === 'medio' ? '#d97706' : '#16a34a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-900">{cp.title}</span>
                  <RiskBadge level={cp.riskLevel} />
                </div>
                <p className="text-sm text-gray-600">{cp.description}</p>
                <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Recomendação:</span> {cp.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Cláusulas Ausentes ({analysis.missingClauses.length})
        </h3>
        {analysis.missingClauses.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma cláusula ausente identificada.</p>
        ) : (
          <ul className="space-y-4">
            {analysis.missingClauses.map((mc, i) => (
              <li key={i} className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                <p className="font-semibold text-sm text-gray-900 mb-1">{mc.clause}</p>
                <p className="text-xs text-gray-600">{mc.whyItMatters}</p>
                <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Sugestão:</span> {mc.suggestion}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Divergências vs. Modelo ({analysis.modelDivergences.length})
        </h3>
        {analysis.modelDivergences.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma divergência identificada.</p>
        ) : (
          <ul className="space-y-4">
            {analysis.modelDivergences.map((md, i) => (
              <li key={i} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                <p className="font-semibold text-sm text-gray-900 mb-2">{md.topic}</p>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div><p className="font-medium text-gray-500">Contrato</p><p className="text-gray-700">{md.contractTextSummary}</p></div>
                  <div><p className="font-medium text-gray-500">Modelo</p><p className="text-gray-700">{md.modelTextSummary}</p></div>
                </div>
                <p className="text-xs text-gray-600"><span className="font-medium">Diferença:</span> {md.difference}</p>
                <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Recomendação:</span> {md.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Sugestões de Ajuste ({analysis.suggestedAdjustments.length})
        </h3>
        <SuggestionList suggestions={analysis.suggestedAdjustments} />
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Checklist de Validação Humana</h3>
        <HumanValidationChecklist items={analysis.humanValidationChecklist} />
      </section>
    </div>
  )
}
