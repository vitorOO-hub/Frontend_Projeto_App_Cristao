// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { ApiError } from '../api/client.ts'
import { publishVideo } from '../api/publish.ts'
import Publicar from './Publicar.tsx'

vi.mock('../api/publish.ts', async (original) => ({ ...(await original<typeof import('../api/publish.ts')>()), publishVideo: vi.fn() }))

const mp4 = () => new File(['x'], 'louvor.mp4', { type: 'video/mp4' })

function open() {
  render(
    <MemoryRouter>
      <Publicar />
    </MemoryRouter>,
  )
}

async function fill(file: File = mp4(), applyAccept = true) {
  await userEvent.setup({ applyAccept }).upload(screen.getByLabelText('Arquivo de vídeo'), file)
  await userEvent.type(screen.getByLabelText('Legenda'), 'Louvor da manhã')
  await userEvent.click(screen.getByRole('combobox', { name: /Categoria/ }))
  await userEvent.click(screen.getByRole('option', { name: 'Louvor' }))
}

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

test('sem preencher nada, mostra o que falta e não envia', async () => {
  open()
  await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

  expect(screen.getByText('Escolha um arquivo de vídeo.')).toBeTruthy()
  expect(screen.getByText(/Escreva uma legenda/)).toBeTruthy()
  expect(screen.getByText('Escolha uma categoria.')).toBeTruthy()
  expect(publishVideo).not.toHaveBeenCalled()
})

test('recusa arquivo que não é .mp4', async () => {
  open()
  // O seletor do navegador deixa escolher "Todos os arquivos"; o `accept` não impede.
  await fill(new File(['x'], 'foto.png', { type: 'image/png' }), false)
  await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

  expect(screen.getByText('O arquivo precisa ser um MP4 (.mp4).')).toBeTruthy()
  expect(publishVideo).not.toHaveBeenCalled()
})

test('envia arquivo, legenda, categoria e referência e avisa que está em análise', async () => {
  vi.mocked(publishVideo).mockResolvedValue({} as never)
  open()
  const file = mp4()
  await fill(file)
  await userEvent.type(screen.getByLabelText('Referência bíblica (opcional)'), 'Salmos 23:1')
  await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

  expect(publishVideo).toHaveBeenCalledWith({ file, caption: 'Louvor da manhã', category: 'louvor', bibleReference: 'Salmos 23:1' })
  expect((await screen.findByRole('status')).textContent).toMatch(/em análise/)
  expect(screen.getByRole('link', { name: 'Ver meus vídeos' }).getAttribute('href')).toBe('/perfil')
})

test('mostra a recusa do servidor e permite tentar de novo', async () => {
  vi.mocked(publishVideo).mockRejectedValue(new ApiError(422, 'invalid_media', 'O vídeo passa de 90 segundos.'))
  open()
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

  expect((await screen.findByRole('alert')).textContent).toBe('O vídeo passa de 90 segundos.')
  expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(false)
})
