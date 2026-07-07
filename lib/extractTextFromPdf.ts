import { EXTRACTION_ERROR_MESSAGE } from '@/types/contract'

const MIN_TEXT_LENGTH = 50

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import('pdf-parse') as any
  const pdfParse = mod.default ?? mod
  const data = await pdfParse(buffer)
  const text = data.text?.trim() ?? ''
  if (text.length < MIN_TEXT_LENGTH) {
    throw new Error(EXTRACTION_ERROR_MESSAGE)
  }
  return text
}
