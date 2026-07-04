// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskBadge } from '@/components/RiskBadge'

describe('RiskBadge', () => {
  it('renders the label for baixo risk', () => {
    render(<RiskBadge level="baixo" />)
    expect(screen.getByTestId('risk-badge')).toHaveTextContent('Risco Baixo')
  })

  it('renders the label for alto risk', () => {
    render(<RiskBadge level="alto" />)
    expect(screen.getByTestId('risk-badge')).toHaveTextContent('Risco Alto')
  })
})
