import { describe, it, expect } from 'vitest'
import { generateReportPdf, generateReportDocx } from '@/lib/generateReport'
import { extractTextFromPdf } from '@/lib/extractTextFromPdf'
import { extractTextFromDocx } from '@/lib/extractTextFromDocx'
import type { AnalysisResult, AnalysisMeta } from '@/types/contract'

const analysis: AnalysisResult = {
  executiveSummary: 'Este é um resumo executivo de teste com conteúdo suficiente.',
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
  generalRisk: 'medio',
  criticalPoints: [
    { title: 'Prazo indefinido', riskLevel: 'medio', description: 'O prazo não está claro.', recommendation: 'Definir prazo exato.' },
  ],
  missingClauses: [{ clause: 'LGPD', whyItMatters: 'Proteção de dados', suggestion: 'Adicionar cláusula de LGPD.' }],
  modelDivergences: [],
  suggestedAdjustments: [
    { clause: 'Foro', currentIssue: 'Ausente', suggestedText: 'Foro da comarca de São Paulo.', requiresHumanValidation: true },
  ],
  humanValidationChecklist: [{ item: 'Revisar cláusula de confidencialidade', status: 'pending' }],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
}

const meta: AnalysisMeta = {
  contractName: 'NDA Fornecedor X',
  contractType: 'NDA',
  analyzedAt: '2026-07-02T10:00:00.000Z',
}

describe('generateReportPdf', () => {
  it('produces a PDF buffer containing the mandatory disclaimer', async () => {
    const buffer = await generateReportPdf(analysis, meta)
    expect(buffer.length).toBeGreaterThan(0)
    const text = await extractTextFromPdf(buffer)
    // NOTE: brief's sample asserted 'validado' (masculine), but the fixture's
    // mandatoryDisclaimer text correctly uses 'validada' (feminine, agreeing
    // with "análise"). Corrected the assertion to match the actual fixture text.
    expect(text).toContain('validada por um profissional jurídico')
  })
})

describe('generateReportDocx', () => {
  it('produces a DOCX buffer containing the mandatory disclaimer', async () => {
    const buffer = await generateReportDocx(analysis, meta)
    expect(buffer.length).toBeGreaterThan(0)
    const text = await extractTextFromDocx(buffer)
    expect(text).toContain('validada por um profissional jurídico')
  })
})

const emptyArraysAnalysis: AnalysisResult = {
  ...analysis,
  criticalPoints: [],
  missingClauses: [],
  modelDivergences: [],
  suggestedAdjustments: [],
  humanValidationChecklist: [],
}

describe('generateReportPdf and generateReportDocx with empty optional/array fields', () => {
  it('generateReportPdf does not throw and includes the mandatory disclaimer when all arrays are empty', async () => {
    const buffer = await generateReportPdf(emptyArraysAnalysis, meta)
    expect(buffer.length).toBeGreaterThan(0)
    const text = await extractTextFromPdf(buffer)
    expect(text).toContain('validada por um profissional jurídico')
  })

  it('generateReportDocx does not throw and includes the mandatory disclaimer when all arrays are empty', async () => {
    const buffer = await generateReportDocx(emptyArraysAnalysis, meta)
    expect(buffer.length).toBeGreaterThan(0)
    const text = await extractTextFromDocx(buffer)
    expect(text).toContain('validada por um profissional jurídico')
  })
})

describe('generateReportPdf and generateReportDocx content parity', () => {
  it('produces PDF and DOCX with equivalent key facts extracted from the same fixture', async () => {
    const pdfBuffer = await generateReportPdf(analysis, meta)
    const docxBuffer = await generateReportDocx(analysis, meta)

    const pdfText = await extractTextFromPdf(pdfBuffer)
    const docxText = await extractTextFromDocx(docxBuffer)

    for (const text of [pdfText, docxText]) {
      expect(text).toContain(meta.contractName)
      expect(text).toContain(analysis.generalRisk)
      expect(text).toContain('resumo executivo de teste')
    }
  })
})
