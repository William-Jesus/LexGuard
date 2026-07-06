import React from 'react'
import { renderToBuffer, Document as PdfDocument, Page, Text, StyleSheet } from '@react-pdf/renderer'
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel } from 'docx'
import type { AnalysisResult, AnalysisMeta } from '@/types/contract'
import { MANDATORY_DISCLAIMER } from '@/types/contract'

const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  heading: { fontSize: 16, marginBottom: 8, marginTop: 16 },
  subheading: { fontSize: 13, marginBottom: 4, marginTop: 12 },
  text: { marginBottom: 4 },
  disclaimer: { marginTop: 24, fontSize: 10, fontStyle: 'italic' },
})

function ReportPdfDocument({ analysis, meta }: { analysis: AnalysisResult; meta: AnalysisMeta }) {
  return React.createElement(
    PdfDocument,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: pdfStyles.page },
      React.createElement(Text, { style: pdfStyles.heading }, `Relatório de Análise: ${meta.contractName}`),
      React.createElement(Text, { style: pdfStyles.text }, `Tipo de contrato: ${meta.contractType}`),
      React.createElement(Text, { style: pdfStyles.text }, `Data da análise: ${meta.analyzedAt}`),
      React.createElement(Text, { style: pdfStyles.text }, `Risco geral: ${analysis.generalRisk}`),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Resumo executivo'),
      React.createElement(Text, { style: pdfStyles.text }, analysis.executiveSummary),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Pontos críticos'),
      ...analysis.criticalPoints.map((point, i) =>
        React.createElement(
          Text,
          { key: `critical-${i}`, style: pdfStyles.text },
          `${point.title} (${point.riskLevel}): ${point.description} — Recomendação: ${point.recommendation}`
        )
      ),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Cláusulas ausentes'),
      ...analysis.missingClauses.map((clause, i) =>
        React.createElement(
          Text,
          { key: `missing-${i}`, style: pdfStyles.text },
          `${clause.clause}: ${clause.whyItMatters} — Sugestão: ${clause.suggestion}`
        )
      ),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Divergências em relação ao modelo aprovado'),
      ...analysis.modelDivergences.map((divergence, i) =>
        React.createElement(
          Text,
          { key: `divergence-${i}`, style: pdfStyles.text },
          `${divergence.topic}: ${divergence.difference} — Recomendação: ${divergence.recommendation}`
        )
      ),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Sugestões de ajuste (pendentes de validação humana)'),
      ...analysis.suggestedAdjustments.map((adjustment, i) =>
        React.createElement(
          Text,
          { key: `adjustment-${i}`, style: pdfStyles.text },
          `${adjustment.clause}: ${adjustment.currentIssue} — Sugestão: ${adjustment.suggestedText}`
        )
      ),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Checklist para validação humana'),
      ...analysis.humanValidationChecklist.map((item, i) =>
        React.createElement(Text, { key: `checklist-${i}`, style: pdfStyles.text }, `[ ] ${item.item}`)
      ),

      React.createElement(Text, { style: pdfStyles.disclaimer }, MANDATORY_DISCLAIMER)
    )
  )
}

export async function generateReportPdf(analysis: AnalysisResult, meta: AnalysisMeta): Promise<Buffer> {
  return renderToBuffer(React.createElement(ReportPdfDocument, { analysis, meta }) as any)
}

export async function generateReportDocx(analysis: AnalysisResult, meta: AnalysisMeta): Promise<Buffer> {
  const paragraphs: Paragraph[] = [
    new Paragraph({ text: `Relatório de Análise: ${meta.contractName}`, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Tipo de contrato: ${meta.contractType}` }),
    new Paragraph({ text: `Data da análise: ${meta.analyzedAt}` }),
    new Paragraph({ text: `Risco geral: ${analysis.generalRisk}` }),

    new Paragraph({ text: 'Resumo executivo', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: analysis.executiveSummary }),

    new Paragraph({ text: 'Pontos críticos', heading: HeadingLevel.HEADING_2 }),
    ...analysis.criticalPoints.map(
      (point) =>
        new Paragraph({
          text: `${point.title} (${point.riskLevel}): ${point.description} — Recomendação: ${point.recommendation}`,
        })
    ),

    new Paragraph({ text: 'Cláusulas ausentes', heading: HeadingLevel.HEADING_2 }),
    ...analysis.missingClauses.map(
      (clause) => new Paragraph({ text: `${clause.clause}: ${clause.whyItMatters} — Sugestão: ${clause.suggestion}` })
    ),

    new Paragraph({ text: 'Divergências em relação ao modelo aprovado', heading: HeadingLevel.HEADING_2 }),
    ...analysis.modelDivergences.map(
      (divergence) =>
        new Paragraph({
          text: `${divergence.topic}: ${divergence.difference} — Recomendação: ${divergence.recommendation}`,
        })
    ),

    new Paragraph({ text: 'Sugestões de ajuste (pendentes de validação humana)', heading: HeadingLevel.HEADING_2 }),
    ...analysis.suggestedAdjustments.map(
      (adjustment) =>
        new Paragraph({
          text: `${adjustment.clause}: ${adjustment.currentIssue} — Sugestão: ${adjustment.suggestedText}`,
        })
    ),

    new Paragraph({ text: 'Checklist para validação humana', heading: HeadingLevel.HEADING_2 }),
    ...analysis.humanValidationChecklist.map((item) => new Paragraph({ text: `[ ] ${item.item}` })),

    new Paragraph({ text: MANDATORY_DISCLAIMER }),
  ]

  const doc = new DocxDocument({ sections: [{ children: paragraphs }] })
  return Packer.toBuffer(doc)
}
