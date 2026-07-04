import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/export-report/route'

const analysis = {
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

const meta = { contractName: 'NDA Fornecedor X', contractType: 'NDA', analyzedAt: '2026-07-02T10:00:00.000Z' }

describe('POST /api/export-report', () => {
  it('returns 400 for an invalid format', async () => {
    const request = new Request('http://localhost/api/export-report?format=txt', {
      method: 'POST',
      body: JSON.stringify({ analysis, meta }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns a PDF buffer with the correct headers', async () => {
    const request = new Request('http://localhost/api/export-report?format=pdf', {
      method: 'POST',
      body: JSON.stringify({ analysis, meta }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    const buffer = Buffer.from(await response.arrayBuffer())
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('returns a DOCX buffer with the correct headers', async () => {
    const request = new Request('http://localhost/api/export-report?format=docx', {
      method: 'POST',
      body: JSON.stringify({ analysis, meta }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  })

  it('returns 400 when the analysis payload does not match the schema', async () => {
    const request = new Request('http://localhost/api/export-report?format=pdf', {
      method: 'POST',
      body: JSON.stringify({ analysis: { foo: 'bar' }, meta }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
