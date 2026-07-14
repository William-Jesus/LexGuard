'use client'
import { useRef, useState } from 'react'

interface FileDropZoneProps {
  label: string
  hint?: string
  required?: boolean
  accept?: string
  value: File | null
  onChange: (file: File | null) => void
}

function DocumentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="14 2 14 8 20 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline
        points="16 16 12 12 8 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="12" y1="12" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FileDropZone({
  label,
  hint,
  required,
  accept = '.pdf,.docx',
  value,
  onChange,
}: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onChange(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onChange(file)
  }

  function handleRemove() {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-gray-400 font-normal ml-1.5">{hint}</span>}
      </p>

      {value ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-600 flex-shrink-0">
            <DocumentIcon />
          </span>
          <span className="flex-1 text-sm text-gray-800 truncate font-medium">{value.name}</span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 text-lg leading-none"
            aria-label="Remover arquivo"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-all select-none ${
            dragging
              ? 'border-[#2B4DA4] bg-[#EEF2FF]'
              : 'border-gray-300 hover:border-gray-400 hover:bg-white'
          }`}
        >
          <span className={`inline-flex ${dragging ? 'text-[#2B4DA4]' : 'text-gray-300'}`}>
            <UploadIcon />
          </span>
          <p className="text-sm text-gray-500 mt-2">
            Arraste aqui ou{' '}
            <span className="text-[#2B4DA4] font-medium">clique para selecionar</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF ou DOCX · máx. 10MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}
