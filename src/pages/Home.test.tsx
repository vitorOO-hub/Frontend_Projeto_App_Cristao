// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import type { UserSelf } from '../api/auth.ts'
import Home from './Home.tsx'

vi.mock('../api/auth.ts', () => ({ logout: vi.fn() }))
vi.mock('../components/FeedPreview.tsx', () => ({ default: () => null }))

const maria: UserSelf = { id: 'u1', name: 'Maria', username: null, email: 'maria@exemplo.com', bio: '', role: 'user', created_at: '2026-10-27T00:00:00Z' }

afterEach(cleanup)

test('a página inicial leva às lives e aos vídeos do usuário', () => {
  render(
    <MemoryRouter>
      <Home user={maria} onLogout={vi.fn()} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Lives' }).getAttribute('href')).toBe('/lives')
  expect(screen.getByRole('link', { name: 'Meus vídeos' }).getAttribute('href')).toBe('/meus-videos')
})
