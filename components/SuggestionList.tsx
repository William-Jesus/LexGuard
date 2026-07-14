import { SuggestedAdjustment } from '@/types/contract'

export function SuggestionList({ suggestions }: { suggestions: SuggestedAdjustment[] }) {
  if (suggestions.length === 0) return <p className="text-sm text-gray-500">Nenhuma sugestão.</p>
  return (
    <ul className="space-y-4">
      {suggestions.map((s, i) => (
        <li key={i} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
          <p className="font-semibold text-sm text-gray-900 mb-1">{s.clause}</p>
          <p className="text-xs text-gray-600 mb-2"><span className="font-medium">Problema:</span> {s.currentIssue}</p>
          <p className="text-xs text-gray-700 bg-white border border-yellow-100 rounded p-2 font-mono">{s.suggestedText}</p>
          <p className="text-xs text-amber-700 mt-2 font-medium">⚠️ Requer validação humana</p>
        </li>
      ))}
    </ul>
  )
}
