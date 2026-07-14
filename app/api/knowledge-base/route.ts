import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { extractText } from '@/lib/extractText'
import { chunkText, generateEmbedding, countKbDocsForCategory } from '@/lib/rag'

export async function GET(req: NextRequest) {
  const db = getDb()
  const category = req.nextUrl.searchParams.get('category')
  const countOnly = req.nextUrl.searchParams.get('count') === 'true'

  if (countOnly && category) {
    return NextResponse.json({ count: countKbDocsForCategory(category) })
  }

  const rows = category
    ? db.prepare('SELECT id, name, category, filename, chunk_count, uploaded_at FROM kb_documents WHERE category = ? ORDER BY uploaded_at DESC').all(category)
    : db.prepare('SELECT id, name, category, filename, chunk_count, uploaded_at FROM kb_documents ORDER BY category, uploaded_at DESC').all()

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
  const category = (formData.get('category') as string)?.trim()
  const file = formData.get('file') as File | null

  if (!name || !category || !file) {
    return NextResponse.json({ error: 'Nome, categoria e arquivo são obrigatórios.' }, { status: 400 })
  }

  let text: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    text = await extractText(file.name, buffer)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao extrair texto do arquivo.'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  if (text.trim().length < 50) {
    return NextResponse.json({ error: 'Arquivo muito curto ou sem texto extraível.' }, { status: 422 })
  }

  const chunks = chunkText(text)

  const db = getDb()
  const insertDoc = db.prepare(
    'INSERT INTO kb_documents (name, category, filename, chunk_count) VALUES (?, ?, ?, ?)'
  )
  const insertChunk = db.prepare(
    'INSERT INTO kb_chunks (doc_id, chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?)'
  )

  try {
    // Generate all embeddings first (async), then insert in a sync transaction
    const embeddings: number[][] = []
    for (let i = 0; i < chunks.length; i++) {
      embeddings.push(await generateEmbedding(chunks[i]))
    }

    const insertAll = db.transaction(() => {
      const docResult = insertDoc.run(name, category, file.name, chunks.length)
      const docId = docResult.lastInsertRowid as number
      for (let i = 0; i < chunks.length; i++) {
        insertChunk.run(docId, i, chunks[i], JSON.stringify(embeddings[i]))
      }
      return docId
    })

    const docId = insertAll()
    return NextResponse.json({ id: docId, name, category, chunkCount: chunks.length }, { status: 201 })
  } catch (err) {
    console.error('[KB] Error saving document:', err)
    return NextResponse.json({ error: 'Erro ao processar documento.' }, { status: 500 })
  }
}
