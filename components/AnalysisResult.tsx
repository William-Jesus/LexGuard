import type { AnalysisResult as AnalysisResultType, AnalysisMeta } from '@/types/contract'
import { MANDATORY_DISCLAIMER } from '@/types/contract'
import { RiskBadge } from './RiskBadge'
import { SuggestionList } from './SuggestionList'
import { HumanValidationChecklist } from './HumanValidationChecklist'

export function AnalysisResult({ analysis, meta }: { analysis: AnalysisResultType; meta: AnalysisMeta }) {
  return (
    <div className="space-y-6" data-testid="analysis-result">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{meta.contractName}</h2>
        <RiskBadge level={analysis.generalRisk} />
      </div>

      <section>
        <h3 className="font-medium">Resumo executivo</h3>
        <p className="text-sm text-gray-700">{analysis.executiveSummary}</p>
      </section>

      <section>
        <h3 className="font-medium">Dados principais</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Partes</dt>
          <dd>{analysis.mainData.parties.join(', ')}</dd>
          <dt className="text-gray-500">Objeto</dt>
          <dd>{analysis.mainData.object}</dd>
          <dt className="text-gray-500">Prazo</dt>
          <dd>{analysis.mainData.term}</dd>
          <dt className="text-gray-500">Valor</dt>
          <dd>{analysis.mainData.value}</dd>
          <dt className="text-gray-500">Forma de pagamento</dt>
          <dd>{analysis.mainData.paymentTerms}</dd>
          <dt className="text-gray-500">Multas</dt>
          <dd>{analysis.mainData.penalties}</dd>
          <dt className="text-gray-500">Rescisão</dt>
          <dd>{analysis.mainData.termination}</dd>
          <dt className="text-gray-500">Foro</dt>
          <dd>{analysis.mainData.jurisdiction}</dd>
        </dl>
      </section>

      <section>
        <h3 className="font-medium">Pontos críticos</h3>
        <ul className="space-y-2 text-sm">
          {analysis.criticalPoints.map((point, index) => (
            <li key={index} className="rounded border border-gray-200 p-2">
              <span className="font-medium">{point.title}</span> — {point.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-medium">Cláusulas ausentes</h3>
        <ul className="space-y-2 text-sm">
          {analysis.missingClauses.map((clause, index) => (
            <li key={index} className="rounded border border-gray-200 p-2">
              <span className="font-medium">{clause.clause}</span> — {clause.whyItMatters}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-medium">Divergências em relação ao modelo aprovado</h3>
        <ul className="space-y-2 text-sm">
          {analysis.modelDivergences.map((divergence, index) => (
            <li key={index} className="rounded border border-gray-200 p-2">
              <span className="font-medium">{divergence.topic}</span> — {divergence.difference}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-medium">Sugestões de ajuste</h3>
        <SuggestionList suggestions={analysis.suggestedAdjustments} />
      </section>

      <section>
        <h3 className="font-medium">Checklist para validação humana</h3>
        <HumanValidationChecklist items={analysis.humanValidationChecklist} />
      </section>

      <p className="rounded bg-amber-50 p-3 text-sm font-medium text-amber-800">{MANDATORY_DISCLAIMER}</p>
    </div>
  )
}
