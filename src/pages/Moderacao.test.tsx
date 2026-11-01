// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { ApiError } from '../api/client.ts'
import { decideVideo, getVideo, reportQueue, resolveReport, reviewQueue, type Report, type ReviewVideo } from '../api/moderation.ts'
import Moderacao from './Moderacao.tsx'

vi.mock('../api/moderation.ts', async (original) => ({
  ...(await original<typeof import('../api/moderation.ts')>()),
  reviewQueue: vi.fn(),
  decideVideo: vi.fn(),
  reportQueue: vi.fn(),
  resolveReport: vi.fn(),
  getVideo: vi.fn(),
}))

const video = (id: string, changes: Partial<ReviewVideo> = {}): ReviewVideo => ({
  id,
  author: { id: 'a', name: 'Ana Lima', username: 'ana', bio: '', created_at: '2026-10-27T12:00:00Z' },
  caption: `Legenda ${id}`,
  category: 'louvor',
  bible_reference: null,
  status: 'pending',
  created_at: '2026-10-28T12:00:00Z',
  updated_at: '2026-10-28T12:00:00.123Z',
  duration_seconds: 30,
  media_url: `/api/videos/${id}/media`,
  reaction_count: 0,
  comment_count: 0,
  reacted_by_me: false,
  ...changes,
})
const report = (id: string, changes: Partial<Report> = {}): Report => ({
  id,
  video_id: 'v1',
  reporter_id: 'r',
  reason: 'Conteúdo fora das diretrizes',
  status: 'open',
  resolution_note: null,
  created_at: '2026-10-29T12:00:00Z',
  resolved_at: null,
  ...changes,
})
const page = <T,>(data: T[]) => ({ data, pagination: { next_cursor: null, has_more: false } })

function open() {
  render(
    <MemoryRouter>
      <Moderacao />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

test('lista os pendentes e aprova com motivo, enviando o updated_at mostrado', async () => {
  vi.mocked(reviewQueue).mockResolvedValue(page([video('v1')]))
  vi.mocked(decideVideo).mockResolvedValue(video('v1', { status: 'approved' }))
  open()
  expect(await screen.findByText('Legenda v1')).toBeTruthy()
  expect(reviewQueue).toHaveBeenCalledWith('pending', undefined)

  await userEvent.type(screen.getByLabelText('Motivo da decisão'), 'Conteúdo adequado às diretrizes.')
  await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }))

  expect((await screen.findByRole('status')).textContent).toMatch(/Aprovado/)
  expect(decideVideo).toHaveBeenCalledWith('v1', 'approved', 'Conteúdo adequado às diretrizes.', '2026-10-28T12:00:00.123Z')
})

test('exige motivo de 10 caracteres antes de decidir', async () => {
  vi.mocked(reviewQueue).mockResolvedValue(page([video('v1')]))
  open()
  await screen.findByText('Legenda v1')

  await userEvent.type(screen.getByLabelText('Motivo da decisão'), 'curto')
  await userEvent.click(screen.getByRole('button', { name: 'Rejeitar' }))

  expect(screen.getByText(/pelo menos 10 caracteres/)).toBeTruthy()
  expect(decideVideo).not.toHaveBeenCalled()
})

test('conflito 409 mostra o aviso do servidor e mantém os botões', async () => {
  vi.mocked(reviewQueue).mockResolvedValue(page([video('v1')]))
  vi.mocked(decideVideo).mockRejectedValue(new ApiError(409, 'conflict', 'O item foi alterado. Recarregue e revise novamente.'))
  open()
  await screen.findByText('Legenda v1')

  await userEvent.type(screen.getByLabelText('Motivo da decisão'), 'Fora das diretrizes da comunidade.')
  await userEvent.click(screen.getByRole('button', { name: 'Rejeitar' }))

  expect((await screen.findByRole('alert')).textContent).toBe('O item foi alterado. Recarregue e revise novamente.')
  expect((screen.getByRole('button', { name: 'Rejeitar' }) as HTMLButtonElement).disabled).toBe(false)
})

test('fila vazia', async () => {
  vi.mocked(reviewQueue).mockResolvedValue(page([]))
  open()
  expect(await screen.findByText('Nenhum vídeo esperando revisão.')).toBeTruthy()
})

