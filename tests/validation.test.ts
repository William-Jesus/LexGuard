import { describe, it, expect } from 'vitest'
import { validateFile, validateUploadPayload } from '@/lib/validation'

function makeFile(name: string, type: string, sizeKb: number): File {
  const content = new Uint8Array(sizeKb * 1024)
  return new File([content], name, { type })
}

describe('validateFile', () => {
  it('accepts valid pdf', () => {
    expect(validateFile(makeFile('c.pdf', 'application/pdf', 100), 'Contrato')).toBeNull()
  })
  it('accepts valid docx', () => {
    expect(
      validateFile(
        makeFile('c.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 100),
        'Contrato'
      )
    ).toBeNull()
  })
  it('rejects invalid extension', () => {
    const err = validateFile(makeFile('c.txt', 'text/plain', 10), 'Contrato')
    expect(err?.code).toBe('INVALID_EXTENSION')
  })
  it('rejects file above size limit', () => {
    const err = validateFile(makeFile('c.pdf', 'application/pdf', 11 * 1024), 'Contrato')
    expect(err?.code).toBe('FILE_TOO_LARGE')
  })
})

describe('validateUploadPayload', () => {
  it('returns error if contractName is missing', () => {
    const fd = new FormData()
    fd.set('contractType', 'NDA')
    fd.set('contractFile', makeFile('a.pdf', 'application/pdf', 100))
    fd.set('modelFile', makeFile('b.pdf', 'application/pdf', 100))
    expect(validateUploadPayload(fd)?.code).toBe('MISSING_NAME')
  })
  it('returns null for valid payload', () => {
    const fd = new FormData()
    fd.set('contractName', 'Test')
    fd.set('contractType', 'NDA')
    fd.set('contractFile', makeFile('a.pdf', 'application/pdf', 100))
    fd.set('modelFile', makeFile('b.pdf', 'application/pdf', 100))
    expect(validateUploadPayload(fd)).toBeNull()
  })
})
