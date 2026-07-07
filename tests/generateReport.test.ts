import { describe, it, expect } from 'vitest'
import { generateDocxReport } from '@/lib/generateReport'
import { MANDATORY_DISCLAIMER, ContractAnalysis } from '@/types/contract'

const analysis: ContractAnalysis = {
  executiveSummary: 'Análise de teste.',
  contractType: 'NDA',
  mainData: {
    parties: ['A', 'B'],
    object: 'Teste',
    term: '1 ano',
    value: '0',
    paymentTerms: 'N/A',
    penalties: 'Nenhuma',
    termination: 'A qualquer tempo',
    jurisdiction: 'São Paulo',
    mainObligations: ['Sigilo'],
  },
  generalRisk: 'baixo',
  criticalPoints: [{ title: 'Risco 1', riskLevel: 'baixo', description: 'Desc', recommendation: 'Rec' }],
  missingClauses: [{ clause: 'LGPD', whyItMatters: 'Compliance', suggestion: 'Adicionar' }],
  modelDivergences: [],
  suggestedAdjustments: [{ clause: 'Art 1', currentIssue: 'Vago', suggestedText: 'Texto sugerido', requiresHumanValidation: true }],
  humanValidationChecklist: [{ item: 'Verificar', status: 'pending' }],
  mandatoryDisclaimer: MANDATORY_DISCLAIMER,
}

const meta = { contractName: 'Teste', contractType: 'NDA', analyzedAt: new Date().toISOString() }

describe('generateDocxReport', () => {
  it('returns a non-empty buffer', async () => {
    const buf = await generateDocxReport(analysis, meta)
    expect(buf.length).toBeGreaterThan(0)
  })
})
