import { describe, it, expect, afterEach } from 'vitest'
import { validateUploadedFile } from '@/lib/validation'

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes)
  return new File([content], name, { type })
}

describe('validateUploadedFile', () => {
  afterEach(() => {
    delete process.env.MAX_FILE_SIZE_MB
  })

  it('returns invalid when file is missing', () => {
    const result = validateUploadedFile(null, 'contrato')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error.code).toBe('FILE_MISSING')
  })

  it('returns invalid for a disallowed extension', () => {
    const file = makeFile('contrato.txt', 'text/plain', 100)
    const result = validateUploadedFile(file, 'contrato')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error.code).toBe('INVALID_EXTENSION')
  })

  it('returns invalid when file exceeds MAX_FILE_SIZE_MB', () => {
    process.env.MAX_FILE_SIZE_MB = '1'
    const file = makeFile('contrato.pdf', 'application/pdf', 2 * 1024 * 1024)
    const result = validateUploadedFile(file, 'contrato')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error.code).toBe('FILE_TOO_LARGE')
  })

  it('returns valid for an allowed PDF within size limit', () => {
    const file = makeFile('contrato.pdf', 'application/pdf', 1024)
    const result = validateUploadedFile(file, 'contrato')
    expect(result.valid).toBe(true)
  })

  it('returns valid for an allowed DOCX within size limit', () => {
    const file = makeFile(
      'contrato.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      1024
    )
    const result = validateUploadedFile(file, 'contrato')
    expect(result.valid).toBe(true)
  })
})
