// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { blockUser, myBlocks, unblockUser } from '../api/blocks.ts'
import { feedVideos } from '../api/feed.ts'
import type { Video } from '../api/profile.ts'
import BlocksPanel from './BlocksPanel.tsx'
import Feed from '../pages/Feed.tsx'
vi.mock('../api/blocks.ts', () => ({ blockUser: vi.fn(), myBlocks: vi.fn(), unblockUser: vi.fn() }))
vi.mock('../api/feed.ts', () => ({ feedVideos: vi.fn(), setAmen: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const author = { id: 'outro', name: 'Ana', username: null, bio: '', created_at: '' }
const video = (id: string): Video => ({ id, author, caption: `Vídeo ${id}`, category: 'louvor', bible_reference: null, status: 'approved', created_at: '', updated_at: '', duration_seconds: 10, media_url: `/api/videos/${id}/media`, reaction_count: 0, comment_count: 0, reacted_by_me: false })
const page = <T,>(data: T[]) => ({ data, pagination: { next_cursor: null, has_more: false } })
test('bloqueio confirmado invalida todos os vídeos carregados do autor', async () => {
  vi.mocked(feedVideos).mockResolvedValueOnce(page([video('1'), video('2')])).mockResolvedValue(page([]))
  vi.mocked(blockUser).mockResolvedValue({ blocked: true })
  render(<MemoryRouter><Feed selfId="eu" /></MemoryRouter>)
  await screen.findByText('Vídeo 2')
  await userEvent.click(screen.getAllByRole('button', { name: 'Bloquear Ana' })[0])
  expect(blockUser).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar bloqueio' }))
  await screen.findByText('Ainda não há vídeos aprovados.')
  expect(blockUser).toHaveBeenCalledWith('outro')
  expect(screen.queryByText('Vídeo 1')).toBeNull()
  expect(screen.queryByText('Vídeo 2')).toBeNull()
})
test('desbloqueio aceita 204 e refaz a listagem própria', async () => {
  vi.mocked(myBlocks).mockResolvedValueOnce(page([{ user: author, created_at: '' }])).mockResolvedValue(page([]))
  vi.mocked(unblockUser).mockResolvedValue(undefined)
  render(<BlocksPanel />)
  await userEvent.click(await screen.findByRole('button', { name: 'Desbloquear Ana' }))
  await screen.findByText('Você não bloqueou ninguém.')
  expect(unblockUser).toHaveBeenCalledWith('outro')
})
test('falha de bloqueio não retira conteúdo visível', async () => {
  vi.mocked(feedVideos).mockResolvedValue(page([video('1')]))
  vi.mocked(blockUser).mockRejectedValue(new Error('Falha'))
  render(<MemoryRouter><Feed selfId="eu" /></MemoryRouter>)
  await userEvent.click(await screen.findByRole('button', { name: 'Bloquear Ana' }))
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar bloqueio' }))
  await screen.findByRole('alert')
  await waitFor(() => expect(screen.getByText('Vídeo 1')).toBeTruthy())
  expect(feedVideos).toHaveBeenCalledTimes(1)
})
