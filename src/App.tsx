import { useEffect, useRef, useState } from 'react'
import { BrowserRouter } from 'react-router'
import { me, type UserSelf } from './api/auth.ts'
import { onUnauthenticated } from './api/client.ts'
import AppRoutes from './AppRoutes.tsx'
import { Spinner } from './components/Layout.tsx'

export default function App() {
  // undefined: ainda consultando GET /me; null: ninguém logado.
  const [user, setUser] = useState<UserSelf | null | undefined>(undefined)

  const [expired, setExpired] = useState(false)
  const signedIn = useRef(false)
  useEffect(() => {
    signedIn.current = Boolean(user)
  }, [user])

  useEffect(() => {
    me().then(setUser, () => setUser(null))
    // Uma chamada qualquer descobriu que a sessão acabou: as rotas protegidas mandam para o login.
    return onUnauthenticated(() => {
      if (signedIn.current) setExpired(true)
      setUser(null)
    })
  }, [])

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
