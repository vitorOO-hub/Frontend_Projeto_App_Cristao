import { useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router'
import { login, register, type UserSelf } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { Field, PasswordField } from '../components/Field.tsx'
import Layout, { Spinner } from '../components/Layout.tsx'
import { errorMessage } from '../errorMessage.ts'
import { useFieldErrors } from '../useFieldErrors.ts'

// Mesmas regras do backend (docs/api.md); o navegador confere antes de enviar.
const RULES =
  'Confira os dados: nome com 2 a 80 caracteres, usuário com 3 a 30 (letras, números, ponto e _), e-mail válido e senha com 12 a 128 caracteres.'
// Mesmo padrão do backend (USERNAME_PATTERN); maiúsculas passam porque o servidor converte para minúsculas.
const USERNAME_PATTERN = '(?!.*\\.\\.)[A-Za-z0-9_][A-Za-z0-9._]{1,28}[A-Za-z0-9_]'
// Dado repetido é problema do campo, não do formulário inteiro.
const CONFLICTS: Record<string, [field: string, message: string]> = {
  email_conflict: ['email', 'Este e-mail já tem uma conta. Tente entrar.'],
  username_conflict: ['username', 'Este usuário já existe. Escolha outro.'],
}

export default function Cadastro({ onLogin }: { onLogin: (user: UserSelf) => void }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Conta já criada neste formulário (com quais dados), caso o login logo depois tenha falhado.
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const fields = useFieldErrors()
  const accountExists = created?.email === email && created.password === password

  async function submit(form: HTMLFormElement) {
    setLoading(true)
    setError('')
    // Repetir o cadastro de uma conta que já existe só devolveria 409; neste caso basta tentar entrar.
    if (!accountExists) {
      try {
        await register(name, username, email, password)
        setCreated({ email, password })
      } catch (e) {
        const conflict = e instanceof ApiError ? CONFLICTS[e.code] : undefined
        if (conflict) {
          const [field, message] = conflict
          flushSync(() => fields.setError(field, message))
          // Com o erro já na tela, o foco faz o leitor de tela anunciá-lo.
          ;(form.elements.namedItem(field) as HTMLInputElement | null)?.focus()
        } else setError(errorMessage(e, RULES))
        setLoading(false)
        return
      }
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
      sentence="Leva um minuto. Depois é só assistir louvor e devocional."
      nav={
        <>
          Já tem conta? <Link to="/login">Entrar</Link>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (fields.checkForm(event.currentTarget)) void submit(event.currentTarget)
        }}
      >
        <Field
          label="Nome"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          // O servidor aplica trim: exige 2 caracteres que não sejam espaço nas pontas.
          pattern="\s*\S[\s\S]*\S\s*"
          value={name}
          error={fields.errors.name}
          onBlur={fields.onBlur}
          onChange={(e) => {
            setName(e.target.value)
            fields.onChange(e)
          }}
        />
        <Field
          label="Usuário"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={30}
          pattern={USERNAME_PATTERN}
          data-pattern-message="Use letras, números, ponto e _, sem ponto no começo, no fim ou repetido."
          hint="Seu @. Também serve para entrar."
          value={username}
          error={fields.errors.username}
          onBlur={fields.onBlur}
          onChange={(e) => {
            setUsername(e.target.value)
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
          hint="De 12 a 128 caracteres."
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
          {loading ? (accountExists ? 'Entrando…' : 'Criando conta…') : accountExists ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </Layout>
  )
}