test('denúncias: o vídeo já vem carregado e "Excluir vídeo" rejeita o vídeo e resolve a denúncia', async () => {
  vi.mocked(reviewQueue).mockResolvedValue(page([]))
  vi.mocked(reportQueue).mockResolvedValue(page([report('r1')]))
  vi.mocked(getVideo).mockResolvedValue(video('v1', { status: 'approved' }))
  vi.mocked(decideVideo).mockResolvedValue(video('v1', { status: 'rejected' }))
  vi.mocked(resolveReport).mockResolvedValue(report('r1', { status: 'resolved', resolution_note: 'Vídeo excluído do feed pela moderação.' }))
  open()
  await userEvent.click(screen.getByRole('button', { name: 'Denúncias' }))
  expect(await screen.findByText('Conteúdo fora das diretrizes')).toBeTruthy()
  expect(reportQueue).toHaveBeenCalledWith('open', undefined)
  expect(screen.queryByRole('button', { name: 'Ver o vídeo denunciado' })).toBeNull()

  expect(await screen.findByText('Legenda v1')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Excluir vídeo' }))

  expect(await screen.findByText('Resolução: Vídeo excluído do feed pela moderação.')).toBeTruthy()
  expect(decideVideo).toHaveBeenCalledWith('v1', 'rejected', expect.stringMatching(/moderação/), '2026-10-28T12:00:00.123Z')
  expect(resolveReport).toHaveBeenCalledWith('r1', 'Vídeo excluído do feed pela moderação.')
  expect(screen.queryByRole('button', { name: 'Excluir vídeo' })).toBeNull()
})

test('denúncias: "Deixar no feed" só resolve a denúncia, sem mexer no vídeo', async () => {
  vi.mocked(reviewQueue).mockResolvedValue(page([]))
  vi.mocked(reportQueue).mockResolvedValue(page([report('r1')]))
  vi.mocked(getVideo).mockResolvedValue(video('v1', { status: 'approved' }))
  vi.mocked(resolveReport).mockResolvedValue(report('r1', { status: 'resolved', resolution_note: 'Vídeo avaliado pela moderação e mantido no feed.' }))
  open()
  await userEvent.click(screen.getByRole('button', { name: 'Denúncias' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Deixar no feed' }))

  expect(await screen.findByText(/mantido no feed/)).toBeTruthy()
  expect(decideVideo).not.toHaveBeenCalled()
  expect(resolveReport).toHaveBeenCalledWith('r1', 'Vídeo avaliado pela moderação e mantido no feed.')
})

test('denúncias: se resolver falha depois de rejeitar, tentar de novo não rejeita duas vezes', async () => {
  vi.mocked(reviewQueue).mockResolvedValue(page([]))
  vi.mocked(reportQueue).mockResolvedValue(page([report('r1')]))
  vi.mocked(getVideo).mockResolvedValue(video('v1', { status: 'approved' }))
  vi.mocked(decideVideo).mockResolvedValue(video('v1', { status: 'rejected' }))
  vi.mocked(resolveReport)
    .mockRejectedValueOnce(new ApiError(0, 'network_error', 'Sem conexão com o servidor. Tente novamente.'))
    .mockResolvedValueOnce(report('r1', { status: 'resolved', resolution_note: 'Vídeo excluído do feed pela moderação.' }))
  open()
  await userEvent.click(screen.getByRole('button', { name: 'Denúncias' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir vídeo' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão')

  await userEvent.click(screen.getByRole('button', { name: 'Excluir vídeo' }))
  expect(await screen.findByText(/Resolução:/)).toBeTruthy()
  expect(decideVideo).toHaveBeenCalledTimes(1)
})

test('denúncias: vídeo indisponível permite só encerrar a denúncia', async () => {
  vi.mocked(reviewQueue).mockResolvedValue(page([]))
  vi.mocked(reportQueue).mockResolvedValue(page([report('r1')]))
  vi.mocked(getVideo).mockRejectedValue(new ApiError(404, 'not_found', 'Recurso não encontrado.'))
  vi.mocked(resolveReport).mockResolvedValue(report('r1', { status: 'resolved', resolution_note: 'Vídeo não está mais disponível.' }))
  open()
  await userEvent.click(screen.getByRole('button', { name: 'Denúncias' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Encerrar denúncia' }))

  expect(await screen.findByText('Resolução: Vídeo não está mais disponível.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Excluir vídeo' })).toBeNull()
})
