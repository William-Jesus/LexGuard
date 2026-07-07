'use client'
import { useState, useRef } from 'react'
import { CONTRACT_TYPES, ContractAnalysis } from '@/types/contract'

interface Props {
  onResult: (result: {
    analysis: ContractAnalysis
    meta: { contractName: string; contractType: string; analyzedAt: string }
  }) => void
}

export function ContractUploadForm({ onResult }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const res = await fetch('/api/analyze-contract', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro desconhecido. Tente novamente.')
        return
      }

      onResult(data)
    } catch {
      setError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div>
        <label htmlFor="contractName" className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Contrato <span className="text-red-500">*</span>
        </label>
        <input
          id="contractName"
          name="contractName"
          type="text"
          required
          placeholder="ex: Contrato de Prestação de Serviços - Acme Ltda"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Contrato <span className="text-red-500">*</span>
        </label>
        <select
          id="contractType"
          name="contractType"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Selecione o tipo...</option>
          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="contractFile" className="block text-sm font-medium text-gray-700 mb-1">
          Contrato a Revisar <span className="text-red-500">*</span>
          <span className="text-gray-400 font-normal ml-1">(PDF ou DOCX, máx. 10MB)</span>
        </label>
        <input
          id="contractFile"
          name="contractFile"
          type="file"
          accept=".pdf,.docx"
          required
          className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>

      <div>
        <label htmlFor="modelFile" className="block text-sm font-medium text-gray-700 mb-1">
          Modelo Aprovado <span className="text-red-500">*</span>
          <span className="text-gray-400 font-normal ml-1">(PDF ou DOCX, máx. 10MB)</span>
        </label>
        <input
          id="modelFile"
          name="modelFile"
          type="file"
          accept=".pdf,.docx"
          required
          className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>

      <div>
        <label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-1">
          Observações <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="observations"
          name="observations"
          rows={3}
          placeholder="Contexto adicional, pontos de atenção específicos..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analisando...
          </span>
        ) : 'Analisar Contrato'}
      </button>
    </form>
  )
}
