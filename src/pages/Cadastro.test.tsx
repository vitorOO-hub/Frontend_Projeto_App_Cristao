// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { login, register } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import Cadastro from './Cadastro.tsx'

vi.mock('../api/auth.ts', () => ({ login: vi.fn(), register: vi.fn() }))
// O feed ao lado do formulário busca versículos na rede; não é o assunto destes testes.
vi.mock('../components/feed/FeedPreview.tsx', () => ({ default: () => null }))

const user = { id: 'u1', name: 'Maria', username: 'maria', email: 'maria@exemplo.com', bio: '', role: 'user', created_at: '2026-10-27T00:00:00Z' }
const password = 'uma frase longa'

beforeEach(() => {
  vi.mocked(register).mockReset()
  vi.mocked(login).mockReset()
})
afterEach(cleanup)

async function fill(values: { name?: string; username?: string; email?: string; password?: string } = {}) {
  const typed = userEvent.setup()
  render(
    <MemoryRouter>
      <Cadastro onLogin={vi.fn()} />
    </MemoryRouter>,
  )
  await typed.type(screen.getByLabelText('Nome'), values.name ?? 'Maria')
  await typed.type(screen.getByLabelText('Usuário'), values.username ?? 'maria')
  await typed.type(screen.getByLabelText('E-mail'), values.email ?? 'maria@exemplo.com')
  await typed.type(screen.getByLabelText('Senha'), values.password ?? password)
  return typed
}

const submit = (typed: ReturnType<typeof userEvent.setup>, label = 'Criar conta') =>
  typed.click(screen.getByRole('button', { name: label }))

test('enquanto envia, o botão fica desligado e o formulário não é enviado de novo', async () => {
  vi.mocked(register).mockReturnValue(new Promise(() => {}))
  const typed = await fill()
  await submit(typed)

  const button = screen.getByRole('button', { name: 'Criando conta…' }) as HTMLButtonElement
  expect(button.disabled).toBe(true)
  await typed.type(screen.getByLabelText('Senha'), '{Enter}')
  expect(register).toHaveBeenCalledTimes(1)
})

test('conta criada mas login falhou: o próximo clique só tenta entrar, sem cadastrar de novo', async () => {
  vi.mocked(register).mockResolvedValue(user)
  vi.mocked(login).mockRejectedValueOnce(new ApiError(429, 'too_many_attempts', 'Muitas tentativas.', 900)).mockResolvedValue(user)
  const typed = await fill()
  await submit(typed)

  expect((await screen.findByRole('alert')).textContent).toContain('Conta criada, mas não deu para entrar agora')
  await submit(typed, 'Entrar')

  expect(register).toHaveBeenCalledTimes(1)
  expect(login).toHaveBeenCalledTimes(2)
})

test('mudar e-mail ou senha depois de criar a conta volta a cadastrar', async () => {
  vi.mocked(register).mockResolvedValue(user)
  vi.mocked(login).mockRejectedValue(new ApiError(503, 'auth_unavailable', 'Serviço temporariamente indisponível.'))
  const typed = await fill()
  await submit(typed)
  await screen.findByRole('alert')

  await typed.type(screen.getByLabelText('Senha'), ' mais')
  await submit(typed)

  expect(register).toHaveBeenCalledTimes(2)
})

test('e-mail repetido aparece no campo e leva o foco até ele', async () => {
  vi.mocked(register).mockRejectedValue(new ApiError(409, 'email_conflict', 'E-mail já cadastrado.'))
  const typed = await fill()
  await submit(typed)

  const email = screen.getByLabelText('E-mail')
  const message = await screen.findByText('Este e-mail já tem uma conta. Tente entrar.')
  expect(email.getAttribute('aria-invalid')).toBe('true')
  expect(email.getAttribute('aria-describedby')).toBe(message.id)
  expect(document.activeElement).toBe(email)
})

test('nome só com espaços é recusado no campo, sem ir ao servidor', async () => {
  const typed = await fill({ name: '   ' })
  await submit(typed)

  expect(screen.getByText('Use pelo menos 2 caracteres, sem contar espaços nas pontas.')).toBeTruthy()
  expect(register).not.toHaveBeenCalled()
})

test('nome com espaços nas pontas mas 2 caracteres de verdade é aceito', async () => {
  vi.mocked(register).mockResolvedValue(user)
  vi.mocked(login).mockResolvedValue(user)
  const typed = await fill({ name: ' Jo ' })
  await submit(typed)

  expect(register).toHaveBeenCalledWith(' Jo ', 'maria', 'maria@exemplo.com', password)
})

test('usuário repetido aparece no campo e leva o foco até ele', async () => {
  vi.mocked(register).mockRejectedValue(new ApiError(409, 'username_conflict', 'Nome de usuário já em uso.'))
  const typed = await fill()
  await submit(typed)

  const field = screen.getByLabelText('Usuário')
  expect(await screen.findByText('Este usuário já existe. Escolha outro.')).toBeTruthy()
  expect(field.getAttribute('aria-invalid')).toBe('true')
  expect(document.activeElement).toBe(field)
})

test('usuário fora do formato é recusado no campo, sem ir ao servidor', async () => {
  const typed = await fill({ username: 'maria..silva' })
  await submit(typed)

  expect(screen.getByText('Use letras, números, ponto e _, sem ponto no começo, no fim ou repetido.')).toBeTruthy()
  expect(register).not.toHaveBeenCalled()
})
