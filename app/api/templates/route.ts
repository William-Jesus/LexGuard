import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { extractText } from '@/lib/extractText'

export async function GET() {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, filename, uploaded_at FROM templates ORDER BY uploaded_at DESC').all()
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
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

  let content: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    content = await extractText(file.name, buffer)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao extrair texto do arquivo.'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const db = getDb()
  const result = db.prepare(
    `INSERT INTO templates (name, filename, content) VALUES (?, ?, ?)`
  ).run(name, file.name, content)

  return NextResponse.json({ id: result.lastInsertRowid, name, filename: file.name })
}
