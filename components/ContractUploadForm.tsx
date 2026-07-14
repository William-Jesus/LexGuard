'use client'
import { useState, useEffect } from 'react'
import { CONTRACT_TYPES, ContractAnalysis } from '@/types/contract'
import { FileDropZone } from './FileDropZone'
import Link from 'next/link'

interface Template { id: number; name: string; filename: string }

interface Props {
  onResult: (result: {
    analysis: ContractAnalysis
    meta: { contractName: string; contractType: string; analyzedAt: string }
  }) => void
}

export function ContractUploadForm({ onResult }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractType, setContractType] = useState<string>('')
  const [kbCount, setKbCount] = useState<number>(0)
  const [kbLoading, setKbLoading] = useState(false)

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(setTemplates).catch(() => {})
  }, [])

  useEffect(() => {
    if (!contractType) { setKbCount(0); return }
    setKbLoading(true)
    fetch(`/api/knowledge-base?category=${encodeURIComponent(contractType)}&count=true`)
      .then(r => r.json())
      .then(d => setKbCount(d.count ?? 0))
      .catch(() => setKbCount(0))
      .finally(() => setKbLoading(false))
  }, [contractType])

  const hasReference = kbCount > 0 || !!selectedTemplate
  const canSubmit = !!contractType && !!contractFile && hasReference

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!contractFile) {
      setError('Selecione o arquivo de contrato a revisar.')
      return
    }
    if (!hasReference) {
      setError('Adicione documentos à base de conhecimento para esta categoria antes de analisar.')
      return
    }

    setLoading(true)
    try {
      const form = e.currentTarget
      const contractName = (form.elements.namedItem('contractName') as HTMLInputElement).value
      const observations = (form.elements.namedItem('observations') as HTMLTextAreaElement).value

      const formData = new FormData()
      formData.set('contractName', contractName)
      formData.set('contractType', contractType)
      if (observations) formData.set('observations', observations)
      formData.set('contractFile', contractFile)
      if (selectedTemplate) formData.set('templateId', selectedTemplate)

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
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div>
        <label htmlFor="contractName" className="block text-sm font-medium text-gray-700 mb-1.5">
          Nome do Contrato <span className="text-red-500">*</span>
        </label>
        <input
          id="contractName"
          name="contractName"
          type="text"
          required
          placeholder="ex: Contrato de Prestação de Serviços — Acme Ltda"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4DA4] focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 mb-1.5">
          Tipo de Contrato <span className="text-red-500">*</span>
        </label>
        <select
          id="contractType"
          name="contractType"
          required
          value={contractType}
          onChange={e => { setContractType(e.target.value); setSelectedTemplate('') }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4DA4] focus:border-transparent bg-white"
        >
          <option value="">Selecione o tipo…</option>
          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <FileDropZone
        label="Contrato a Revisar"
        required
        value={contractFile}
        onChange={setContractFile}
      />

      {contractType && (
        <div>
          {kbLoading ? (
            <div className="h-12 rounded-xl bg-gray-50 border border-gray-100 animate-pulse" />
          ) : kbCount > 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">
                  Base disponível — {kbCount} {kbCount === 1 ? 'documento indexado' : 'documentos indexados'}
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  A IA usará automaticamente os contratos aprovados desta categoria.
                </p>
              </div>
            </div>
          ) : templates.length > 0 ? (
            <div>
              <label htmlFor="templateSelect" className="block text-sm font-medium text-gray-700 mb-1.5">
                Template de referência <span className="text-red-500">*</span>
              </label>
              <select
                id="templateSelect"
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4DA4] focus:border-transparent bg-white"
              >
                <option value="">Selecione um template…</option>
                {templates.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.name} ({t.filename})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Nenhuma referência para esta categoria
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Adicione contratos aprovados na{' '}
                  <Link href="/knowledge-base" className="underline font-medium hover:text-amber-900">
                    Base de Conhecimento
                  </Link>{' '}
                  para habilitar a análise.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-1.5">
          Observações <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="observations"
          name="observations"
          rows={3}
          placeholder="Contexto adicional, pontos de atenção específicos…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4DA4] focus:border-transparent resize-none"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full py-2.5 px-4 bg-[#1C2B4A] hover:bg-[#152037] text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analisando…
          </span>
        ) : 'Analisar Contrato'}
      </button>
    </form>
  )
}
