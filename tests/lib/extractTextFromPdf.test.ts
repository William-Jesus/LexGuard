import { describe, it, expect } from 'vitest'
import { extractTextFromPdf, PdfTextExtractionError } from '@/lib/extractTextFromPdf'

const PDF_WITH_TEXT = `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /MediaBox [0 0 600 200] /Contents 4 0 R >> endobj
4 0 obj << /Length 63 >>
stream
BT /F1 18 Tf 10 100 Td (Hello World from a real contract) Tj ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
trailer << /Root 1 0 R /Size 6 >>
%%EOF`

const PDF_WITHOUT_TEXT = `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 200 200] /Contents 4 0 R >> endobj
4 0 obj << /Length 0 >>
stream
endstream
endobj
trailer << /Root 1 0 R /Size 5 >>
%%EOF`

describe('extractTextFromPdf', () => {
  it('extracts text from a PDF with selectable text', async () => {
    const buffer = Buffer.from(PDF_WITH_TEXT, 'binary')
    const text = await extractTextFromPdf(buffer)
    expect(text).toContain('Hello World from a real contract')
  })

  it('throws PdfTextExtractionError for a PDF with no extractable text', async () => {
    const buffer = Buffer.from(PDF_WITHOUT_TEXT, 'binary')
    await expect(extractTextFromPdf(buffer)).rejects.toThrow(PdfTextExtractionError)
  })
})
