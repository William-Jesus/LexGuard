import type { RiskLevel } from '@/types/contract'

const RISK_STYLES: Record<RiskLevel, string> = {
  baixo: 'bg-green-100 text-green-800 border-green-300',
  medio: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  alto: 'bg-red-100 text-red-800 border-red-300',
}

const RISK_LABELS: Record<RiskLevel, string> = {
  baixo: 'Risco Baixo',
  medio: 'Risco Médio',
  alto: 'Risco Alto',
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      data-testid="risk-badge"
      className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${RISK_STYLES[level]}`}
    >
      {RISK_LABELS[level]}
    </span>
  )
}
