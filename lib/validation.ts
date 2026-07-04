export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'] as const
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export type ValidationErrorCode =
  | 'FILE_MISSING'
  | 'FILE_TOO_LARGE'
  | 'INVALID_EXTENSION'
  | 'INVALID_MIME_TYPE'

export interface ValidationError {
  code: ValidationErrorCode
  message: string
}

export type ValidationResult = { valid: true } | { valid: false; error: ValidationError }

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot === -1 ? '' : fileName.slice(lastDot).toLowerCase()
}

export function getMaxFileSizeBytes(): number {
  const mb = Number(process.env.MAX_FILE_SIZE_MB ?? '10')
  return mb * 1024 * 1024
}

export function validateUploadedFile(file: File | null, label: string): ValidationResult {
  if (!file) {
    return { valid: false, error: { code: 'FILE_MISSING', message: `Envie o arquivo: ${label}.` } }
  }

  const extension = getExtension(file.name)
  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    return {
      valid: false,
      error: {
        code: 'INVALID_EXTENSION',
        message: `Formato inválido para ${label}. Envie um arquivo PDF ou DOCX.`,
      },
    }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_MIME_TYPE',
        message: `Tipo de arquivo inválido para ${label}. Envie um arquivo PDF ou DOCX.`,
      },
    }
  }

  if (file.size > getMaxFileSizeBytes()) {
    return {
      valid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `${label} excede o tamanho máximo permitido de ${process.env.MAX_FILE_SIZE_MB ?? '10'}MB.`,
      },
    }
  }

  return { valid: true }
}
