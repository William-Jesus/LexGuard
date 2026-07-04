import { describe, it, expect } from 'vitest'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { extractTextFromDocx, DocxTextExtractionError } from '@/lib/extractTextFromDocx'

async function buildDocxBuffer(text: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: text
          ? [new Paragraph({ children: [new TextRun(text)] })]
          : [new Paragraph({ children: [] })],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

describe('extractTextFromDocx', () => {
  it('extracts text from a DOCX with content', async () => {
    const buffer = await buildDocxBuffer('Hello World from a real contract clause about confidentiality.')
    const text = await extractTextFromDocx(buffer)
    expect(text).toContain('Hello World from a real contract clause about confidentiality.')
  })

  it('throws DocxTextExtractionError for a DOCX with no meaningful content', async () => {
    const buffer = await buildDocxBuffer('')
    await expect(extractTextFromDocx(buffer)).rejects.toThrow(DocxTextExtractionError)
  })
})
