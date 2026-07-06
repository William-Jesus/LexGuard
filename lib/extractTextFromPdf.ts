import { PDFParse } from 'pdf-parse'
// pdf-parse (via pdfjs-dist) resolves its Node.js "fake worker" by dynamically
// importing a relative path (`./pdf.worker.mjs`) at runtime. Next.js's server
// bundler (Turbopack, in both `next dev` and `next build`) rewrites that dynamic
// import target into a bundle chunk path that doesn't exist, causing
// `Setting up fake worker failed: "Cannot find module ...pdf.worker.mjs"`.
// pdfjs-dist checks `globalThis.pdfjsWorker` for a pre-loaded worker module
// before attempting that dynamic import. The worker module itself sets
// `globalThis.pdfjsWorker` as a side effect when loaded, so importing it here
// (statically, which Turbopack bundles correctly unlike the dynamic import)
// short-circuits the broken code path entirely.
import 'pdfjs-dist/legacy/build/pdf.worker.mjs'

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
