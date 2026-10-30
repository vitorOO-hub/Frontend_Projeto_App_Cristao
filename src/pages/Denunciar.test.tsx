// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '../api/client.ts'
import { reportVideo } from '../api/reports.ts'
import Denunciar from './Denunciar.tsx'

vi.mock('../api/reports.ts', async (original) => ({
  ...(await original<typeof import('../api/reports.ts')>()),
  reportVideo: vi.fn(),
}))

const ID = 'a'.repeat(24)
const MOTIVO = 'Conteúdo ofensivo no vídeo.'

function open(id = ID, state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: `/videos/${id}/denunciar`, state }]}>
      <Routes>
        <Route path="/videos/:id/denunciar" element={<Denunciar />} />
        <Route path="/perfil" element={<p>tela de perfil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.mocked(reportVideo).mockResolvedValue({ id: 'r1', status: 'open' }))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

test('envia o motivo sem espaços nas pontas e confirma a denúncia', async () => {
  const user = userEvent.setup()
  open(ID, { caption: 'Meu testemunho' })
  expect(screen.getByText('“Meu testemunho”')).toBeTruthy()

  await user.type(screen.getByLabelText('Motivo da denúncia'), `  ${MOTIVO}  `)
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

  expect(reportVideo).toHaveBeenCalledWith(ID, MOTIVO)
  expect((await screen.findByRole('status')).textContent).toContain('Denúncia enviada')
  expect(screen.queryByLabelText('Motivo da denúncia')).toBeNull()
})

test('motivo curto não chama a API e mostra o erro no campo', async () => {
  const user = userEvent.setup()
  open()
  await user.type(screen.getByLabelText('Motivo da denúncia'), 'curto   ')
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

  expect(reportVideo).not.toHaveBeenCalled()
  expect(screen.getByText(/pelo menos 10 caracteres/).textContent).toContain('(5/1000)')
  expect(screen.getByLabelText('Motivo da denúncia').getAttribute('aria-invalid')).toBe('true')
  expect(document.activeElement).toBe(screen.getByLabelText('Motivo da denúncia'))
})

test('denúncia repetida avisa que já foi feita', async () => {
  vi.mocked(reportVideo).mockRejectedValue(new ApiError(409, 'already_reported', 'Você já denunciou este vídeo.'))
  const user = userEvent.setup()
  open()
  await user.type(screen.getByLabelText('Motivo da denúncia'), MOTIVO)
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

  expect((await screen.findByRole('alert')).textContent).toContain('Você já denunciou este vídeo.')
  expect(screen.getByLabelText('Motivo da denúncia')).toBeTruthy()
})

test('vídeo que saiu do ar (404) e falha de rede têm mensagem própria e deixam tentar de novo', async () => {
  vi.mocked(reportVideo).mockRejectedValueOnce(new ApiError(404, 'not_found', 'Recurso não encontrado.'))
  const user = userEvent.setup()
  open()
  await user.type(screen.getByLabelText('Motivo da denúncia'), MOTIVO)
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))
  expect((await screen.findByRole('alert')).textContent).toContain('não está mais disponível')

  vi.mocked(reportVideo).mockRejectedValueOnce(new ApiError(0, 'network_error', 'Sem conexão com o servidor. Tente novamente.'))
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão com o servidor.')

  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))
  expect((await screen.findByRole('status')).textContent).toContain('Denúncia enviada')
  expect(reportVideo).toHaveBeenCalledTimes(3)
})

test('não envia duas vezes enquanto a primeira ainda está em andamento', async () => {
  let finish: (value: { id: string; status: 'open' }) => void = () => {}
  vi.mocked(reportVideo).mockReturnValue(new Promise((resolve) => (finish = resolve)))
  const user = userEvent.setup()
  open()
  await user.type(screen.getByLabelText('Motivo da denúncia'), MOTIVO)
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))
  const busy = screen.getByRole('button', { name: 'Enviando…' }) as HTMLButtonElement
  expect(busy.disabled).toBe(true)
  await user.click(busy)

  expect(reportVideo).toHaveBeenCalledTimes(1)
  finish({ id: 'r1', status: 'open' })
  expect(await screen.findByRole('status')).toBeTruthy()
})

test('identificador que não é de vídeo nem chega à API', () => {
  open('nao-e-um-id')
  expect(screen.getByRole('alert').textContent).toBe('Vídeo inválido.')
  expect(screen.queryByLabelText('Motivo da denúncia')).toBeNull()
})

test('o texto digitado é escapado, não interpretado como HTML', async () => {
  const user = userEvent.setup()
  open(ID, { caption: '<img src=x onerror=alert(1)>' })
  expect(screen.getByText('“<img src=x onerror=alert(1)>”')).toBeTruthy()
  expect(document.querySelector('img')).toBeNull()
  await user.type(screen.getByLabelText('Motivo da denúncia'), '<b>negrito</b> texto')
  expect(document.querySelector('b')).toBeNull()
})
