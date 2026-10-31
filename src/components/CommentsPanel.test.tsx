// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { comments, createComment, deleteComment, type Comment } from '../api/comments.ts'
import CommentsPanel from './CommentsPanel.tsx'
import { invalidateVisibility } from '../visibility.ts'
vi.mock('../api/comments.ts', () => ({ comments: vi.fn(), createComment: vi.fn(), deleteComment: vi.fn() }))
const item = (id: string, authorId = 'eu'): Comment => ({ id, video_id: 'v', author: { id: authorId, name: 'Ana', username: null, bio: '', created_at: '' }, text: `Comentário ${id}`, created_at: '' })
const page = (data: Comment[], next: string | null = null) => ({ data, pagination: { next_cursor: next, has_more: !!next } })
beforeEach(() => { vi.mocked(comments).mockResolvedValue(page([])) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
function open(selfId?: string) { const count = vi.fn(); render(<MemoryRouter><CommentsPanel videoId="v" selfId={selfId} onCountChange={count} /></MemoryRouter>); return count }
test('visitante lista comentários e recebe login para publicar, sem remoção de terceiros', async () => {
  vi.mocked(comments).mockResolvedValue(page([item('1')]))
  open()
  expect(await screen.findByText('Comentário 1')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Entre para comentar' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Remover comentário' })).toBeNull()
  expect(createComment).not.toHaveBeenCalled()
})
test('publica texto e remove apenas comentário próprio aceitando 204', async () => {
  vi.mocked(createComment).mockResolvedValue(item('novo'))
  vi.mocked(deleteComment).mockResolvedValue(undefined)
  const count = open('eu')
  await screen.findByText('Nenhum comentário ainda.')
  await userEvent.type(screen.getByLabelText('Seu comentário'), 'Paz!')
  await userEvent.click(screen.getByRole('button', { name: 'Publicar comentário' }))
  expect(await screen.findByText('Comentário novo')).toBeTruthy()
  expect(createComment).toHaveBeenCalledWith('v', 'Paz!')
  expect(count).toHaveBeenCalledWith(1)
  await userEvent.click(screen.getByRole('button', { name: 'Remover comentário' }))
  expect(deleteComment).toHaveBeenCalledWith('novo')
  expect(count).toHaveBeenLastCalledWith(-1)
})
test('paginação não duplica comentário retornado em duas páginas', async () => {
  vi.mocked(comments).mockResolvedValueOnce(page([item('1')], 'next')).mockResolvedValueOnce(page([item('1'), item('2', 'outro')]))
  open('eu')
  await screen.findByText('Comentário 1')
  await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
  await screen.findByText('Comentário 2')
  expect(screen.getAllByText('Comentário 1')).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: 'Remover comentário' })).toHaveLength(1)
})
test('falha ao enviar preserva texto para decisão do usuário, sem repetir o POST', async () => {
  vi.mocked(createComment).mockRejectedValue(new Error('Falha'))
  const count = open('eu')
  await screen.findByText('Nenhum comentário ainda.')
  await userEvent.type(screen.getByLabelText('Seu comentário'), 'Paz!')
  await userEvent.click(screen.getByRole('button', { name: 'Publicar comentário' }))
  await screen.findByRole('alert')
  expect((screen.getByLabelText('Seu comentário') as HTMLTextAreaElement).value).toBe('Paz!')
  expect(createComment).toHaveBeenCalledOnce()
  expect(count).not.toHaveBeenCalled()
})

test('comentário recém-criado fica após páginas antigas carregadas depois, sem duplicar', async () => {
  vi.mocked(comments).mockResolvedValueOnce(page([item('1')], 'next')).mockResolvedValueOnce(page([item('2'), item('3')]))
  vi.mocked(createComment).mockResolvedValue(item('3'))
  open('eu')
  await screen.findByText('Comentário 1')
  await userEvent.type(screen.getByLabelText('Seu comentário'), 'Novo')
  await userEvent.click(screen.getByRole('button', { name: 'Publicar comentário' }))
  await screen.findByText('Comentário 3')
  await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
  await screen.findByText('Comentário 2')
  expect(screen.getAllByText(/Comentário [123]/).map((node) => node.textContent)).toEqual(['Comentário 1', 'Comentário 2', 'Comentário 3'])
})

test('resposta antiga não restaura comentários ocultados após invalidar visibilidade', async () => {
  let resolve!: (value: ReturnType<typeof page>) => void
  vi.mocked(comments).mockReturnValueOnce(new Promise((done) => { resolve = done })).mockResolvedValue(page([]))
  open('eu')
  act(() => invalidateVisibility())
  await screen.findByText('Nenhum comentário ainda.')
  await act(async () => { resolve(page([item('antigo')])) })
  expect(screen.queryByText('Comentário antigo')).toBeNull()
})
