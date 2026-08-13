import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { extractText } from '@/lib/extractText'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET() {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, filename, uploaded_at FROM templates ORDER BY uploaded_at DESC').all()
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 10 * 60 * 1000, 10)) {
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em 10 minutos.' }, { status: 429 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const name = (formData.get('name') as string)?.trim()
  const file = formData.get('file') as File | null

  if (!name || !file) {
    return NextResponse.json({ error: 'name e file são obrigatórios.' }, { status: 400 })
  }
  if (name.length > 200) {
    return NextResponse.json({ error: 'Nome muito longo (máx. 200 caracteres).' }, { status: 400 })
  }

  let content: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    content = await extractText(file.name, buffer)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao extrair texto do arquivo.'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const safeFilename = file.name.replace(/[^\w\-. ]/g, '_').slice(0, 255)
  const db = getDb()
  const result = db.prepare(
    `INSERT INTO templates (name, filename, content) VALUES (?, ?, ?)`
  ).run(name, safeFilename, content)

  return NextResponse.json({ id: result.lastInsertRowid, name, filename: file.name })
}
