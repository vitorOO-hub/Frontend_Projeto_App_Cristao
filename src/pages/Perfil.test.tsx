// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { UserSelf } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { myFollowers, myFollowing, myProfile, reactedVideos, type UserPublic, type Video } from '../api/profile.ts'
import { myVideos, type VideoOwn } from '../api/videos.ts'
import Perfil from './Perfil.tsx'

vi.mock('../api/profile.ts', () => ({
  myProfile: vi.fn(),
  reactedVideos: vi.fn(),
  myFollowers: vi.fn(),
  myFollowing: vi.fn(),
}))
vi.mock('../api/videos.ts', () => ({ myVideos: vi.fn() }))

const maria: UserSelf = {
  id: 'u1',
  name: 'Maria Souza',
  username: 'maria',
  email: 'maria@exemplo.com',
  bio: 'Louvor e café.',
  role: 'user',
  created_at: '2026-10-27T00:00:00Z',
}
const counts = { videos: 3, amens_received: 12, reacted: 5, followers: 7, following: 4 }

const person = (id: string, name: string, username: string | null = null): UserPublic => ({
  id,
  name,
  username,
  bio: '',
  created_at: '2026-10-27T12:00:00Z',
})
const video = (id: string, caption: string): Video & VideoOwn =>
  ({
    id,
    author: person('a1', 'Bia', 'bia'),
    caption,
    category: 'louvor',
    bible_reference: null,
    status: 'approved',
    created_at: '2026-10-27T12:00:00Z',
    updated_at: '2026-10-27T12:00:00Z',
    duration_seconds: 65,
    media_url: `/api/videos/${id}/media`,
    reaction_count: 0,
    comment_count: 0,
    reacted_by_me: false,
    review_reason: null,
  }) as Video & VideoOwn
const page = <T,>(data: T[], next: string | null = null) => ({ data, pagination: { next_cursor: next, has_more: next !== null } })

beforeEach(() => {
  for (const mock of [myProfile, reactedVideos, myFollowers, myFollowing, myVideos]) vi.mocked(mock as () => unknown).mockReset()
  vi.mocked(myProfile).mockResolvedValue({ user: maria, counts })
  vi.mocked(myVideos).mockResolvedValue(page([video('v1', 'Louvor da manhã')]))
  vi.mocked(reactedVideos).mockResolvedValue(page([video('v2', 'Salmo 23')]))
  vi.mocked(myFollowers).mockResolvedValue(page([person('p1', 'Ana Lima', 'ana')]))
  vi.mocked(myFollowing).mockResolvedValue(page([person('p2', 'Caio Reis')]))
})
afterEach(cleanup)

const open = () =>
  render(
    <MemoryRouter>
      <Perfil />
    </MemoryRouter>,
  )

const tab = (name: string) => screen.getByRole('tab', { name })

test('mostra quem é o usuário e os cinco números vindos da API', async () => {
  open()
  expect(await screen.findByRole('heading', { name: 'Maria Souza' })).toBeTruthy()
  expect(screen.getByText('@maria')).toBeTruthy()
  expect(screen.getByText('Louvor e café.')).toBeTruthy()
  const stats = within(screen.getByRole('list', { name: 'Números do perfil' }))
  expect(stats.getByText('3').parentElement?.textContent).toContain('Vídeos aprovados')
  expect(stats.getByText('12').parentElement?.textContent).toContain('Amens recebidos')
  expect(stats.getByText('5').parentElement?.textContent).toContain('Curtidos')
  expect(stats.getByText('7').parentElement?.textContent).toContain('Seguidores')
  expect(stats.getByText('4').parentElement?.textContent).toContain('Seguindo')
})

test('abre na aba Meus vídeos, com os vídeos do usuário em qualquer situação', async () => {
  open()
  expect(await screen.findByText('Louvor da manhã')).toBeTruthy()
  expect(myVideos).toHaveBeenCalledWith(undefined, undefined)
  expect(tab('Meus vídeos').getAttribute('aria-selected')).toBe('true')
  expect(screen.getByRole('button', { name: 'Rejeitados' })).toBeTruthy()
  expect(reactedVideos).not.toHaveBeenCalled()
})

test('cada aba busca o que é dela, só quando é aberta', async () => {
  const typed = userEvent.setup()
  open()
  await screen.findByText('Louvor da manhã')

  await typed.click(tab('Curtidos'))
  expect(await screen.findByText('Salmo 23')).toBeTruthy()
  expect(screen.getByText(/Bia/)).toBeTruthy()
  expect(tab('Curtidos').getAttribute('aria-selected')).toBe('true')

  await typed.click(tab('Seguidores'))
  expect(await screen.findByText('Ana Lima')).toBeTruthy()
  expect(screen.getByText('@ana')).toBeTruthy()
  expect(myFollowing).not.toHaveBeenCalled()

  await typed.click(tab('Seguindo'))
  expect(await screen.findByText('Caio Reis')).toBeTruthy()
})

