import { Navigate, Route, Routes } from 'react-router'
import type { UserSelf } from './api/auth.ts'
import { GuestOnly, RequireAuth } from './components/RouteGuards.tsx'
import Cadastro from './pages/Cadastro.tsx'
import Denunciar from './pages/Denunciar.tsx'
import Feed from './pages/Feed.tsx'
import Home from './pages/Home.tsx'
import Lives from './pages/Lives.tsx'
import Login from './pages/Login.tsx'
import Moderacao from './pages/Moderacao.tsx'
import Perfil from './pages/Perfil.tsx'
import PerfilPublico from './pages/PerfilPublico.tsx'
import Publicar from './pages/Publicar.tsx'
import VideoDetalhe from './pages/VideoDetalhe.tsx'

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
          user ? <Home user={user} onLogout={() => setUser(null)} /> : <Navigate to="/feed" replace />
        }
      />
      {/* Meus vídeos agora é uma aba do perfil; o endereço antigo continua funcionando. */}
      <Route
        path="/feed"
        element={<Feed key={user?.id ?? 'visitante'} selfId={user?.id} />}
      />
      <Route
        path="/publicar"
        element={<RequireAuth signedIn={signedIn}><Publicar /></RequireAuth>}
      />
      {/* Só administradores; o servidor confere o papel de novo em cada chamada. */}
      <Route
        path="/moderacao"
        element={
          <RequireAuth signedIn={signedIn}>{user?.role === 'admin' ? <Moderacao /> : <Navigate to="/" replace />}</RequireAuth>
        }
      />
      <Route path="/usuarios/:id" element={<PerfilPublico selfId={user?.id} />} />
      <Route path="/videos/:id" element={<VideoDetalhe selfId={user?.id} />} />
      <Route path="/meus-videos" element={<Navigate to="/perfil" replace />} />
      <Route
        path="/perfil"
        element={
          <RequireAuth signedIn={signedIn}>
            <Perfil key={user?.id} onUserChange={setUser} />
          </RequireAuth>
        }
      />
      <Route
        path="/videos/:id/denunciar"
        element={
          <RequireAuth signedIn={signedIn}>
            <Denunciar />
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
