import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeContract, AiAnalysisError } from '@/lib/openaiContractAnalysis'

const validAnalysisJson = JSON.stringify({
  executiveSummary: 'Resumo.',
  contractType: 'NDA',
  mainData: {
    parties: ['A', 'B'],
    object: 'obj',
    term: '1 ano',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'multa',
    termination: 'rescisão',
    jurisdiction: 'SP',
    mainObligations: ['obrigação'],
  },
  generalRisk: 'baixo',
  criticalPoints: [],
  missingClauses: [],
  modelDivergences: [],
  suggestedAdjustments: [],
  humanValidationChecklist: [],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
})

function makeMockClient(content: string | null) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content } }],
        }),
      },
    },
  } as any
}

describe('analyzeContract', () => {
  const input = {
    contractText: 'texto do contrato',
    modelText: 'texto do modelo',
    contractType: 'NDA' as const,
    observations: '',
  }

  it('returns a validated analysis when the AI responds with valid JSON', async () => {
    const client = makeMockClient(validAnalysisJson)
    const result = await analyzeContract(input, client)
    expect(result.generalRisk).toBe('baixo')
    expect(client.chat.completions.create).toHaveBeenCalledOnce()
  })

  it('throws AiAnalysisError when the AI response is not valid JSON', async () => {
    const client = makeMockClient('isto não é json')
    await expect(analyzeContract(input, client)).rejects.toThrow(AiAnalysisError)
  })

  it('throws AiAnalysisError when the JSON does not match the expected schema', async () => {
    const client = makeMockClient(JSON.stringify({ foo: 'bar' }))
    await expect(analyzeContract(input, client)).rejects.toThrow(AiAnalysisError)
  })
})
