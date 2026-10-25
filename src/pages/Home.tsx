import { useState } from 'react'
import { logout, type UserSelf } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { errorMessage } from '../errorMessage.ts'

// Provisória até o feed (#17): mostra quem está logado e permite sair.
export default function Home({ user, onLogout }: { user: UserSelf; onLogout: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sair() {
    setLoading(true)
    setError('')
    try {
      await logout()
      onLogout()
    } catch (e) {
      // 401: a sessão já tinha acabado no servidor. Outros erros não provam que o logout aconteceu.
      if (e instanceof ApiError && e.status === 401) return onLogout()
      setError(errorMessage(e))
      setLoading(false)
    }
  }

  return (
    <main>
      <h1>Olá, {user.name}</h1>
      <p>Você entrou como {user.email}.</p>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => void sair()} disabled={loading}>
        {loading ? 'Saindo…' : 'Sair'}
      </button>
    </main>
  )
}
