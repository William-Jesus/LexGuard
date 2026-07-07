import { NextRequest, NextResponse } from 'next/server'
import { validateUploadPayload } from '@/lib/validation'
import { extractText } from '@/lib/extractText'
import { analyzeContract } from '@/lib/openaiContractAnalysis'
import { EXTRACTION_ERROR_MESSAGE } from '@/types/contract'

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.', code: 'INVALID_PAYLOAD' }, { status: 400 })
  }

  const validationError = validateUploadPayload(formData)
  if (validationError) {
    return NextResponse.json({ error: validationError.message, code: validationError.code }, { status: 400 })
  }

  const contractName = formData.get('contractName') as string
  const contractType = formData.get('contractType') as string
  const observations = formData.get('observations') as string | undefined
  const contractFile = formData.get('contractFile') as File
  const modelFile = formData.get('modelFile') as File

  let contractText: string
  let modelText: string

  try {
    const contractBuffer = Buffer.from(await contractFile.arrayBuffer())
    contractText = await extractText(contractFile.name, contractBuffer)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : EXTRACTION_ERROR_MESSAGE
    return NextResponse.json({ error: msg, code: 'EXTRACTION_FAILED' }, { status: 422 })
  }

  try {
    const modelBuffer = Buffer.from(await modelFile.arrayBuffer())
    modelText = await extractText(modelFile.name, modelBuffer)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : EXTRACTION_ERROR_MESSAGE
    return NextResponse.json({ error: msg, code: 'EXTRACTION_FAILED_MODEL' }, { status: 422 })
  }

  try {
    const analysis = await analyzeContract({
      contractText,
      modelText,
      contractType,
      contractName,
      observations: observations || undefined,
    })
    return NextResponse.json({
      analysis,
      meta: { contractName, contractType, analyzedAt: new Date().toISOString() },
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_AI_RESPONSE') {
      return NextResponse.json(
        { error: 'Não foi possível gerar a análise no momento. Tente novamente.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      )
    }
    return NextResponse.json({ error: 'Erro interno. Tente novamente.', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
