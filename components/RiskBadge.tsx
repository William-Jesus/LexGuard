import { RiskLevel } from '@/types/contract'

const config: Record<RiskLevel, { label: string; classes: string }> = {
  baixo: { label: 'Risco Baixo', classes: 'bg-green-100 text-green-800 border-green-300' },
  medio: { label: 'Risco Médio', classes: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  alto: { label: 'Risco Alto', classes: 'bg-red-100 text-red-800 border-red-300' },
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { label, classes } = config[level]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes}`}>
      {label}
    </span>
  )
}
