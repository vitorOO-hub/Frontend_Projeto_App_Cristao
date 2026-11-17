// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import AmenButton from './AmenButton.tsx'

afterEach(cleanup)

test('visitante recebe a dica no hover e no teclado e pode dispensá-la com Escape', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><AmenButton guest count={2} reacted={false} sending={false} onToggle={vi.fn()} /></MemoryRouter>)
  const like = screen.getByRole('link', { name: 'Entre para dizer Amém, 2' })
  expect(like.textContent).toBe('2')
  expect(screen.queryByRole('tooltip')).toBeNull()

  await user.hover(like)
  expect(screen.getByRole('tooltip').textContent).toBe('Entre para dizer Amém nos vídeos.')
  expect(like.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id)
  await user.unhover(like)
  expect(screen.queryByRole('tooltip')).toBeNull()

  await user.tab()
  expect(document.activeElement).toBe(like)
  expect(screen.getByRole('tooltip')).toBeTruthy()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('tooltip')).toBeNull()
})

test('clicar como visitante abre o login com retorno ao vídeo sem enviar reação', async () => {
  const onToggle = vi.fn()
  function LoginDestination() {
    const { state } = useLocation()
    return <p>{state.from.pathname}{state.from.search}{state.from.hash}</p>
  }
  render(<MemoryRouter initialEntries={['/videos/v1?origem=curtidos#comentarios']}>
    <Routes>
      <Route path="/videos/:id" element={<AmenButton guest count={2} reacted={false} sending={false} onToggle={onToggle} />} />
      <Route path="/login" element={<LoginDestination />} />
    </Routes>
  </MemoryRouter>)
  await userEvent.click(screen.getByRole('link', { name: 'Entre para dizer Amém, 2' }))
  expect(screen.getByText('/videos/v1?origem=curtidos#comentarios')).toBeTruthy()
  expect(onToggle).not.toHaveBeenCalled()
})
