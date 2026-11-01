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
const MOTIVO = 'Spam ou propaganda'
const DETALHE = 'Repete o mesmo anúncio.'

async function escolher(user: ReturnType<typeof userEvent.setup>, motivo = MOTIVO) {
  await user.click(screen.getByRole('combobox', { name: /Motivo da denúncia/ }))
  await user.click(screen.getByRole('option', { name: motivo }))
}

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

  await escolher(user)
  await user.type(screen.getByLabelText('Quer contar mais? (opcional)'), `  ${DETALHE}  `)
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

  expect(reportVideo).toHaveBeenCalledWith(ID, `${MOTIVO}: ${DETALHE}`)
  expect((await screen.findByRole('status')).textContent).toContain('Denúncia enviada')
  expect(screen.queryByRole('combobox')).toBeNull()
})

test('a descrição é opcional: só o motivo escolhido já basta', async () => {
  const user = userEvent.setup()
  open()
  await escolher(user, 'Assédio ou intimidação')
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

  expect(reportVideo).toHaveBeenCalledWith(ID, 'Assédio ou intimidação')
})

test('sem motivo escolhido não chama a API e mostra o erro no campo', async () => {
  const user = userEvent.setup()
  open()
  await user.type(screen.getByLabelText('Quer contar mais? (opcional)'), 'só a descrição')
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

  expect(reportVideo).not.toHaveBeenCalled()
  expect(screen.getByText('Escolha um motivo para a denúncia.')).toBeTruthy()
  expect(screen.getByRole('combobox').getAttribute('aria-invalid')).toBe('true')
  expect(document.activeElement).toBe(screen.getByRole('combobox'))
})

test('a lista abre, navega por teclado e fecha com Esc', async () => {
  const user = userEvent.setup()
  open()
  const caixa = screen.getByRole('combobox')
  expect(screen.queryByRole('listbox')).toBeNull()
  await user.click(caixa)
  expect(screen.getAllByRole('option').length).toBeGreaterThan(5)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).toBeNull()

  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
  expect(caixa.textContent).toContain('Discurso de ódio ou discriminação')
})

test('denúncia repetida avisa que já foi feita', async () => {
  vi.mocked(reportVideo).mockRejectedValue(new ApiError(409, 'already_reported', 'Você já denunciou este vídeo.'))
  const user = userEvent.setup()
  open()
  await escolher(user)
  await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

  expect((await screen.findByRole('alert')).textContent).toContain('Você já denunciou este vídeo.')
  expect(screen.getByRole('combobox')).toBeTruthy()
})

test('vídeo que saiu do ar (404) e falha de rede têm mensagem própria e deixam tentar de novo', async () => {
  vi.mocked(reportVideo).mockRejectedValueOnce(new ApiError(404, 'not_found', 'Recurso não encontrado.'))
  const user = userEvent.setup()
  open()
  await escolher(user)
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
  await escolher(user)
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
  expect(screen.queryByRole('combobox')).toBeNull()
})

test('o texto digitado é escapado, não interpretado como HTML', async () => {
  const user = userEvent.setup()
  open(ID, { caption: '<img src=x onerror=alert(1)>' })
  expect(screen.getByText('“<img src=x onerror=alert(1)>”')).toBeTruthy()
  expect(document.querySelector('img')).toBeNull()
  await user.type(screen.getByLabelText('Quer contar mais? (opcional)'), '<b>negrito</b> texto')
  expect(document.querySelector('b')).toBeNull()
})
