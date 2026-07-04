// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SuggestionList } from '@/components/SuggestionList'

describe('SuggestionList', () => {
  it('renders a message when there are no suggestions', () => {
    render(<SuggestionList suggestions={[]} />)
    expect(screen.getByText('Nenhuma sugestão de ajuste identificada.')).toBeInTheDocument()
  })

  it('renders each suggestion with the pending validation notice', () => {
    render(
      <SuggestionList
        suggestions={[
          { clause: 'Foro', currentIssue: 'Ausente', suggestedText: 'Adicionar foro de SP.', requiresHumanValidation: true },
        ]}
      />
    )
    expect(screen.getByText('Foro')).toBeInTheDocument()
    expect(screen.getByText('Pendente de validação humana')).toBeInTheDocument()
  })
})
