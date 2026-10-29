// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import Lives from './Lives.tsx'

afterEach(cleanup)

const open = () =>
  render(
    <MemoryRouter>
      <Lives />
    </MemoryRouter>,
  )

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed')

test('sem nenhuma live, a página explica que ainda não há transmissões', () => {
  open()
  expect(screen.getByRole('heading', { name: 'Lives' })).toBeTruthy()
  expect(screen.getByText('Nenhuma live no momento.')).toBeTruthy()
})

test('o filtro de categoria oferece as mesmas categorias do feed e começa em "Todas"', () => {
  open()
  const names = ['Todas', 'Louvor', 'Devocional', 'Testemunho', 'Humor', 'Estudo bíblico']
  for (const name of names) expect(screen.getByRole('button', { name })).toBeTruthy()
  expect(pressed('Todas')).toBe('true')
})

test('escolher uma categoria marca só ela e a mensagem passa a citá-la', async () => {
  const typed = userEvent.setup()
  open()
  await typed.click(screen.getByRole('button', { name: 'Louvor' }))

  expect(pressed('Louvor')).toBe('true')
  expect(pressed('Todas')).toBe('false')
  expect(screen.getByText('Nenhuma live de Louvor no momento.')).toBeTruthy()
})

test('"Minha igreja" aparece desligada: ainda não pedimos a igreja de ninguém', () => {
  open()
  expect(pressed('Todas as igrejas')).toBe('true')
  const mine = screen.getByRole('button', { name: /Minha igreja/ }) as HTMLButtonElement
  expect(mine.disabled).toBe(true)
  expect(screen.getByText('Em breve')).toBeTruthy()
})

test('há um caminho de volta para o início', () => {
  open()
  expect(screen.getByRole('link', { name: /Início/ }).getAttribute('href')).toBe('/')
})
