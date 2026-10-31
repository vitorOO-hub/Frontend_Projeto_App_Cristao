// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { publicUser, userVideos } from '../api/profile.ts'
import PerfilPublico from './PerfilPublico.tsx'
vi.mock('../api/profile.ts', () => ({ publicUser: vi.fn(), userVideos: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
test('perfil público consulta usuário e feed filtrado sem identidade ou dados próprios', async () => {
  vi.mocked(publicUser).mockResolvedValue({ id: 'autor', name: 'Ana', username: 'ana', bio: 'Bem-vindos', created_at: '' })
  vi.mocked(userVideos).mockResolvedValue({ data: [], pagination: { has_more: false, next_cursor: null } })
  render(<MemoryRouter initialEntries={['/usuarios/autor']}><Routes><Route path="/usuarios/:id" element={<PerfilPublico />} /></Routes></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: 'Ana' })).toBeTruthy()
  await screen.findByText('Nenhum vídeo aprovado disponível.')
  expect(publicUser).toHaveBeenCalledWith('autor')
  expect(userVideos).toHaveBeenCalledWith('autor', undefined)
  expect(screen.queryByText('Editar meu perfil e gerenciar meus vídeos')).toBeNull()
  expect(screen.queryByRole('button', { name: /Bloquear/ })).toBeNull()
})
test('perfil inexistente informa falha sem renderizar controles privados', async () => {
  vi.mocked(publicUser).mockRejectedValue(new Error('Não encontrado'))
  render(<MemoryRouter initialEntries={['/usuarios/inexistente']}><Routes><Route path="/usuarios/:id" element={<PerfilPublico />} /></Routes></MemoryRouter>)
  await screen.findByRole('alert')
  expect(userVideos).not.toHaveBeenCalled()
})
