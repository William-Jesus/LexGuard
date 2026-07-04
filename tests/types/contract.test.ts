import { describe, it, expect } from 'vitest'
import { AnalysisResultSchema } from '@/types/contract'

const validAnalysis = {
  executiveSummary: 'Resumo do contrato.',
  contractType: 'NDA',
  mainData: {
    parties: ['Empresa A', 'Empresa B'],
    object: 'Confidencialidade mútua',
    term: '2 anos',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'Multa de R$10.000',
    termination: 'Rescisão com 30 dias de aviso',
    jurisdiction: 'São Paulo/SP',
    mainObligations: ['Não divulgar informações confidenciais'],
  },
  generalRisk: 'baixo',
  criticalPoints: [
    { title: 'Prazo indefinido', riskLevel: 'medio', description: 'desc', recommendation: 'rec' },
  ],
  missingClauses: [
    { clause: 'LGPD', whyItMatters: 'importante', suggestion: 'adicionar cláusula' },
  ],
  modelDivergences: [],
  suggestedAdjustments: [
    { clause: 'Foro', currentIssue: 'ausente', suggestedText: 'texto sugerido', requiresHumanValidation: true },
  ],
  humanValidationChecklist: [{ item: 'Revisar cláusula de confidencialidade', status: 'pending' }],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
}

describe('AnalysisResultSchema', () => {
  it('accepts a valid analysis object', () => {
    const result = AnalysisResultSchema.safeParse(validAnalysis)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid generalRisk value', () => {
    const invalid = { ...validAnalysis, generalRisk: 'extremo' }
    const result = AnalysisResultSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects when a required field is missing', () => {
    const { executiveSummary, ...invalid } = validAnalysis
    const result = AnalysisResultSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
