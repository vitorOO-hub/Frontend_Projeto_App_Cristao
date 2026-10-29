// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import Login from './Login.tsx'

vi.mock('../api/auth.ts', () => ({ login: vi.fn() }))
vi.mock('../components/FeedPreview.tsx', () => ({ default: () => null }))

afterEach(cleanup)

const open = (notice?: string) =>
  render(
    <MemoryRouter>
      <Login onLogin={vi.fn()} notice={notice} />
    </MemoryRouter>,
  )

test('mostra o aviso recebido, sem tratá-lo como erro do formulário', () => {
  open('Sua sessão expirou. Entre de novo.')
  expect(screen.getByRole('status').textContent).toBe('Sua sessão expirou. Entre de novo.')
  expect(screen.queryByRole('alert')).toBeNull()
})

test('sem aviso, nada além do formulário', () => {
  open()
  expect(screen.queryByRole('status')).toBeNull()
})
