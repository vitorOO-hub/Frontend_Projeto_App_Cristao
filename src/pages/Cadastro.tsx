import { useState } from 'react'
import { Link } from 'react-router'
import { login, register, type UserSelf } from '../api/auth.ts'
import { errorMessage } from '../errorMessage.ts'

// Mesmas regras do backend (docs/api.md); o navegador valida antes de enviar.
const RULES = 'Confira os dados: nome com 2 a 80 caracteres, e-mail válido e senha com 12 a 128 caracteres.'

export default function Cadastro({ onLogin }: { onLogin: (user: UserSelf) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setLoading(true)
    setError('')
    try {
      await register(name, email, password)
    } catch (e) {
      setError(errorMessage(e, RULES))
      setLoading(false)
      return
    }
    try {
      onLogin(await login(email, password))
    } catch (e) {
      setError(`Conta criada, mas não deu para entrar agora: ${errorMessage(e)}`)
      setLoading(false)
    }
  }

  return (
    <main>
      <h1>Criar conta</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label>
          Nome
          <input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          E-mail
          <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <small>De 12 a 128 caracteres.</small>
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
      <p>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </main>
  )
}
