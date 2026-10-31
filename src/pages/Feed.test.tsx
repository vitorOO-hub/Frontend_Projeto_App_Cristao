// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getPassage } from '../api/bible.ts'
import { feedVideos, setAmen } from '../api/feed.ts'
import { ApiError } from '../api/client.ts'
import type { Video } from '../api/profile.ts'
import Feed from './Feed.tsx'

vi.mock('../api/feed.ts', () => ({ feedVideos: vi.fn(), setAmen: vi.fn() }))
vi.mock('../api/bible.ts', () => ({ getPassage: vi.fn() }))

const video = (id: string, changes: Partial<Video> = {}): Video => ({
  id,
  author: { id: 'autor', name: 'Ana Lima', username: 'ana', bio: '', created_at: '2026-10-27T12:00:00Z' },
  caption: `Legenda ${id}`,
  category: 'louvor',
  bible_reference: null,
  status: 'approved',
  created_at: '2026-10-28T12:00:00Z',
  updated_at: '2026-10-28T12:00:00Z',
  duration_seconds: 65,
  media_url: `/api/videos/${id}/media`,
  reaction_count: 2,
  comment_count: 1,
  reacted_by_me: false,
  ...changes,
})
const page = (data: Video[], next: string | null = null) => ({ data, pagination: { next_cursor: next, has_more: next !== null } })

function open(selfId = 'eu') {
  return render(
    <MemoryRouter>
      <Feed selfId={selfId} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(feedVideos).mockResolvedValue(page([]))
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

test('mostra os vídeos aprovados com player apontando para a mídia da API', async () => {
  vi.mocked(feedVideos).mockResolvedValue(page([video('a1')]))
  const { container } = open()

  expect(await screen.findByText('Legenda a1')).toBeTruthy()
  expect(screen.getByText('@ana')).toBeTruthy()
  expect(screen.getByText('1:05')).toBeTruthy()
  const player = container.querySelector('video')
  expect(player?.getAttribute('src')).toBe('/api/videos/a1/media')
  expect(player?.hasAttribute('controls')).toBe(true)
  expect(feedVideos).toHaveBeenCalledWith(undefined, undefined)
})

test('o filtro de categoria refaz a busca desde a primeira página', async () => {
  vi.mocked(feedVideos).mockResolvedValue(page([video('a1')]))
  open()
  await screen.findByText('Legenda a1')

  vi.mocked(feedVideos).mockResolvedValue(page([]))
  await userEvent.click(screen.getByRole('button', { name: 'Humor' }))

  expect(await screen.findByText('Nenhum vídeo nesta categoria ainda.')).toBeTruthy()
  expect(feedVideos).toHaveBeenLastCalledWith('humor', undefined)
  expect(screen.queryByText('Legenda a1')).toBeNull()
})

test('pagina com "Carregar mais" e avisa quando chega ao fim', async () => {
  vi.mocked(feedVideos).mockResolvedValueOnce(page([video('a1')], 'cursor-2')).mockResolvedValueOnce(page([video('a2')]))
  open()
  await screen.findByText('Legenda a1')
  expect(screen.queryByText(/chegou ao fim/)).toBeNull()

  await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))

  expect(await screen.findByText('Legenda a2')).toBeTruthy()
  expect(screen.getByText('Legenda a1')).toBeTruthy()
  expect(feedVideos).toHaveBeenLastCalledWith(undefined, 'cursor-2')
  expect(screen.getByText(/chegou ao fim/)).toBeTruthy()
})

test('feed vazio e erro com nova tentativa', async () => {
  vi.mocked(feedVideos).mockRejectedValueOnce(new ApiError(503, 'service_unavailable', 'Serviço indisponível.'))
  open()
  expect(await screen.findByText('Serviço indisponível.')).toBeTruthy()

  await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(await screen.findByText('Ainda não há vídeos aprovados.')).toBeTruthy()
})

