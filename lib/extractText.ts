import path from 'path'
import { extractTextFromPdf } from './extractTextFromPdf'
import { extractTextFromDocx } from './extractTextFromDocx'

export async function extractText(filename: string, buffer: Buffer): Promise<string> {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.pdf') return extractTextFromPdf(buffer)
  if (ext === '.docx') return extractTextFromDocx(buffer)
  throw new Error('Formato de arquivo não suportado.')
}
