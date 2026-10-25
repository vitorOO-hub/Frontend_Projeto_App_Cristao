import { useState } from 'react'
import { Link } from 'react-router'
import { login, type UserSelf } from '../api/auth.ts'
import { errorMessage } from '../errorMessage.ts'

export default function Login({ onLogin }: { onLogin: (user: UserSelf) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setLoading(true)
    setError('')
    try {
      onLogin(await login(email, password))
    } catch (e) {
      setError(errorMessage(e))
      setLoading(false)
    }
  }

  return (
    <main>
      <h1>Entrar</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label>
          E-mail
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p>
        Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
      </p>
    </main>
  )
}
