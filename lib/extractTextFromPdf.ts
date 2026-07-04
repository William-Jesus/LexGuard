import { PDFParse } from 'pdf-parse'

export const MIN_EXTRACTABLE_CHARS = 20

export class PdfTextExtractionError extends Error {
  constructor() {
    super(
      'Não foi possível extrair o texto deste arquivo. Envie um PDF com texto selecionável ou um arquivo DOCX.'
    )
    this.name = 'PdfTextExtractionError'
  }
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })

  try {
    const { text } = await parser.getText()
    const trimmed = text.trim()

    if (trimmed.length < MIN_EXTRACTABLE_CHARS) {
      throw new PdfTextExtractionError()
    }

    return trimmed
  } finally {
    await parser.destroy()
  }
}
