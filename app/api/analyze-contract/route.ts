import { NextRequest, NextResponse } from 'next/server'
import { validateUploadPayload } from '@/lib/validation'
import { extractText } from '@/lib/extractText'
import { analyzeContract } from '@/lib/openaiContractAnalysis'
import { EXTRACTION_ERROR_MESSAGE } from '@/types/contract'
import { getDb } from '@/lib/db'
import { searchKnowledgeBase, formatKbContext, countKbDocsForCategory } from '@/lib/rag'

const MAX_ESTIMATED_TOKENS = 100_000
const PROMPT_INJECTION_PATTERN = /ignore\s+(previous|all|prior)\s+instructions?|<\s*system\s*>|system\s*:/i

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX = 5

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_MAX) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em 15 minutos.', code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

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
  const rawObservations = formData.get('observations') as string | undefined
  const observations = rawObservations && PROMPT_INJECTION_PATTERN.test(rawObservations)
    ? undefined
    : rawObservations
  const contractFile = formData.get('contractFile') as File
  const templateId = formData.get('templateId') as string | null

  let contractText: string
  try {
    const contractBuffer = Buffer.from(await contractFile.arrayBuffer())
    contractText = await extractText(contractFile.name, contractBuffer)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : EXTRACTION_ERROR_MESSAGE
    return NextResponse.json({ error: msg, code: 'EXTRACTION_FAILED' }, { status: 422 })
  }

  let modelText: string | undefined
  let kbContext: string | undefined

  if (templateId) {
    const db = getDb()
    const tmpl = db.prepare('SELECT content FROM templates WHERE id = ?').get(Number(templateId)) as { content: string } | undefined
    if (!tmpl) return NextResponse.json({ error: 'Template não encontrado.', code: 'TEMPLATE_NOT_FOUND' }, { status: 404 })
    modelText = tmpl.content
  }

  // Always search KB if available — enriches both template and KB-only flows
  const kbCount = countKbDocsForCategory(contractType)
  if (kbCount > 0) {
    try {
      const results = await searchKnowledgeBase(contractText.slice(0, 3000), contractType, templateId ? 3 : 6)
      if (results.length > 0) {
        kbContext = formatKbContext(results)
        console.log(`[LexGuard] KB search: category=${contractType} | docs=${kbCount} | results=${results.length}`)
      }
    } catch (err) {
      console.error('[LexGuard] KB search failed:', err)
      if (!modelText) {
        return NextResponse.json({ error: 'Erro ao buscar base de conhecimento.', code: 'KB_SEARCH_FAILED' }, { status: 500 })
      }
    }
  }

  if (!modelText && !kbContext) {
    return NextResponse.json(
      { error: 'Adicione documentos à base de conhecimento para esta categoria antes de analisar.', code: 'MISSING_MODEL' },
      { status: 400 }
    )
  }

  const refLength = (modelText?.length ?? 0) + (kbContext?.length ?? 0)
  const estimatedTokens = Math.ceil((contractText.length + refLength) / 4)
  if (estimatedTokens > MAX_ESTIMATED_TOKENS) {
    return NextResponse.json(
      { error: 'Contrato muito longo para análise. Reduza o documento e tente novamente.', code: 'CONTENT_TOO_LARGE' },
      { status: 413 }
    )
  }

  try {
    const analysis = await analyzeContract({
      contractText,
      modelText,
      kbContext,
      contractType,
      contractName,
      observations: observations || undefined,
    })

    const analyzedAt = new Date().toISOString()
    try {
      getDb().prepare(
        `INSERT INTO analyses (filename, contract_type, risk_level, summary, full_analysis, analyzed_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(contractFile.name, contractType, analysis.generalRisk, analysis.executiveSummary, JSON.stringify(analysis), analyzedAt)
    } catch (dbErr) {
      console.error('[LexGuard] failed to save analysis to db:', dbErr)
    }

    return NextResponse.json({
      analysis,
      meta: { contractName, contractType, analyzedAt },
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('INVALID_AI_RESPONSE')) {
      return NextResponse.json(
        { error: 'Não foi possível gerar a análise no momento. Tente novamente.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      )
    }
    return NextResponse.json({ error: 'Erro interno. Tente novamente.', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
