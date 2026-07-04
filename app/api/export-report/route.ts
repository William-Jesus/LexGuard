import { NextResponse } from 'next/server'
import { AnalysisResultSchema, CONTRACT_TYPES, type ContractType } from '@/types/contract'
import { generateReportPdf, generateReportDocx } from '@/lib/generateReport'

const CONTENT_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

export async function POST(request: Request) {
  const url = new URL(request.url)
  const format = url.searchParams.get('format')

  if (format !== 'pdf' && format !== 'docx') {
    return NextResponse.json({ error: 'Formato de exportação inválido.', code: 'INVALID_FORMAT' }, { status: 400 })
  }

  const body = await request.json()
  const analysisResult = AnalysisResultSchema.safeParse(body.analysis)

  if (!analysisResult.success) {
    return NextResponse.json({ error: 'Dados da análise inválidos.', code: 'INVALID_ANALYSIS' }, { status: 400 })
  }

  const meta = body.meta
  if (
    !meta ||
    typeof meta.contractName !== 'string' ||
    !CONTRACT_TYPES.includes(meta.contractType as ContractType) ||
    typeof meta.analyzedAt !== 'string'
  ) {
    return NextResponse.json({ error: 'Metadados do relatório inválidos.', code: 'INVALID_META' }, { status: 400 })
  }

  const buffer =
    format === 'pdf'
      ? await generateReportPdf(analysisResult.data, meta)
      : await generateReportDocx(analysisResult.data, meta)

  const fileName = `relatorio-${meta.contractName.replace(/[^a-zA-Z0-9-_]+/g, '_')}.${format}`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': CONTENT_TYPES[format],
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
