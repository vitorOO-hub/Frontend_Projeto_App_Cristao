import { Navigate, Route, Routes } from 'react-router'
import type { UserSelf } from './api/auth.ts'
import { GuestOnly, RequireAuth } from './components/RouteGuards.tsx'
import Cadastro from './pages/Cadastro.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import MeusVideos from './pages/MeusVideos.tsx'

type AppRoutesProps = { user: UserSelf | null; setUser: (user: UserSelf | null) => void }

export default function AppRoutes({ user, setUser }: AppRoutesProps) {
  const signedIn = user !== null
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly signedIn={signedIn}>
            <Login onLogin={setUser} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
