import { api, forgetCsrf } from './client.ts'

// UserSelf de docs/api.md do backend.
export type UserSelf = {
  id: string
  name: string
  email: string
  bio: string
  role: string
  created_at: string
}

export const me = () => api.get<UserSelf>('/me')

// Cadastro não autentica; quem chama faz o login em seguida.
export const register = (name: string, email: string, password: string) =>
  api.post<UserSelf>('/users', { name, email, password })

export const login = async (email: string, password: string) =>
  (await api.post<{ user: UserSelf }>('/auth/login', { email, password })).user

export async function logout(): Promise<void> {
  await api.post<void>('/auth/logout')
  // A sessão acabou no servidor, e o token CSRF morreu com ela.
  forgetCsrf()
}
