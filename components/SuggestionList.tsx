import type { SuggestedAdjustment } from '@/types/contract'

export function SuggestionList({ suggestions }: { suggestions: SuggestedAdjustment[] }) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma sugestão de ajuste identificada.</p>
  }

  return (
    <ul className="space-y-3" data-testid="suggestion-list">
      {suggestions.map((suggestion, index) => (
        <li key={index} className="rounded border border-gray-200 p-3">
          <p className="font-medium">{suggestion.clause}</p>
          <p className="text-sm text-gray-600">{suggestion.currentIssue}</p>
          <p className="mt-1 text-sm">{suggestion.suggestedText}</p>
          <p className="mt-1 text-xs font-semibold text-amber-700">Pendente de validação humana</p>
        </li>
      ))}
    </ul>
  )
}
