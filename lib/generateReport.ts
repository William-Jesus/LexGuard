import { ContractAnalysis, MANDATORY_DISCLAIMER } from '@/types/contract'

export async function generatePdfReport(
  analysis: ContractAnalysis,
  meta: { contractName: string; contractType: string; analyzedAt: string }
): Promise<Buffer> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer')
  const { createElement: h } = await import('react')

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#1a1a1a' },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    subtitle: { fontSize: 12, color: '#555', marginBottom: 20 },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', marginTop: 16, marginBottom: 6, color: '#1a1a1a', paddingBottom: 4 },
    text: { marginBottom: 4, lineHeight: 1.5 },
    disclaimer: { marginTop: 24, padding: 10, fontSize: 10 },
    badge: { fontSize: 10, marginBottom: 2 },
    item: { marginBottom: 8, paddingLeft: 10 },
    label: { fontWeight: 'bold', marginBottom: 2 },
    meta: { fontSize: 10, color: '#666', marginBottom: 16 },
  })

  const riskColor: Record<string, string> = { baixo: '#16a34a', medio: '#d97706', alto: '#dc2626' }

  const doc = h(Document, {},
    h(Page, { size: 'A4', style: styles.page },
      h(View, {},
        h(Text, { style: styles.title }, 'LexGuard — Análise de Contrato'),
        h(Text, { style: styles.subtitle }, `${meta.contractName} · ${meta.contractType}`),
        h(Text, { style: styles.meta }, `Gerado em: ${meta.analyzedAt}`),

        h(Text, { style: styles.disclaimer }, `AVISO: ${MANDATORY_DISCLAIMER}`),

        h(Text, { style: styles.sectionTitle }, 'Resumo Executivo'),
        h(Text, { style: styles.text }, analysis.executiveSummary),

        h(Text, { style: styles.sectionTitle }, 'Risco Geral'),
        h(Text, { style: { ...styles.badge, color: riskColor[analysis.generalRisk] ?? '#000' } }, analysis.generalRisk.toUpperCase()),

        h(Text, { style: styles.sectionTitle }, 'Dados Principais'),
        h(Text, { style: styles.text }, `Partes: ${analysis.mainData.parties.join(', ')}`),
        h(Text, { style: styles.text }, `Objeto: ${analysis.mainData.object}`),
        h(Text, { style: styles.text }, `Prazo: ${analysis.mainData.term}`),
        h(Text, { style: styles.text }, `Valor: ${analysis.mainData.value}`),
        h(Text, { style: styles.text }, `Pagamento: ${analysis.mainData.paymentTerms}`),
        h(Text, { style: styles.text }, `Rescisão: ${analysis.mainData.termination}`),
        h(Text, { style: styles.text }, `Foro: ${analysis.mainData.jurisdiction}`),

        h(Text, { style: styles.sectionTitle }, `Pontos Críticos (${analysis.criticalPoints.length})`),
        ...analysis.criticalPoints.map((cp, i) =>
          h(View, { key: String(i), style: styles.item },
            h(Text, { style: { ...styles.label, color: riskColor[cp.riskLevel] ?? '#000' } }, `${cp.title} [${cp.riskLevel}]`),
            h(Text, { style: styles.text }, cp.description),
            h(Text, { style: styles.text }, `Recomendação: ${cp.recommendation}`)
          )
        ),

        h(Text, { style: styles.sectionTitle }, `Cláusulas Ausentes (${analysis.missingClauses.length})`),
        ...analysis.missingClauses.map((mc, i) =>
          h(View, { key: String(i), style: styles.item },
            h(Text, { style: styles.label }, mc.clause),
            h(Text, { style: styles.text }, mc.whyItMatters),
            h(Text, { style: styles.text }, `Sugestão: ${mc.suggestion}`)
          )
        ),

        h(Text, { style: styles.sectionTitle }, `Divergências vs. Modelo (${analysis.modelDivergences.length})`),
        ...analysis.modelDivergences.map((md, i) =>
          h(View, { key: String(i), style: styles.item },
            h(Text, { style: styles.label }, md.topic),
            h(Text, { style: styles.text }, `Diferença: ${md.difference}`),
            h(Text, { style: styles.text }, `Recomendação: ${md.recommendation}`)
          )
        ),

        h(Text, { style: styles.sectionTitle }, 'Checklist de Validação Humana'),
        ...analysis.humanValidationChecklist.map((item, i) =>
          h(Text, { key: String(i), style: styles.text }, `[ ] ${item.item}`)
        ),
      )
    )
  )

  const stream = await pdf(doc).toBuffer()
  // @react-pdf/renderer v4 toBuffer() returns ReadableStream in some envs
  if (stream instanceof Buffer) return stream
  // Consume ReadableStream → Buffer
  const reader = (stream as unknown as ReadableStream<Uint8Array>).getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return Buffer.from(result)
}

