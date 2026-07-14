import OpenAI from 'openai'
import { getDb } from './db'

const CHUNK_SIZE = 900
const CHUNK_OVERLAP = 120
const MIN_SIMILARITY = 0.25

export function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para
    if (candidate.length > CHUNK_SIZE && current) {
      chunks.push(current.trim())
      current = current.slice(-CHUNK_OVERLAP) + '\n\n' + para
    } else {
      current = candidate
    }
  }
  if (current.trim()) chunks.push(current.trim())

  // If no paragraph breaks, split by size
  if (chunks.length === 0 && text.trim().length > 0) {
    let i = 0
    while (i < text.length) {
      chunks.push(text.slice(i, i + CHUNK_SIZE))
      i += CHUNK_SIZE - CHUNK_OVERLAP
    }
  }

  return chunks
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  })
  return response.data[0].embedding
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export function countKbDocsForCategory(category: string): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM kb_documents WHERE category = ?').get(category) as { count: number }
  return row.count
}

export async function searchKnowledgeBase(
  queryText: string,
  category: string,
  topK = 6
): Promise<{ text: string; similarity: number; docName: string }[]> {
  const db = getDb()

  const chunks = db.prepare(`
    SELECT kc.chunk_text, kc.embedding, kd.name AS doc_name
    FROM kb_chunks kc
    JOIN kb_documents kd ON kc.doc_id = kd.id
    WHERE kd.category = ?
  `).all(category) as { chunk_text: string; embedding: string; doc_name: string }[]

  if (chunks.length === 0) return []

  const queryEmbedding = await generateEmbedding(queryText)

  const scored = chunks.map(chunk => ({
    text: chunk.chunk_text,
    docName: chunk.doc_name,
    similarity: cosineSimilarity(queryEmbedding, JSON.parse(chunk.embedding)),
  }))

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .filter(r => r.similarity > MIN_SIMILARITY)
}

export function formatKbContext(
  results: { text: string; docName: string; similarity: number }[]
): string {
  if (results.length === 0) return ''

  const docGroups = new Map<string, string[]>()
  for (const r of results) {
    if (!docGroups.has(r.docName)) docGroups.set(r.docName, [])
    docGroups.get(r.docName)!.push(r.text)
  }

  const sections = [...docGroups.entries()]
    .map(([name, texts]) => `[${name}]\n${texts.join('\n---\n')}`)
    .join('\n\n')

  return `## Base de contratos aprovados da empresa\nTrechos relevantes recuperados automaticamente:\n\n${sections}`
}
