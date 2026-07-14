import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()

  const total = (db.prepare('SELECT COUNT(*) as n FROM analyses').get() as { n: number }).n
  const byRisk = db.prepare(
    `SELECT risk_level, COUNT(*) as count FROM analyses GROUP BY risk_level`
  ).all() as { risk_level: string; count: number }[]

  const recent = db.prepare(
    `SELECT id, filename, contract_type, risk_level, summary, analyzed_at
     FROM analyses ORDER BY analyzed_at DESC LIMIT 10`
  ).all()

  // Top critical point categories from full_analysis JSON
  const allAnalyses = db.prepare('SELECT full_analysis FROM analyses').all() as { full_analysis: string }[]
  const categoryCount: Record<string, number> = {}
  for (const row of allAnalyses) {
    try {
      const parsed = JSON.parse(row.full_analysis)
      const points: { title?: string }[] = parsed.criticalPoints ?? []
      for (const p of points) {
        if (p.title) categoryCount[p.title] = (categoryCount[p.title] ?? 0) + 1
      }
    } catch { /* skip malformed */ }
  }
  const topIssues = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, count }))

  return NextResponse.json({ total, byRisk, recent, topIssues })
}