export async function generateDocxReport(
  analysis: ContractAnalysis,
  meta: { contractName: string; contractType: string; analyzedAt: string }
): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

  const riskLabel: Record<string, string> = { baixo: 'BAIXO', medio: 'MÉDIO', alto: 'ALTO' }
  const riskColor: Record<string, string> = { baixo: '166534', medio: '92400E', alto: '991B1B' }

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'LexGuard — Análise de Contrato', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text: `${meta.contractName} · ${meta.contractType}`, italics: true })] }),
        new Paragraph({ children: [new TextRun({ text: `Gerado em: ${meta.analyzedAt}`, size: 20, color: '666666' })] }),
        new Paragraph({}),
        new Paragraph({
          children: [new TextRun({ text: `AVISO: ${MANDATORY_DISCLAIMER}`, bold: true, color: '92400E' })]
        }),
        new Paragraph({}),

        new Paragraph({ text: 'Resumo Executivo', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: analysis.executiveSummary }),
        new Paragraph({}),

        new Paragraph({ text: 'Risco Geral', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: riskLabel[analysis.generalRisk] ?? analysis.generalRisk, bold: true, color: riskColor[analysis.generalRisk] ?? '000000' })] }),
        new Paragraph({}),

        new Paragraph({ text: 'Dados Principais', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: 'Partes: ', bold: true }), new TextRun(analysis.mainData.parties.join(', '))] }),
        new Paragraph({ children: [new TextRun({ text: 'Objeto: ', bold: true }), new TextRun(analysis.mainData.object)] }),
        new Paragraph({ children: [new TextRun({ text: 'Prazo: ', bold: true }), new TextRun(analysis.mainData.term)] }),
        new Paragraph({ children: [new TextRun({ text: 'Valor: ', bold: true }), new TextRun(analysis.mainData.value)] }),
        new Paragraph({ children: [new TextRun({ text: 'Rescisão: ', bold: true }), new TextRun(analysis.mainData.termination)] }),
        new Paragraph({ children: [new TextRun({ text: 'Foro: ', bold: true }), new TextRun(analysis.mainData.jurisdiction)] }),
        new Paragraph({}),

        new Paragraph({ text: `Pontos Críticos (${analysis.criticalPoints.length})`, heading: HeadingLevel.HEADING_2 }),
        ...analysis.criticalPoints.flatMap(cp => [
          new Paragraph({ children: [new TextRun({ text: `${cp.title} [${cp.riskLevel.toUpperCase()}]`, bold: true, color: riskColor[cp.riskLevel] ?? '000000' })] }),
          new Paragraph({ text: cp.description }),
          new Paragraph({ children: [new TextRun({ text: 'Recomendação: ', bold: true }), new TextRun(cp.recommendation)] }),
          new Paragraph({}),
        ]),

        new Paragraph({ text: `Cláusulas Ausentes (${analysis.missingClauses.length})`, heading: HeadingLevel.HEADING_2 }),
        ...analysis.missingClauses.flatMap(mc => [
          new Paragraph({ children: [new TextRun({ text: mc.clause, bold: true })] }),
          new Paragraph({ text: mc.whyItMatters }),
          new Paragraph({ children: [new TextRun({ text: 'Sugestão: ', bold: true }), new TextRun(mc.suggestion)] }),
          new Paragraph({}),
        ]),

        new Paragraph({ text: `Divergências vs. Modelo (${analysis.modelDivergences.length})`, heading: HeadingLevel.HEADING_2 }),
        ...analysis.modelDivergences.flatMap(md => [
          new Paragraph({ children: [new TextRun({ text: md.topic, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: 'Diferença: ', bold: true }), new TextRun(md.difference)] }),
          new Paragraph({ children: [new TextRun({ text: 'Recomendação: ', bold: true }), new TextRun(md.recommendation)] }),
          new Paragraph({}),
        ]),

        new Paragraph({ text: 'Checklist de Validação Humana', heading: HeadingLevel.HEADING_2 }),
        ...analysis.humanValidationChecklist.map(item =>
          new Paragraph({ children: [new TextRun({ text: `[ ] ${item.item}` })] })
        ),
      ]
    }]
  })

  return Packer.toBuffer(doc)
}
