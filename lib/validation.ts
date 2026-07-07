import {
  MAX_FILE_SIZE_MB,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from '@/types/contract'
import path from 'path'

export type ValidationError = { code: string; message: string }

export function validateFile(
  file: File,
  fieldName: string
): ValidationError | null {
  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
    return {
      code: 'INVALID_EXTENSION',
      message: `${fieldName}: apenas arquivos .pdf e .docx são aceitos.`,
    }
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return {
      code: 'INVALID_MIME',
      message: `${fieldName}: tipo de arquivo não permitido.`,
    }
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `${fieldName}: arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB.`,
    }
  }
  return null
}

export function validateUploadPayload(formData: FormData): ValidationError | null {
  const contractName = formData.get('contractName')
  const contractType = formData.get('contractType')
  const contractFile = formData.get('contractFile') as File | null
  const modelFile = formData.get('modelFile') as File | null

  if (!contractName || typeof contractName !== 'string' || !contractName.trim()) {
    return { code: 'MISSING_NAME', message: 'Nome do contrato é obrigatório.' }
  }
  if (!contractType || typeof contractType !== 'string') {
    return { code: 'MISSING_TYPE', message: 'Tipo de contrato é obrigatório.' }
  }
  if (!contractFile || contractFile.size === 0) {
    return { code: 'MISSING_CONTRACT', message: 'Arquivo do contrato é obrigatório.' }
  }
  if (!modelFile || modelFile.size === 0) {
    return { code: 'MISSING_MODEL', message: 'Arquivo do modelo aprovado é obrigatório.' }
  }

  const contractErr = validateFile(contractFile, 'Contrato')
  if (contractErr) return contractErr

  const modelErr = validateFile(modelFile, 'Modelo aprovado')
  if (modelErr) return modelErr

  return null
}
