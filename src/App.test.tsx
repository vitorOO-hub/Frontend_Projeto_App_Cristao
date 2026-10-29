// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { UserSelf } from './api/auth.ts'
import App from './App.tsx'

const maria: UserSelf = { id: 'u1', name: 'Maria', username: null, email: 'maria@exemplo.com', bio: '', role: 'user', created_at: '2026-10-27T00:00:00Z' }
let expire: () => void

vi.mock('./api/auth.ts', () => ({ me: vi.fn() }))
vi.mock('./api/client.ts', () => ({
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

  act(() => expire())

  expect(await screen.findByText('tela de login Sua sessão expirou. Entre de novo.')).toBeTruthy()
})

test('quem abre o app sem sessão vai ao login sem aviso de expiração', async () => {
  const { me } = await import('./api/auth.ts')
  vi.mocked(me).mockRejectedValue(new Error('401'))
  render(<App />)
  expect(await screen.findByText('tela de login')).toBeTruthy()
})
