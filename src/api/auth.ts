import { api, forgetCsrf } from './client.ts'

// UserSelf de docs/api.md do backend.
export type UserSelf = {
  id: string
  name: string
  /** Nome de usuário (@); null nas contas criadas antes dele existir. */
  username: string | null
  email: string
  bio: string
  role: string
  created_at: string
}

export const me = () => api.get<UserSelf>('/me')

// Cadastro não autentica; quem chama faz o login em seguida.
export const register = (name: string, username: string, email: string, password: string) =>
  api.post<UserSelf>('/users', { name, username, email, password })

// `login` aceita e-mail ou nome de usuário: o servidor decide pelo "@".
export const login = async (identifier: string, password: string) =>
  (await api.post<{ user: UserSelf }>('/auth/login', { login: identifier, password })).user

export async function logout(): Promise<void> {
  await api.post<void>('/auth/logout')
  // A sessão acabou no servidor, e o token CSRF morreu com ela.
  forgetCsrf()
}
