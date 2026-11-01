// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import AppRoutes from '../AppRoutes.tsx'
import type { UserSelf } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { myProfile, reactedVideos, type Video } from '../api/profile.ts'
import { getVideo, myVideos } from '../api/videos.ts'
import { invalidateVisibility } from '../lib/visibility.ts'

vi.mock('../api/profile.ts', async (original) => ({
  ...(await original<typeof import('../api/profile.ts')>()), myProfile: vi.fn(), reactedVideos: vi.fn(),
}))
vi.mock('../api/videos.ts', async (original) => ({
  ...(await original<typeof import('../api/videos.ts')>()), getVideo: vi.fn(), myVideos: vi.fn(),
}))

const user: UserSelf = { id: 'eu', name: 'Ana', username: 'ana', email: 'ana@example.com', bio: '', role: 'user', created_at: '' }
const video = (id: string): Video => ({
  id, author: { id: 'autor', name: 'Bia', username: 'bia', bio: '', created_at: '' },
  caption: `Vídeo ${id}`, category: 'louvor', bible_reference: null, status: 'approved',
  created_at: '2026-10-31T00:00:00Z', updated_at: '2026-10-31T00:00:00Z', duration_seconds: 30,
  media_url: `/api/videos/${id}/media`, reaction_count: 1, comment_count: 0, reacted_by_me: true,
})
const page = <T,>(data: T[]) => ({ data, pagination: { next_cursor: null, has_more: false } })

beforeEach(() => {
  vi.mocked(myProfile).mockResolvedValue({ user, counts: { videos: 0, amens_received: 0, reacted: 1, followers: 0, following: 0 } })
  vi.mocked(myVideos).mockResolvedValue(page([]))
  vi.mocked(reactedVideos).mockResolvedValue(page([video('v1')]))
  vi.mocked(getVideo).mockImplementation(async (id) => video(id))
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

function open(path = '/videos/v1', identity: UserSelf | null = user) {
  return render(<MemoryRouter initialEntries={[path]}><AppRoutes user={identity} setUser={vi.fn()} /></MemoryRouter>)
}

test.each(['Assistir Vídeo v1', 'Vídeo v1'])('abre vídeo curtido por "%s" e retorna para a aba Curtidos', async (linkName) => {
  const { container } = open('/perfil')
  await screen.findByRole('heading', { name: 'Ana' })
  await userEvent.click(screen.getByRole('tab', { name: 'Curtidos' }))
  await userEvent.click(await screen.findByRole('link', { name: linkName }))

  await screen.findByRole('heading', { name: 'Assistir vídeo' })
  await screen.findByText('Vídeo v1')
  expect(getVideo).toHaveBeenCalledWith('v1')
  const player = container.querySelector('video')
  expect(player?.getAttribute('src')).toBe('/api/videos/v1/media')
  expect(player?.hasAttribute('controls')).toBe(true)
  expect(screen.getByRole('button', { name: 'Amém, 1' }).getAttribute('aria-pressed')).toBe('true')

  await userEvent.click(screen.getByRole('link', { name: /Curtidos/ }))
  await screen.findByRole('heading', { name: 'Ana' })
  expect(screen.getByRole('tab', { name: 'Curtidos' }).getAttribute('aria-selected')).toBe('true')
  expect(await screen.findByRole('link', { name: 'Assistir Vídeo v1' })).toBeTruthy()
})

test('link direto permite assistir como visitante e oferece retorno ao feed', async () => {
  open('/videos/v1', null)
  await screen.findByText('Vídeo v1')
  expect(screen.getByRole('link', { name: /Feed/ }).getAttribute('href')).toBe('/feed')
  expect(screen.getByRole('link', { name: /Entre para dizer Amém/ })).toBeTruthy()
})

test('vídeo removido ou sem visibilidade mostra indisponibilidade sem player', async () => {
  vi.mocked(getVideo).mockRejectedValue(new ApiError(404, 'not_found', 'Recurso não encontrado.'))
  const { container } = open()
  expect((await screen.findByRole('alert')).textContent).toContain('Este vídeo não está disponível.')
  expect(container.querySelector('video')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
})

test('vídeo que voltou à análise não é apresentado como publicação aprovada', async () => {
  vi.mocked(getVideo).mockResolvedValue({ ...video('v1'), status: 'pending' })
  const { container } = open()
  await screen.findByText('Este vídeo não está disponível.')
  expect(container.querySelector('video')).toBeNull()
})

test('falha temporária permite tentar de novo sem perder o endereço do vídeo', async () => {
  vi.mocked(getVideo).mockRejectedValueOnce(new ApiError(503, 'data_unavailable', 'Serviço indisponível.'))
  open()
  await screen.findByText('Serviço indisponível.')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  await screen.findByText('Vídeo v1')
  expect(getVideo).toHaveBeenCalledTimes(2)
  expect(getVideo).toHaveBeenLastCalledWith('v1')
})

test('resposta atrasada de outro vídeo não substitui o endereço atual', async () => {
  let resolve!: (value: Video) => void
  vi.mocked(getVideo).mockReturnValueOnce(new Promise((done) => { resolve = done }))
  render(<MemoryRouter initialEntries={['/videos/v1']}>
    <Link to="/videos/v2">Outro vídeo</Link>
    <AppRoutes user={user} setUser={vi.fn()} />
  </MemoryRouter>)
  await screen.findByRole('status')
  await userEvent.click(screen.getByRole('link', { name: 'Outro vídeo' }))
  await screen.findByText('Vídeo v2')
  await act(async () => { resolve(video('v1')) })
  expect(screen.queryByText('Vídeo v1')).toBeNull()
  expect(screen.getByText('Vídeo v2')).toBeTruthy()
})

test('mudança de visibilidade retira o player anteriormente carregado', async () => {
  vi.mocked(getVideo).mockResolvedValueOnce(video('v1')).mockRejectedValue(new ApiError(404, 'not_found', 'Recurso não encontrado.'))
  const { container } = open()
  await screen.findByText('Vídeo v1')
  act(() => invalidateVisibility())
  await screen.findByText('Este vídeo não está disponível.')
  expect(container.querySelector('video')).toBeNull()
})
