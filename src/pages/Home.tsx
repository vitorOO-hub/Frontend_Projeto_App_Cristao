import { useState } from 'react'
import { Link } from 'react-router'
import { logout, type UserSelf } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import Layout, { Spinner } from '../components/Layout.tsx'
import { errorMessage } from '../errorMessage.ts'

// Início: mostra quem está logado, leva ao feed, ao perfil e às lives, e permite sair.
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
      sentence="Veja os vídeos aprovados no feed, acompanhe seu perfil ou saia da conta."
    >
      <div className="profile">
        <span className="avatar" aria-hidden="true">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span>
          <span className="profile-name">{user.name}</span>
          {user.username && <span className="profile-email">@{user.username}</span>}
          <span className="profile-email">{user.email}</span>
        </span>
      </div>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <Link to="/feed" className="button">
        Feed
      </Link>
      <Link to="/publicar" className="button">
        Publicar vídeo
      </Link>
      {user.role === 'admin' && (
        <Link to="/moderacao" className="button">
          Moderação
        </Link>
      )}
      <Link to="/perfil" className="button">
        Perfil
      </Link>
      <Link to="/lives" className="button">
        Lives
      </Link>
      <button type="button" className="button" onClick={() => void sair()} disabled={loading}>
        {loading && <Spinner />}
        {loading ? 'Saindo…' : 'Sair'}
      </button>
    </Layout>
  )
}
