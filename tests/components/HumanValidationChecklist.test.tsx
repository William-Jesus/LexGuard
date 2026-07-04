// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HumanValidationChecklist } from '@/components/HumanValidationChecklist'

describe('HumanValidationChecklist', () => {
  it('renders one checklist entry per item', () => {
    render(
      <HumanValidationChecklist
        items={[
          { item: 'Revisar cláusula de confidencialidade', status: 'pending' },
          { item: 'Revisar valor do contrato', status: 'pending' },
        ]}
      />
    )
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByText('Revisar cláusula de confidencialidade')).toBeInTheDocument()
  })
})