test.each([
  ['Meus vídeos', 'Você ainda não publicou nenhum vídeo.'],
  ['Curtidos', 'Você ainda não disse Amém a nenhum vídeo.'],
  ['Seguidores', 'Ninguém segue você ainda.'],
  ['Seguindo', 'Você ainda não segue ninguém.'],
])('aba %s vazia explica o que aparecerá aqui', async (name, message) => {
  const typed = userEvent.setup()
  vi.mocked(myVideos).mockResolvedValue(page([]))
  vi.mocked(reactedVideos).mockResolvedValue(page([]))
  vi.mocked(myFollowers).mockResolvedValue(page([]))
  vi.mocked(myFollowing).mockResolvedValue(page([]))
  open()
  await screen.findByRole('heading', { name: 'Maria Souza' })
  await typed.click(tab(name))
  expect(await screen.findByText(message)).toBeTruthy()
})

test('erro ao carregar o perfil mostra o aviso e "Tentar de novo" busca outra vez', async () => {
  vi.mocked(myProfile)
    .mockRejectedValueOnce(new ApiError(0, 'network_error', 'Sem conexão com o servidor. Tente novamente.'))
    .mockResolvedValue({ user: maria, counts })
  const typed = userEvent.setup()
  open()

  expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão com o servidor')
  await typed.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(await screen.findByRole('heading', { name: 'Maria Souza' })).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})

test('erro numa aba aparece só nela, e repetir busca o mesmo pedido', async () => {
  vi.mocked(myFollowers)
    .mockRejectedValueOnce(new ApiError(503, 'data_unavailable', 'Serviço temporariamente indisponível.'))
    .mockResolvedValue(page([person('p1', 'Ana Lima')]))
  const typed = userEvent.setup()
  open()
  await screen.findByText('Louvor da manhã')

  await typed.click(tab('Seguidores'))
  expect((await screen.findByRole('alert')).textContent).toContain('Serviço temporariamente indisponível')
  expect(screen.getByRole('heading', { name: 'Maria Souza' })).toBeTruthy()
  await typed.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(await screen.findByText('Ana Lima')).toBeTruthy()
  expect(myFollowers).toHaveBeenCalledTimes(2)
})

test('"Carregar mais" manda o cursor e anexa sem repetir', async () => {
  vi.mocked(myFollowers).mockResolvedValueOnce(page([person('p1', 'Ana Lima')], 'c1')).mockResolvedValueOnce(page([person('p3', 'Davi Rocha')]))
  const typed = userEvent.setup()
  open()
  await screen.findByText('Louvor da manhã')
  await typed.click(tab('Seguidores'))

  await typed.click(await screen.findByRole('button', { name: 'Carregar mais' }))
  expect(await screen.findByText('Davi Rocha')).toBeTruthy()
  expect(myFollowers).toHaveBeenLastCalledWith('c1')
  expect(screen.getByText('Ana Lima')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull()
})

test('as setas trocam de aba e levam o foco junto', async () => {
  const typed = userEvent.setup()
  open()
  await screen.findByText('Louvor da manhã')
  tab('Meus vídeos').focus()
  await typed.keyboard('{ArrowRight}')
  expect(tab('Curtidos').getAttribute('aria-selected')).toBe('true')
  expect(document.activeElement).toBe(tab('Curtidos'))
})

test('há um caminho de volta para o início', async () => {
  open()
  expect(screen.getByRole('link', { name: /Início/ }).getAttribute('href')).toBe('/')
})

test('em Curtidos, vídeo de outra pessoa tem o link Denunciar; o do próprio usuário não', async () => {
  const typed = userEvent.setup()
  const own = { ...video('v3', 'Meu próprio vídeo'), author: person('u1', 'Maria Souza') }
  vi.mocked(reactedVideos).mockResolvedValue(page([video('v2', 'Salmo 23'), own]))
  open()
  await screen.findByText('Louvor da manhã')
  await typed.click(tab('Curtidos'))
  await screen.findByText('Salmo 23')

  const links = screen.getAllByRole('link', { name: 'Denunciar' })
  expect(links).toHaveLength(1)
  expect(links[0].getAttribute('href')).toBe('/videos/v2/denunciar')
})
