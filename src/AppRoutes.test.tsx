// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import type { UserSelf } from './api/auth.ts'
import AppRoutes from './AppRoutes.tsx'

vi.mock('./pages/Home.tsx', () => ({ default: () => <p>tela inicial</p> }))
vi.mock('./pages/MeusVideos.tsx', () => ({
  default: function MeusVideos() {
    const { pathname, search } = useLocation()
    return <p>{`tela meus vídeos em ${pathname}${search}`}</p>
  },
}))
vi.mock('./pages/Lives.tsx', () => ({ default: () => <p>tela de lives</p> }))
vi.mock('./pages/Cadastro.tsx', () => ({ default: () => <p>tela de cadastro</p> }))
vi.mock('./pages/Login.tsx', () => ({
  default: ({ onLogin }: { onLogin: (user: UserSelf) => void }) => (
    <button type="button" onClick={() => onLogin(maria)}>
      tela de login
    </button>
  ),
}))

const maria: UserSelf = { id: 'u1', name: 'Maria', username: null, email: 'maria@exemplo.com', bio: '', role: 'user', created_at: '2026-10-27T00:00:00Z' }

afterEach(cleanup)

function open(path: string, user: UserSelf | null) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes user={user} setUser={vi.fn()} />
    </MemoryRouter>,
  )
}

test.each(['/', '/meus-videos', '/lives'])('visitante em %s é levado para o login', (path) => {
  open(path, null)
  expect(screen.getByText('tela de login')).toBeTruthy()
})

test('visitante em rota que não existe cai no login', () => {
  open('/qualquer-coisa', null)
  expect(screen.getByText('tela de login')).toBeTruthy()
})

test.each(['/login', '/cadastro'])('quem já entrou em %s vai para o início', (path) => {
  open(path, maria)
  expect(screen.getByText('tela inicial')).toBeTruthy()
})

test('quem entrou acessa a rota protegida', () => {
  open('/meus-videos', maria)
  expect(screen.getByText('tela meus vídeos em /meus-videos')).toBeTruthy()
})

function Harness() {
  const [user, setUser] = useState<UserSelf | null>(null)
  return <AppRoutes user={user} setUser={setUser} />
}

test('depois de entrar, volta para a página que o visitante tentou abrir', async () => {
  const typed = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/meus-videos?aba=rejeitados']}>
      <Harness />
    </MemoryRouter>,
  )
  await typed.click(screen.getByText('tela de login'))
  expect(screen.getByText('tela meus vídeos em /meus-videos?aba=rejeitados')).toBeTruthy()
})

test('entrar direto pelo login leva ao início', async () => {
  const typed = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Harness />
    </MemoryRouter>,
  )
  await typed.click(screen.getByText('tela de login'))
  expect(screen.getByText('tela inicial')).toBeTruthy()
})

test('quem entrou acessa as lives', () => {
  open('/lives', maria)
  expect(screen.getByText('tela de lives')).toBeTruthy()
})
