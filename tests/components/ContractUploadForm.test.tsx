// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContractUploadForm } from '@/components/ContractUploadForm'

function makeFile(name: string, type: string) {
  return new File(['conteúdo'], name, { type })
}

describe('ContractUploadForm', () => {
  it('calls onSubmit with the filled fields and files', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()

    render(<ContractUploadForm onSubmit={handleSubmit} isSubmitting={false} />)

    await user.type(screen.getByLabelText('Nome do contrato'), 'NDA Fornecedor X')
    await user.selectOptions(screen.getByLabelText('Tipo do contrato'), 'NDA')
    await user.upload(screen.getByLabelText(/Contrato a ser analisado/), makeFile('contrato.pdf', 'application/pdf'))
    await user.upload(screen.getByLabelText(/Modelo aprovado/), makeFile('modelo.pdf', 'application/pdf'))
    await user.click(screen.getByRole('button', { name: 'Analisar contrato' }))

    expect(handleSubmit).toHaveBeenCalledOnce()
    const formData = handleSubmit.mock.calls[0][0] as FormData
    expect(formData.get('contractName')).toBe('NDA Fornecedor X')
    expect(formData.get('contractType')).toBe('NDA')
    expect((formData.get('contractFile') as File).name).toBe('contrato.pdf')
    expect((formData.get('modelFile') as File).name).toBe('modelo.pdf')
  })

  it('disables the submit button and shows loading label while submitting', () => {
    render(<ContractUploadForm onSubmit={vi.fn()} isSubmitting={true} />)
    expect(screen.getByRole('button', { name: 'Analisando...' })).toBeDisabled()
  })

  it('renders the error message when provided', () => {
    render(<ContractUploadForm onSubmit={vi.fn()} isSubmitting={false} errorMessage="Arquivo inválido." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Arquivo inválido.')
  })

  it('shows a validation message and does not submit when a required file is missing', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()

    render(<ContractUploadForm onSubmit={handleSubmit} isSubmitting={false} />)

    await user.type(screen.getByLabelText('Nome do contrato'), 'NDA Fornecedor X')
    await user.selectOptions(screen.getByLabelText('Tipo do contrato'), 'NDA')
    await user.upload(screen.getByLabelText(/Contrato a ser analisado/), makeFile('contrato.pdf', 'application/pdf'))
    // modelFile intentionally left unselected
    await user.click(screen.getByRole('button', { name: 'Analisar contrato' }))

    expect(handleSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Envie o contrato e o modelo aprovado antes de continuar.')
  })
})
