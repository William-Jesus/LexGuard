import { NextResponse } from 'next/server'
import { validateUploadedFile } from '@/lib/validation'
import { extractTextFromPdf, PdfTextExtractionError } from '@/lib/extractTextFromPdf'
import { extractTextFromDocx, DocxTextExtractionError } from '@/lib/extractTextFromDocx'
import { analyzeContract, AiAnalysisError } from '@/lib/openaiContractAnalysis'
import { CONTRACT_TYPES, type ContractType } from '@/types/contract'

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const isDocx = file.name.toLowerCase().endsWith('.docx')
  return isDocx ? extractTextFromDocx(buffer) : extractTextFromPdf(buffer)
}

export async function POST(request: Request) {
  const formData = await request.formData()

  const contractName = String(formData.get('contractName') ?? '').trim()
  const contractTypeRaw = String(formData.get('contractType') ?? '')
  const observations = String(formData.get('observations') ?? '')
  const contractFile = formData.get('contractFile') as File | null
  const modelFile = formData.get('modelFile') as File | null

  if (!contractName) {
    return NextResponse.json(
      { error: 'Informe o nome do contrato.', code: 'CONTRACT_NAME_MISSING' },
      { status: 400 }
    )
  }

  if (!CONTRACT_TYPES.includes(contractTypeRaw as ContractType)) {
    return NextResponse.json(
      { error: 'Tipo de contrato inválido.', code: 'INVALID_CONTRACT_TYPE' },
      { status: 400 }
    )
  }
  const contractType = contractTypeRaw as ContractType

  const contractValidation = validateUploadedFile(contractFile, 'contrato')
  if (!contractValidation.valid) {
    return NextResponse.json(
      { error: contractValidation.error.message, code: contractValidation.error.code },
      { status: 400 }
    )
  }

  const modelValidation = validateUploadedFile(modelFile, 'modelo aprovado')
  if (!modelValidation.valid) {
    return NextResponse.json(
      { error: modelValidation.error.message, code: modelValidation.error.code },
      { status: 400 }
    )
  }

  let contractText: string
  let modelText: string
  try {
    contractText = await extractText(contractFile as File)
    modelText = await extractText(modelFile as File)
  } catch (error) {
    if (error instanceof PdfTextExtractionError || error instanceof DocxTextExtractionError) {
      return NextResponse.json({ error: error.message, code: 'TEXT_EXTRACTION_FAILED' }, { status: 422 })
    }
    throw error
  }

  const startedAt = Date.now()
  try {
    const analysis = await analyzeContract({ contractText, modelText, contractType, observations })

    console.log(
      JSON.stringify({
        event: 'contract_analysis_succeeded',
        contractType,
        generalRisk: analysis.generalRisk,
        durationMs: Date.now() - startedAt,
      })
    )

    return NextResponse.json({
      analysis,
      meta: {
        contractName,
        contractType,
        analyzedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.log(
      JSON.stringify({
        event: 'contract_analysis_failed',
        contractType,
        durationMs: Date.now() - startedAt,
      })
    )

    if (error instanceof AiAnalysisError) {
      return NextResponse.json(
        { error: 'Não foi possível gerar a análise no momento. Tente novamente.', code: 'AI_ANALYSIS_FAILED' },
        { status: 502 }
      )
    }
    throw error
  }
}
