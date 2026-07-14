import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(Number(id))
  if (!row) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const analysis = row as { full_analysis: string; [key: string]: unknown }
  return NextResponse.json({ ...analysis, full_analysis: JSON.parse(analysis.full_analysis) })
}
