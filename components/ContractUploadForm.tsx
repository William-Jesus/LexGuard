'use client'

import { useState, type FormEvent } from 'react'
import { CONTRACT_TYPES } from '@/types/contract'

export interface ContractUploadFormProps {
  onSubmit: (formData: FormData) => void
  isSubmitting: boolean
  errorMessage?: string
}

export function ContractUploadForm({ onSubmit, isSubmitting, errorMessage }: ContractUploadFormProps) {
  const [contractName, setContractName] = useState('')
  const [contractType, setContractType] = useState<string>(CONTRACT_TYPES[0])
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [observations, setObservations] = useState('')
  const [fileError, setFileError] = useState<string | undefined>(undefined)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!contractFile || !modelFile) {
      setFileError('Envie o contrato e o modelo aprovado antes de continuar.')
      return
    }

    setFileError(undefined)

    const formData = new FormData()
    formData.set('contractName', contractName)
    formData.set('contractType', contractType)
    formData.set('observations', observations)
    formData.set('contractFile', contractFile)
    formData.set('modelFile', modelFile)

    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="contract-upload-form">
      <div>
        <label htmlFor="contractName" className="block text-sm font-medium">
          Nome do contrato
        </label>
        <input
          id="contractName"
          type="text"
          required
          value={contractName}
          onChange={(e) => setContractName(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 p-2"
        />
      </div>

      <div>
        <label htmlFor="contractType" className="block text-sm font-medium">
          Tipo do contrato
        </label>
        <select
          id="contractType"
          value={contractType}
          onChange={(e) => setContractType(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 p-2"
        >
          {CONTRACT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contractFile" className="block text-sm font-medium">
          Contrato a ser analisado (PDF ou DOCX)
        </label>
        <input
          id="contractFile"
          type="file"
          accept=".pdf,.docx"
          aria-required="true"
          onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full"
        />
      </div>

      <div>
        <label htmlFor="modelFile" className="block text-sm font-medium">
          Modelo aprovado de referência (PDF ou DOCX)
        </label>
        <input
          id="modelFile"
          type="file"
          accept=".pdf,.docx"
          aria-required="true"
          onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full"
        />
      </div>

      <div>
        <label htmlFor="observations" className="block text-sm font-medium">
          Observações (opcional)
        </label>
        <textarea
          id="observations"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 p-2"
          rows={3}
        />
      </div>

      {(fileError || errorMessage) && (
        <p role="alert" className="text-sm text-red-600">
          {fileError ?? errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? 'Analisando...' : 'Analisar contrato'}
      </button>
    </form>
  )
}
