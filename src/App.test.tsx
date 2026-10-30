// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { UserSelf } from './api/auth.ts'
import { ApiError } from './api/client.ts'
import App from './App.tsx'

const maria: UserSelf = { id: 'u1', name: 'Maria', username: null, email: 'maria@exemplo.com', bio: '', role: 'user', created_at: '2026-10-27T00:00:00Z' }
let expire: () => void

vi.mock('./api/auth.ts', () => ({ me: vi.fn() }))
vi.mock('./api/client.ts', async (original) => ({
  ...(await original<typeof import('./api/client.ts')>()),
  onUnauthenticated: (listener: () => void) => {
    expire = listener
    return () => {}
  },
}))
vi.mock('./pages/Home.tsx', () => ({ default: () => <p>tela inicial</p> }))
vi.mock('./pages/Perfil.tsx', () => ({ default: () => <p>tela de perfil</p> }))
vi.mock('./pages/Cadastro.tsx', () => ({ default: () => <p>tela de cadastro</p> }))
vi.mock('./pages/Login.tsx', () => ({ default: ({ notice }: { notice?: string }) => <p>{`tela de login ${notice ?? ''}`.trim()}</p> }))

beforeEach(async () => {
  window.history.pushState({}, '', '/perfil')
  const { me } = await import('./api/auth.ts')
  vi.mocked(me).mockResolvedValue(maria)
})
afterEach(cleanup)

test('sessão que expira com o app aberto leva ao login com um aviso', async () => {
  render(<App />)
  expect(await screen.findByText('tela de perfil')).toBeTruthy()
  // O app marca "logado" num efeito depois de mostrar a tela; sem esperar, o aviso de expiração pode não sair.
  await act(async () => {})

  act(() => expire())

  expect(await screen.findByText('tela de login Sua sessão expirou. Entre de novo.')).toBeTruthy()
})

test('quem abre o app sem sessão vai ao login sem aviso de expiração', async () => {
  const { me } = await import('./api/auth.ts')
  vi.mocked(me).mockRejectedValue(new ApiError(401, 'unauthenticated', 'Entre para continuar.'))
  render(<App />)
  expect(await screen.findByText('tela de login')).toBeTruthy()
})

test('falha de rede ao consultar a sessão mostra o erro, não o login, e dá para tentar de novo', async () => {
  const { me } = await import('./api/auth.ts')
  vi.mocked(me).mockRejectedValueOnce(new ApiError(0, 'network_error', 'Sem conexão com o servidor. Tente novamente.'))
  render(<App />)

  expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão com o servidor.')
  expect(screen.queryByText('tela de login')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

  expect(await screen.findByText('tela de perfil')).toBeTruthy()
  expect(vi.mocked(me)).toHaveBeenCalledTimes(2)
})

test('servidor com erro 500 ao consultar a sessão também não vira "sem sessão"', async () => {
  const { me } = await import('./api/auth.ts')
  vi.mocked(me).mockRejectedValue(new ApiError(500, 'internal_error', 'Erro interno.'))
  render(<App />)

  expect((await screen.findByRole('alert')).textContent).toContain('Erro interno.')
  expect(screen.queryByText('tela de login')).toBeNull()
})
