import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

/** Para onde voltar depois de entrar: a página que o visitante tentou abrir. */
type From = { pathname: string; search: string; hash: string }

/** Só quem entrou vê a página; o visitante vai para o login e, ao entrar, volta para ela. */
export function RequireAuth({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const location = useLocation()
  if (signedIn) return children
  const from: From = { pathname: location.pathname, search: location.search, hash: location.hash }
  return <Navigate to="/login" replace state={{ from }} />
}

/** Login e cadastro são para visitantes; quem já entrou vai para onde queria ir, ou para o início. */
export function GuestOnly({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const { state } = useLocation()
  if (!signedIn) return children
  const from = (state as { from?: From } | null)?.from
  return <Navigate to={from ? `${from.pathname}${from.search}${from.hash}` : '/'} replace />
}
