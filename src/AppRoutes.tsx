import { Navigate, Route, Routes } from 'react-router'
import type { UserSelf } from './api/auth.ts'
import { GuestOnly, RequireAuth } from './components/RouteGuards.tsx'
import Cadastro from './pages/Cadastro.tsx'
import Home from './pages/Home.tsx'
import Lives from './pages/Lives.tsx'
import Login from './pages/Login.tsx'
import MeusVideos from './pages/MeusVideos.tsx'

type AppRoutesProps = {
  user: UserSelf | null
  setUser: (user: UserSelf | null) => void
  /** Aviso para a tela de login (ex.: a sessão expirou). */
  notice?: string
}

export default function AppRoutes({ user, setUser, notice }: AppRoutesProps) {
  const signedIn = user !== null
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly signedIn={signedIn}>
            <Login onLogin={setUser} notice={notice} />
          </GuestOnly>
        }
      />
      <Route
        path="/cadastro"
        element={
          <GuestOnly signedIn={signedIn}>
            <Cadastro onLogin={setUser} />
          </GuestOnly>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth signedIn={signedIn}>{user && <Home user={user} onLogout={() => setUser(null)} />}</RequireAuth>
        }
      />
      <Route
        path="/meus-videos"
        element={
          <RequireAuth signedIn={signedIn}>
            <MeusVideos />
          </RequireAuth>
        }
      />
      <Route
        path="/lives"
        element={
          <RequireAuth signedIn={signedIn}>
            <Lives />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
