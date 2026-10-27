import { useState } from 'react'
import { Link } from 'react-router'
import { login, register, type UserSelf } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { Field, PasswordField } from '../components/Field.tsx'
import Layout, { Spinner } from '../components/Layout.tsx'
import { errorMessage } from '../errorMessage.ts'
import { useFieldErrors } from '../useFieldErrors.ts'

// Mesmas regras do backend (docs/api.md); o navegador confere antes de enviar.
const RULES = 'Confira os dados: nome com 2 a 80 caracteres, e-mail válido e senha com 12 a 128 caracteres.'

export default function Cadastro({ onLogin }: { onLogin: (user: UserSelf) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fields = useFieldErrors()

  async function submit() {
    setLoading(true)
    setError('')
    try {
      await register(name, email, password)
    } catch (e) {
      // E-mail repetido é problema do campo, não do formulário inteiro.
      if (e instanceof ApiError && e.code === 'email_conflict') fields.setError('email', 'Este e-mail já tem uma conta. Tente entrar.')
      else setError(errorMessage(e, RULES))
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
    <Layout
      title="Crie sua conta"
      sentence="Leva menos de um minuto. Depois é só assistir, dizer Amém e comentar."
      nav={<Link to="/login">Entrar</Link>}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (fields.checkForm(event.currentTarget)) void submit()
        }}
      >
        <Field
          label="Nome"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          hint="É assim que você vai aparecer no app."
          value={name}
          error={fields.errors.name}
          onBlur={fields.onBlur}
          onChange={(e) => {
            setName(e.target.value)
            fields.onChange(e)
          }}
        />
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          error={fields.errors.email}
          onBlur={fields.onBlur}
          onChange={(e) => {
            setEmail(e.target.value)
            fields.onChange(e)
          }}
        />
        <PasswordField
          label="Senha"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          hint="De 12 a 128 caracteres. Uma frase curta funciona bem."
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
          {loading ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
    </Layout>
  )
}
