import type { ChecklistItem } from '@/types/contract'

export function HumanValidationChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="space-y-2" data-testid="human-validation-checklist">
      {items.map((item, index) => (
        <li key={index} className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled className="h-4 w-4" />
          <span>{item.item}</span>
        </li>
      ))}
    </ul>
  )
}
