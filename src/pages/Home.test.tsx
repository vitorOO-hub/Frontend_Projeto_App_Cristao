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

test('a página inicial leva ao perfil e às lives', () => {
  render(
    <MemoryRouter>
      <Home user={maria} onLogout={vi.fn()} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Perfil' }).getAttribute('href')).toBe('/perfil')
  expect(screen.getByRole('link', { name: 'Lives' }).getAttribute('href')).toBe('/lives')
  expect(screen.queryByRole('link', { name: 'Meus vídeos' })).toBeNull()
})
