import { describe, it, expect } from 'vitest'
import { ContractAnalysisSchema, MANDATORY_DISCLAIMER } from '@/types/contract'

const validAnalysis = {
  executiveSummary: 'Resumo do contrato.',
  contractType: 'NDA',
  mainData: {
    parties: ['Empresa A', 'Empresa B'],
    object: 'Confidencialidade',
    term: '1 ano',
    value: 'Sem valor',
    paymentTerms: 'N/A',
    penalties: 'Multa de 50k',
    termination: '30 dias de aviso',
    jurisdiction: 'São Paulo',
    mainObligations: ['Manter sigilo'],
  },
  generalRisk: 'baixo' as const,
  criticalPoints: [],
  missingClauses: [],
  modelDivergences: [],
  suggestedAdjustments: [],
  humanValidationChecklist: [{ item: 'Verificar partes', status: 'pending' as const }],
  mandatoryDisclaimer: MANDATORY_DISCLAIMER,
}

describe('ContractAnalysisSchema', () => {
  it('validates a correct analysis', () => {
    expect(ContractAnalysisSchema.safeParse(validAnalysis).success).toBe(true)
  })
  it('rejects invalid generalRisk', () => {
    expect(ContractAnalysisSchema.safeParse({ ...validAnalysis, generalRisk: 'extremo' }).success).toBe(false)
  })
  it('rejects missing executiveSummary', () => {
    const { executiveSummary: _, ...rest } = validAnalysis
    expect(ContractAnalysisSchema.safeParse(rest).success).toBe(false)
  })
})
