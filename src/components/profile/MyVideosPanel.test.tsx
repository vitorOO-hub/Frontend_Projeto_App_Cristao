// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '../../api/client.ts'
import { myVideos, type VideoOwn } from '../../api/videos.ts'
import MyVideosPanel from './MyVideosPanel.tsx'

vi.mock('../../api/videos.ts', () => ({ myVideos: vi.fn() }))

const video = (id: string, status: VideoOwn['status'], review_reason: string | null = null): VideoOwn => ({
  id,
  caption: `Legenda ${id}`,
  category: 'louvor',
  bible_reference: null,
  status,
  created_at: '2026-10-27T12:00:00Z',
  updated_at: '2026-10-27T12:00:00Z',
  duration_seconds: 65,
  media_url: `/api/videos/${id}/media`,
  review_reason,
})

const page = (data: VideoOwn[], next: string | null = null) => ({ data, pagination: { next_cursor: next, has_more: next !== null } })

beforeEach(() => vi.mocked(myVideos).mockReset())
afterEach(cleanup)

const open = () => render(<MyVideosPanel />)

test('mostra o status de cada vídeo e o motivo só no rejeitado', async () => {
  vi.mocked(myVideos).mockResolvedValue(
    page([video('a', 'pending'), video('b', 'approved'), video('c', 'rejected', 'Áudio com música sem autorização.')]),
  )
  open()

  const cards = await screen.findAllByRole('listitem')
  expect(within(cards[0]).getByText('Em análise')).toBeTruthy()
  expect(within(cards[1]).getByText('Aprovado')).toBeTruthy()
  expect(within(cards[2]).getByText('Retirado do feed')).toBeTruthy()
  expect(within(cards[2]).getByRole('note').textContent).toContain('Áudio com música sem autorização.')
  expect(screen.getAllByRole('note')).toHaveLength(1)
  expect(within(cards[0]).getByText('1:05')).toBeTruthy()
})

test('rejeitado sem motivo avisa em vez de ficar em branco', async () => {
  vi.mocked(myVideos).mockResolvedValue(page([video('c', 'rejected')]))
  open()
  expect((await screen.findByRole('note')).textContent).toContain('Sem mensagem informada.')
})

test('lista vazia', async () => {
  vi.mocked(myVideos).mockResolvedValue(page([]))
  open()
  expect(await screen.findByText('Você ainda não publicou nenhum vídeo.')).toBeTruthy()
})

test('erro mostra o aviso e "Tentar de novo" busca outra vez', async () => {
  vi.mocked(myVideos)
    .mockRejectedValueOnce(new ApiError(0, 'network_error', 'Sem conexão com o servidor. Tente novamente.'))
    .mockResolvedValue(page([video('a', 'approved')]))
  const typed = userEvent.setup()
  open()

  expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão com o servidor')
  await typed.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(await screen.findByText('Legenda a')).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})

test('"Carregar mais" manda o cursor e anexa sem repetir', async () => {
  vi.mocked(myVideos).mockResolvedValueOnce(page([video('a', 'approved')], 'c1')).mockResolvedValueOnce(page([video('b', 'pending')]))
  const typed = userEvent.setup()
  open()

  await typed.click(await screen.findByRole('button', { name: 'Carregar mais' }))
  expect(await screen.findByText('Legenda b')).toBeTruthy()
  expect(myVideos).toHaveBeenLastCalledWith(undefined, 'c1')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull()
})

test('trocar de aba busca com o status certo e sem cursor', async () => {
  vi.mocked(myVideos).mockResolvedValueOnce(page([video('a', 'approved')], 'c1')).mockResolvedValue(page([video('c', 'rejected', 'Motivo.')]))
  const typed = userEvent.setup()
  open()
  await screen.findByText('Legenda a')

  await typed.click(screen.getByRole('button', { name: 'Retirados' }))
  expect(await screen.findByText('Legenda c')).toBeTruthy()
  expect(myVideos).toHaveBeenLastCalledWith('rejected', undefined)
  expect(screen.queryByText('Legenda a')).toBeNull()
})

test('cada vídeo mostra a sua categoria', async () => {
  vi.mocked(myVideos).mockResolvedValue(
    page([{ ...video('a', 'approved'), category: 'estudo-biblico' }, { ...video('b', 'pending'), category: 'humor' }]),
  )
  open()

  const cards = await screen.findAllByRole('listitem')
  expect(within(cards[0]).getByText('Estudo bíblico')).toBeTruthy()
  expect(within(cards[1]).getByText('Humor')).toBeTruthy()
})

test('vídeo retirado pela moderação mostra a mensagem do moderador', async () => {
  vi.mocked(myVideos).mockResolvedValue(page([video('r', 'rejected', 'Contém ofensas a outros irmãos.')]))
  open()

  const note = await screen.findByRole('note')
  expect(note.textContent).toContain('Retirado pela moderação')
  expect(note.textContent).toContain('Contém ofensas a outros irmãos.')
})
