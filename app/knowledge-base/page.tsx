'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { FileDropZone } from '@/components/FileDropZone'
import { CONTRACT_TYPES } from '@/types/contract'

interface KbDoc {
  id: number
  name: string
  category: string
  filename: string
  chunk_count: number
  uploaded_at: string
}

type Grouped = Record<string, KbDoc[]>

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KbDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge-base')
      const data = await res.json()
      setDocs(Array.isArray(data) ? data : [])
    } catch {
      // silent — table visible is empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!name.trim() || !category || !file) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('category', category)
      formData.set('file', file)

      const res = await fetch('/api/knowledge-base', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar documento.')
        return
      }

      setSuccess(`"${name.trim()}" adicionado com ${data.chunkCount} trechos indexados.`)
      setName('')
      setCategory('')
      setFile(null)
      await fetchDocs()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc: KbDoc) {
    if (!confirm(`Remover "${doc.name}" da base? Os trechos indexados serão excluídos.`)) return
    setDeletingId(doc.id)
    try {
      const res = await fetch(`/api/knowledge-base/${doc.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDocs(prev => prev.filter(d => d.id !== doc.id))
      } else {
        const data = await res.json()
        alert(data.error ?? 'Erro ao remover documento.')
      }
    } catch {
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setDeletingId(null)
    }
  }

  const grouped: Grouped = docs.reduce<Grouped>((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = []
    acc[doc.category].push(doc)
    return acc
  }, {})

  const totalDocs = docs.length
  const totalChunks = docs.reduce((s, d) => s + d.chunk_count, 0)
  const categories = Object.keys(grouped).sort()

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F3' }}>
      <AppHeader subtitle="Base de Conhecimento" />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1C2B4A]">Base de Conhecimento</h1>
          <p className="text-sm text-gray-500 mt-1">
            Adicione contratos aprovados por categoria. A IA os usará automaticamente ao analisar novos contratos do mesmo tipo.
          </p>
        </div>

        {totalDocs > 0 && (
          <div className="flex gap-4 flex-wrap">
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#2B4DA4] text-sm font-bold">
                {totalDocs}
              </div>
              <div>
                <p className="text-xs text-gray-500">Documentos</p>
                <p className="text-sm font-semibold text-[#1C2B4A]">{totalDocs === 1 ? '1 documento' : `${totalDocs} documentos`}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center text-green-700 text-sm font-bold">
                {categories.length}
              </div>
              <div>
                <p className="text-xs text-gray-500">Categorias</p>
                <p className="text-sm font-semibold text-[#1C2B4A]">{categories.length === 1 ? '1 categoria' : `${categories.length} categorias`}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 text-sm font-bold">
                ~
              </div>
              <div>
                <p className="text-xs text-gray-500">Trechos indexados</p>
                <p className="text-sm font-semibold text-[#1C2B4A]">{totalChunks.toLocaleString('pt-BR')} trechos</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-[#1C2B4A] mb-4">Adicionar documento</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex: Contrato PJ padrão v3"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4DA4] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4DA4] focus:border-transparent bg-white"
                >
                  <option value="">Selecione a categoria…</option>
                  {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <FileDropZone
                label="Arquivo do contrato"
                required
                value={file}
                onChange={setFile}
              />

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 px-4 bg-[#1C2B4A] hover:bg-[#152037] text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Indexando…
                  </span>
                ) : 'Adicionar à base'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                O upload pode levar alguns segundos enquanto o texto é indexado com embeddings.
              </p>
            </form>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#1C2B4A]">Documentos na base</h2>

            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-sm text-gray-400">Carregando…</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 font-medium">Nenhum documento na base</p>
                <p className="text-xs text-gray-400 mt-1">Adicione contratos aprovados para enriquecer a análise.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map(cat => (
                  <div key={cat} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <span className="text-xs font-semibold text-[#1C2B4A] uppercase tracking-wide">{cat}</span>
                      <span className="text-xs text-gray-400">{grouped[cat].length} {grouped[cat].length === 1 ? 'doc' : 'docs'}</span>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {grouped[cat].map(doc => (
                        <li key={doc.id} className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#1C2B4A] truncate">{doc.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {doc.filename} · {doc.chunk_count} trechos · {formatDate(doc.uploaded_at)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={deletingId === doc.id}
                            className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors px-1 py-0.5"
                            aria-label={`Remover ${doc.name}`}
                          >
                            {deletingId === doc.id ? '…' : 'Remover'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
