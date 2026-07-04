import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/openaiContractAnalysis', async () => {
  const actual = await vi.importActual<typeof import('@/lib/openaiContractAnalysis')>(
    '@/lib/openaiContractAnalysis'
  )
  return {
    ...actual,
    analyzeContract: vi.fn(),
  }
})

import { POST } from '@/app/api/analyze-contract/route'
import { analyzeContract } from '@/lib/openaiContractAnalysis'
import { Document, Packer, Paragraph } from 'docx'

async function buildDocxFile(name: string, text: string): Promise<File> {
  const doc = new Document({ sections: [{ children: [new Paragraph(text)] }] })
  const buffer = await Packer.toBuffer(doc)
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

const validAnalysis = {
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
}

describe('POST /api/analyze-contract', () => {
  beforeEach(() => {
    vi.mocked(analyzeContract).mockReset()
  })

  it('returns 400 when contract name is missing', async () => {
    const formData = new FormData()
    formData.set('contractType', 'NDA')
    const request = new Request('http://localhost/api/analyze-contract', { method: 'POST', body: formData })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('CONTRACT_NAME_MISSING')
  })

  it('returns 422 when text extraction fails', async () => {
    const contractFile = await buildDocxFile('contrato.docx', '')
    const modelFile = await buildDocxFile(
      'modelo.docx',
      'Texto do modelo com conteúdo suficiente para passar na extração.'
    )

    const formData = new FormData()
    formData.set('contractName', 'Contrato Teste')
    formData.set('contractType', 'NDA')
    formData.set('contractFile', contractFile)
    formData.set('modelFile', modelFile)

    const request = new Request('http://localhost/api/analyze-contract', { method: 'POST', body: formData })
    const response = await POST(request)
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.code).toBe('TEXT_EXTRACTION_FAILED')
  })

  it('returns the analysis and meta when everything succeeds', async () => {
    vi.mocked(analyzeContract).mockResolvedValue(validAnalysis as any)

    const contractFile = await buildDocxFile(
      'contrato.docx',
      'Texto do contrato com conteúdo suficiente para passar na extração.'
    )
    const modelFile = await buildDocxFile(
      'modelo.docx',
      'Texto do modelo com conteúdo suficiente para passar na extração.'
    )

    const formData = new FormData()
    formData.set('contractName', 'Contrato Teste')
    formData.set('contractType', 'NDA')
    formData.set('contractFile', contractFile)
    formData.set('modelFile', modelFile)

    const request = new Request('http://localhost/api/analyze-contract', { method: 'POST', body: formData })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.analysis.generalRisk).toBe('baixo')
    expect(body.meta.contractName).toBe('Contrato Teste')
  })
})
