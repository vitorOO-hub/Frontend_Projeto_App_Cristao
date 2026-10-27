import { useState } from 'react'
import { Link } from 'react-router'
import { login, type UserSelf } from '../api/auth.ts'
import { Field, PasswordField } from '../components/Field.tsx'
import Layout, { Spinner } from '../components/Layout.tsx'
import { errorMessage } from '../errorMessage.ts'
import { useFieldErrors } from '../useFieldErrors.ts'

export default function Login({ onLogin }: { onLogin: (user: UserSelf) => void }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fields = useFieldErrors()

  async function submit() {
    setLoading(true)
    setError('')
    try {
      onLogin(await login(identifier, password))
    } catch (e) {
      setError(errorMessage(e))
      setLoading(false)
    }
  }

  return (
    <Layout
      title="Fé que cabe no feed."
      sentence="Vídeos curtos de louvor, devocional e testemunho, cada um com o seu versículo."
      nav={
        <>
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (fields.checkForm(event.currentTarget)) void submit()
        }}
      >
        <Field
          label="E-mail ou usuário"
          name="login"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          value={identifier}
          error={fields.errors.login}
          onBlur={fields.onBlur}
          onChange={(e) => {
            setIdentifier(e.target.value)
            fields.onChange(e)
          }}
        />
        <PasswordField
          label="Senha"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          error={fields.errors.password}
          onBlur={fields.onBlur}
          onChange={(e) => {
            setPassword(e.target.value)
            fields.onChange(e)
          }}
        />
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button" disabled={loading}>
          {loading && <Spinner />}
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </Layout>
  )
}
