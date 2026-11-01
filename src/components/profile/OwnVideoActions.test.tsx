// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { deleteVideo, editVideo, type VideoOwn } from '../../api/videos.ts'
import OwnVideoActions from './OwnVideoActions.tsx'

vi.mock('../../api/videos.ts', () => ({ editVideo: vi.fn(), deleteVideo: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const video: VideoOwn = { id: 'v1', caption: 'Minha legenda', category: 'louvor', bible_reference: 'Salmos 23:1', status: 'approved', created_at: '', updated_at: '', duration_seconds: 10, media_url: '/api/videos/v1/media', review_reason: null }

test('edita metadados próprios e avisa que aprovado volta a análise', async () => {
  const changed = vi.fn()
  vi.mocked(editVideo).mockResolvedValue({ ...video, status: 'pending' })
  render(<OwnVideoActions video={video} onChanged={changed} />)
  await userEvent.click(screen.getByRole('button', { name: 'Editar vídeo' }))
  expect(screen.getByText(/volta para análise/)).toBeTruthy()
  await userEvent.clear(screen.getByLabelText('Legenda'))
  await userEvent.type(screen.getByLabelText('Legenda'), 'Nova legenda')
  await userEvent.clear(screen.getByLabelText('Referência bíblica'))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(editVideo).toHaveBeenCalledWith('v1', { caption: 'Nova legenda', category: 'louvor', bible_reference: null })
  expect(changed).toHaveBeenCalledOnce()
})

test('exclusão só é enviada após confirmar e aceita resposta vazia', async () => {
  const changed = vi.fn()
  vi.mocked(deleteVideo).mockResolvedValue(undefined)
  render(<OwnVideoActions video={video} onChanged={changed} />)
  await userEvent.click(screen.getByRole('button', { name: 'Excluir vídeo' }))
  expect(deleteVideo).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))
  expect(deleteVideo).toHaveBeenCalledWith('v1')
  expect(changed).toHaveBeenCalledOnce()
})

test('erro de permissão/conflito mantém formulário e não anuncia sucesso', async () => {
  const changed = vi.fn()
  vi.mocked(editVideo).mockRejectedValue(new Error('Sem permissão.'))
  render(<OwnVideoActions video={video} onChanged={changed} />)
  await userEvent.click(screen.getByRole('button', { name: 'Editar vídeo' }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByRole('form', { name: 'Editar vídeo' })).toBeTruthy()
  expect(changed).not.toHaveBeenCalled()
})
