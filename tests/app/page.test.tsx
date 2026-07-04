// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'

function makeFile(name: string, type: string) {
  return new File(['conteúdo'], name, { type })
}

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

describe('Home page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the analysis result after a successful submission', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ analysis, meta }),
      })
    )

    render(<Home />)

    await user.type(screen.getByLabelText('Nome do contrato'), 'NDA Fornecedor X')
    await user.upload(screen.getByLabelText(/Contrato a ser analisado/), makeFile('contrato.pdf', 'application/pdf'))
    await user.upload(screen.getByLabelText(/Modelo aprovado/), makeFile('modelo.pdf', 'application/pdf'))
    await user.click(screen.getByRole('button', { name: 'Analisar contrato' }))

    await waitFor(() => {
      expect(screen.getByTestId('analysis-result')).toBeInTheDocument()
    })
  })

  it('shows an error message when the API returns an error', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Não foi possível extrair o texto deste arquivo.',
          code: 'TEXT_EXTRACTION_FAILED',
        }),
      })
    )

    render(<Home />)

    await user.type(screen.getByLabelText('Nome do contrato'), 'NDA Fornecedor X')
    await user.upload(screen.getByLabelText(/Contrato a ser analisado/), makeFile('contrato.pdf', 'application/pdf'))
    await user.upload(screen.getByLabelText(/Modelo aprovado/), makeFile('modelo.pdf', 'application/pdf'))
    await user.click(screen.getByRole('button', { name: 'Analisar contrato' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível extrair o texto deste arquivo.')
    })
  })
})
