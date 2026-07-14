import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = getDb()
  const doc = db.prepare('SELECT id FROM kb_documents WHERE id = ?').get(Number(id))
  if (!doc) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  }
  db.prepare('DELETE FROM kb_documents WHERE id = ?').run(Number(id))
  return NextResponse.json({ ok: true })
}
