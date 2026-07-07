import mammoth from 'mammoth'
import { EXTRACTION_ERROR_MESSAGE } from '@/types/contract'

const MIN_TEXT_LENGTH = 50

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  const text = result.value?.trim() ?? ''
  if (text.length < MIN_TEXT_LENGTH) {
    throw new Error(EXTRACTION_ERROR_MESSAGE)
  }
  return text
}
