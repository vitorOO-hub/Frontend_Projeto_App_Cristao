import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { me, type UserSelf } from './api/auth.ts'
import Cadastro from './pages/Cadastro.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'

export default function App() {
  // undefined: ainda consultando GET /me; null: ninguém logado.
  const [user, setUser] = useState<UserSelf | null | undefined>(undefined)

  useEffect(() => {
    me().then(setUser, () => setUser(null))
  }, [])

  if (user === undefined) {
    return (
      <main>
        <p>Carregando…</p>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Home user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />} />
        <Route path="/cadastro" element={user ? <Navigate to="/" replace /> : <Cadastro onLogin={setUser} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
