// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { updateProfile } from '../api/profile.ts'
import type { UserSelf } from '../api/auth.ts'
import EditProfile from './EditProfile.tsx'
vi.mock('../api/profile.ts', () => ({ updateProfile: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const user: UserSelf = { id: 'eu', name: 'Ana', bio: 'Bio', username: null, email: 'ana@exemplo.com', role: 'user', created_at: '' }
test('salva somente nome/bio e entrega identidade atualizada ao estado global', async () => {
  vi.mocked(updateProfile).mockResolvedValue({ ...user, name: 'Ana Nova' })
  const saved = vi.fn()
  render(<EditProfile user={user} onSaved={saved} />)
  await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }))
  await userEvent.clear(screen.getByLabelText('Nome'))
  await userEvent.type(screen.getByLabelText('Nome'), 'Ana Nova')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
  expect(updateProfile).toHaveBeenCalledWith({ name: 'Ana Nova', bio: 'Bio' })
  expect(saved).toHaveBeenCalledWith({ ...user, name: 'Ana Nova' })
})
test('erro preserva formulário e não muda identidade', async () => {
  vi.mocked(updateProfile).mockRejectedValue(new Error('Falha'))
  const saved = vi.fn()
  render(<EditProfile user={user} onSaved={saved} />)
  await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('form', { name: 'Editar perfil' })).toBeTruthy()
  expect(saved).not.toHaveBeenCalled()
})


test('resposta de edição concluída após desmontagem não restaura identidade', async () => {
  let resolve!: (value: UserSelf) => void
  vi.mocked(updateProfile).mockReturnValueOnce(new Promise((done) => { resolve = done }))
  const saved = vi.fn()
  const view = render(<EditProfile user={user} onSaved={saved} />)
  await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
  expect(updateProfile).toHaveBeenCalledOnce()
  view.unmount()
  await act(async () => { resolve({ ...user, name: 'Ana atrasada' }) })
  expect(saved).not.toHaveBeenCalled()
})

test('troca de conta e retorno à mesma conta não revalidam pedido da montagem anterior', async () => {
  let resolve!: (value: UserSelf) => void
  vi.mocked(updateProfile).mockReturnValueOnce(new Promise((done) => { resolve = done }))
  const saved = vi.fn()
  const other = { ...user, id: 'outra', name: 'Bia' }
  const view = render(<EditProfile user={user} onSaved={saved} />)
  await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
  view.rerender(<EditProfile user={other} onSaved={saved} />)
  await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }))
  expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Bia')
  expect((screen.getByRole('button', { name: 'Salvar perfil' }) as HTMLButtonElement).disabled).toBe(false)
  view.rerender(<EditProfile user={user} onSaved={saved} />)
  await act(async () => { resolve({ ...user, name: 'Ana atrasada' }) })
  expect(saved).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }))
  expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Ana')
})
