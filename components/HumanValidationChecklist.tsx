import { HumanValidationItem } from '@/types/contract'

export function HumanValidationChecklist({ items }: { items: HumanValidationItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
          <span className="mt-0.5 h-4 w-4 rounded border border-gray-400 flex-shrink-0" />
          <span>{item.item}</span>
        </li>
      ))}
    </ul>
  )
}
