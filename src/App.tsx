import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router'
import { me, type UserSelf } from './api/auth.ts'
import AppRoutes from './AppRoutes.tsx'
import { Spinner } from './components/Layout.tsx'

export default function App() {
  // undefined: ainda consultando GET /me; null: ninguém logado.
  const [user, setUser] = useState<UserSelf | null | undefined>(undefined)

  useEffect(() => {
    me().then(setUser, () => setUser(null))
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
      <AppRoutes user={user} setUser={setUser} />
    </BrowserRouter>
  )
}
