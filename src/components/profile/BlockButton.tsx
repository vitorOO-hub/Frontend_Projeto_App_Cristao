import { useRef, useState } from 'react'
import { blockUser } from '../../api/blocks.ts'
import { errorMessage } from '../../lib/errorMessage.ts'
import { invalidateVisibility } from '../../lib/visibility.ts'
export default function BlockButton({ userId, name }: { userId: string; name: string }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  async function block() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await blockUser(userId); setConfirm(false); invalidateVisibility() }
    catch (e) { setError(errorMessage(e)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <span className="block-control">
    {!confirm ? <button className="vfilter" type="button" onClick={() => setConfirm(true)}>Bloquear {name}</button> : <>
      <span>Ocultar vídeos e comentários de {name} para você?</span>
      <button className="vfilter" type="button" disabled={busy} onClick={() => void block()}>{busy ? 'Bloqueando…' : 'Confirmar bloqueio'}</button>
      <button className="vfilter" type="button" disabled={busy} onClick={() => setConfirm(false)}>Cancelar</button>
    </>}
    {error && <span role="alert" className="alert">{error}</span>}
  </span>
}
