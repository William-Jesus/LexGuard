// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnalysisResult } from '@/components/AnalysisResult'
import type { AnalysisResult as AnalysisResultType, AnalysisMeta } from '@/types/contract'

const analysis: AnalysisResultType = {
  executiveSummary: 'Resumo executivo de teste.',
  contractType: 'NDA',
  mainData: {
    parties: ['Empresa A', 'Empresa B'],
    object: 'Confidencialidade',
    term: '2 anos',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'Multa de R$10.000',
    termination: '30 dias de aviso',
    jurisdiction: 'São Paulo/SP',
    mainObligations: ['Não divulgar informações'],
  },
  generalRisk: 'alto',
  criticalPoints: [{ title: 'Prazo indefinido', riskLevel: 'alto', description: 'desc', recommendation: 'rec' }],
  missingClauses: [{ clause: 'LGPD', whyItMatters: 'importa', suggestion: 'adicionar' }],
  modelDivergences: [],
  suggestedAdjustments: [],
  humanValidationChecklist: [{ item: 'Revisar cláusula X', status: 'pending' }],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
}

const meta: AnalysisMeta = { contractName: 'NDA Fornecedor X', contractType: 'NDA', analyzedAt: '2026-07-02T10:00:00.000Z' }

describe('AnalysisResult', () => {
  it('renders contract name, risk badge and the mandatory disclaimer', () => {
    render(<AnalysisResult analysis={analysis} meta={meta} />)
    expect(screen.getByText('NDA Fornecedor X')).toBeInTheDocument()
    expect(screen.getByTestId('risk-badge')).toHaveTextContent('Risco Alto')
    expect(screen.getByText(/validada?.*profissional jurídico/)).toBeInTheDocument()
  })

  it('renders the human validation checklist items', () => {
    render(<AnalysisResult analysis={analysis} meta={meta} />)
    expect(screen.getByText('Revisar cláusula X')).toBeInTheDocument()
  })
})