test('visitante pode entrar ou criar conta pelo cabeçalho mesmo com o feed vazio', async () => {
  render(<MemoryRouter><Feed /></MemoryRouter>)
  await screen.findByText('Ainda não há vídeos aprovados.')
  expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/login')
  expect(screen.getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe('/cadastro')
  expect(screen.getByRole('link', { name: /Início/ }).getAttribute('href')).toBe('/')
})

test('Amém atualiza na hora, confirma com o servidor e pode ser desfeito', async () => {
  vi.mocked(feedVideos).mockResolvedValue(page([video('a1')]))
  vi.mocked(setAmen).mockResolvedValueOnce({ reacted: true, reaction_count: 3 }).mockResolvedValueOnce(undefined)
  open()
  const amen = await screen.findByRole('button', { name: 'Amém, 2' })

  await userEvent.click(amen)
  await screen.findByRole('button', { name: 'Amém, 3' })
  expect(setAmen).toHaveBeenLastCalledWith('a1', true)
  expect(screen.getByRole('button', { name: 'Amém, 3' }).getAttribute('aria-pressed')).toBe('true')

  await userEvent.click(screen.getByRole('button', { name: 'Amém, 3' }))
  await screen.findByRole('button', { name: 'Amém, 2' })
  expect(setAmen).toHaveBeenLastCalledWith('a1', false)
  expect(screen.getByRole('button', { name: 'Amém, 2' }).getAttribute('aria-pressed')).toBe('false')
  expect(screen.queryByRole('alert')).toBeNull()
})

test('desfazer Amém pelo cliente HTTP aceita 204 sem corpo e mantém a reação removida', async () => {
  const actual = await vi.importActual<typeof import('../api/feed.ts')>('../api/feed.ts')
  vi.mocked(setAmen).mockImplementation(actual.setAmen)
  vi.mocked(feedVideos).mockResolvedValue(page([video('a1', { reacted_by_me: true })]))
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrf_token: 'token' } }), { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  open()

  await userEvent.click(await screen.findByRole('button', { name: 'Amém, 2' }))

  await waitFor(() => expect((screen.getByRole('button', { name: 'Amém, 1' }) as HTMLButtonElement).disabled).toBe(false))
  expect(screen.getByRole('button', { name: 'Amém, 1' }).getAttribute('aria-pressed')).toBe('false')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenLastCalledWith('/api/videos/a1/reaction', expect.objectContaining({
    method: 'DELETE',
    headers: expect.objectContaining({ 'X-CSRF-Token': 'token' }),
  }))
})

test('falha no Amém volta ao valor anterior e mostra o erro', async () => {
  vi.mocked(feedVideos).mockResolvedValue(page([video('a1')]))
  vi.mocked(setAmen).mockRejectedValue(new ApiError(503, 'service_unavailable', 'Serviço indisponível.'))
  open()

  await userEvent.click(await screen.findByRole('button', { name: 'Amém, 2' }))

  expect((await screen.findByRole('alert')).textContent).toBe('Serviço indisponível.')
  expect(screen.getByRole('button', { name: 'Amém, 2' }).getAttribute('aria-pressed')).toBe('false')
})

test('o versículo só é buscado ao abrir e falha sem derrubar o vídeo', async () => {
  vi.mocked(feedVideos).mockResolvedValue(page([video('a1', { bible_reference: 'Salmos 23:1' })]))
  vi.mocked(getPassage)
    .mockRejectedValueOnce(new ApiError(502, 'bible_unavailable', 'Versículo indisponível.'))
    .mockResolvedValueOnce({ reference: 'Salmos 23:1', translation: 'almeida', text: 'O Senhor é o meu pastor', source: 'bible-api.com', cached: false })
  open()
  const verse = await screen.findByRole('button', { name: 'Salmos 23:1' })
  expect(getPassage).not.toHaveBeenCalled()

  await userEvent.click(verse)
  expect(await screen.findByText('Versículo indisponível.')).toBeTruthy()
  expect(screen.getByText('Legenda a1')).toBeTruthy()

  await userEvent.click(screen.getAllByRole('button', { name: 'Tentar de novo' })[0])
  await waitFor(() => expect(screen.getByText('O Senhor é o meu pastor')).toBeTruthy())
  expect(getPassage).toHaveBeenCalledWith('Salmos 23:1')
})

test('denunciar aparece só nos vídeos de outras pessoas', async () => {
  vi.mocked(feedVideos).mockResolvedValue(page([video('a1'), video('a2', { author: { ...video('x').author, id: 'eu' } })]))
  open('eu')
  await screen.findByText('Legenda a2')

  const links = screen.getAllByRole('link', { name: 'Denunciar' })
  expect(links).toHaveLength(1)
  expect(links[0].getAttribute('href')).toBe('/videos/a1/denunciar')
})

 test('visitante assiste e consulta passagem sem chamar mutação', async () => {
  vi.mocked(feedVideos).mockResolvedValue(page([video('a1')]))
  render(<MemoryRouter><Feed /></MemoryRouter>)
  const link = await screen.findByRole('link', { name: /Entre para dizer Amém/ })
  expect(link.getAttribute('href')).toBe('/login')
  expect(screen.queryByRole('button', { name: /Amém,/ })).toBeNull()
  expect(setAmen).not.toHaveBeenCalled()
  expect(screen.queryByRole('link', { name: 'Denunciar' })).toBeNull()
})
