import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const rows = db.prepare(
    `SELECT id, filename, contract_type, risk_level, summary, analyzed_at
     FROM analyses ORDER BY analyzed_at DESC LIMIT 50`
  ).all()
  return NextResponse.json(rows)
}
