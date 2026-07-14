import { NextRequest, NextResponse } from 'next/server'
import { ContractAnalysisSchema } from '@/types/contract'
import { generatePdfReport, generateDocxReport } from '@/lib/generateReport'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')
  if (format !== 'pdf' && format !== 'docx') {
    return NextResponse.json({ error: 'format deve ser pdf ou docx', code: 'INVALID_FORMAT' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido', code: 'INVALID_BODY' }, { status: 400 })
  }

  const { analysis, meta } = body as {
    analysis: unknown
    meta: { contractName: string; contractType: string; analyzedAt: string }
  }
  const validated = ContractAnalysisSchema.safeParse(analysis)
  if (!validated.success) {
    return NextResponse.json({ error: 'Dados de análise inválidos', code: 'INVALID_ANALYSIS' }, { status: 400 })
  }

  try {
    if (format === 'pdf') {
      const buffer = await generatePdfReport(validated.data, meta)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="lexguard-${meta.contractName.replace(/\s+/g, '-')}.pdf"`,
        },
      })
    } else {
      const buffer = await generateDocxReport(validated.data, meta)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="lexguard-${meta.contractName.replace(/\s+/g, '-')}.docx"`,
        },
      })
    }
  } catch (err) {
    console.error('[LexGuard] export error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erro ao gerar relatório.', code: 'EXPORT_ERROR' }, { status: 500 })
  }
}
