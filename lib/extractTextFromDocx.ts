import mammoth from 'mammoth'

export const MIN_EXTRACTABLE_CHARS = 20

export class DocxTextExtractionError extends Error {
  constructor() {
    super(
      'Não foi possível extrair o texto deste arquivo. Envie um PDF com texto selecionável ou um arquivo DOCX.'
    )
    this.name = 'DocxTextExtractionError'
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer })
  const trimmed = value.trim()

  if (trimmed.length < MIN_EXTRACTABLE_CHARS) {
    throw new DocxTextExtractionError()
  }

  return trimmed
}
