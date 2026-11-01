import { useEffect, useRef, useState } from 'react'
import { BrowserRouter } from 'react-router'
import { me, type UserSelf } from './api/auth.ts'
import { ApiError, onUnauthenticated } from './api/client.ts'
import AppRoutes from './AppRoutes.tsx'
import { Spinner } from './components/ui/Layout.tsx'
import { errorMessage } from './lib/errorMessage.ts'

export default function App() {
  // undefined: ainda consultando GET /me; null: ninguém logado.
  const [user, setUser] = useState<UserSelf | null | undefined>(undefined)

  // Falha ao consultar a sessão que não prova que ninguém está logado (sem rede, servidor fora do ar).
  const [sessionError, setSessionError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [expired, setExpired] = useState(false)
  const signedIn = useRef(false)
  useEffect(() => {
    signedIn.current = Boolean(user)
  }, [user])

  useEffect(() => {
    me().then(setUser, (e) => {
      // 401 é "ninguém logado"; qualquer outra falha não diz nada sobre a sessão e não pode mandar ao login.
      if (e instanceof ApiError && e.status === 401) setUser(null)
      else setSessionError(errorMessage(e))
    })
    // Uma chamada qualquer descobriu que a sessão acabou: as rotas protegidas mandam para o login.
    return onUnauthenticated(() => {
      if (signedIn.current) setExpired(true)
      setUser(null)
    })
  }, [attempt])

  if (user === undefined && sessionError) {
    return (
      <div className="loading">
        <div role="alert" className="alert vstate-error">
          {sessionError}
          <button
            type="button"
            className="vfilter"
            onClick={() => {
              setSessionError('')
              setAttempt((n) => n + 1)
            }}
          >
            Tentar de novo
          </button>
        </div>
      </div>
    )
  }

  if (user === undefined) {
    return (
      <div className="loading" role="status">
        <Spinner />
        Carregando…
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppRoutes
        user={user}
        setUser={(next) => {
          if (next) setExpired(false)
          setUser(next)
        }}
        notice={expired ? 'Sua sessão expirou. Entre de novo.' : undefined}
      />
    </BrowserRouter>
  )
}
