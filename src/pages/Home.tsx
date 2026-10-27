import { useState } from 'react'
import { logout, type UserSelf } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import Layout, { Spinner } from '../components/Layout.tsx'
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
    <Layout
      title={`Olá, ${user.name.trim().split(/\s+/)[0]}`}
      sentence="Os primeiros vídeos aprovados vão aparecer aqui. Enquanto isso, veja como vai ser o feed."
    >
      <div className="profile">
        <span className="avatar" aria-hidden="true">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span>
          <span className="profile-name">{user.name}</span>
          <span className="profile-email">{user.email}</span>
        </span>
      </div>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <button type="button" className="button" onClick={() => void sair()} disabled={loading}>
        {loading && <Spinner />}
        {loading ? 'Saindo…' : 'Sair'}
      </button>
    </Layout>
  )
}
