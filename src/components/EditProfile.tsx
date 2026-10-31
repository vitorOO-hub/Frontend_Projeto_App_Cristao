import { useRef, useState, type FormEvent } from 'react'
import type { UserSelf } from '../api/auth.ts'
import { updateProfile } from '../api/profile.ts'
import { errorMessage } from '../errorMessage.ts'
export default function EditProfile({ user, onSaved }: { user: UserSelf; onSaved: (user: UserSelf) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(user.name)
  const [bio, setBio] = useState(user.bio)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  async function save(event: FormEvent) {
    event.preventDefault()
    if (lock.current || name.trim().length < 2) return
    lock.current = true; setBusy(true); setError('')
    try {
      const saved = await updateProfile({ name: name.trim(), bio: bio.trim() })
      onSaved(saved); setOpen(false)
    } catch (e) { setError(errorMessage(e)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="video-management">
    {!open ? <button className="vfilter" type="button" onClick={() => { setName(user.name); setBio(user.bio); setError(''); setOpen(true) }}>Editar perfil</button> : <form aria-label="Editar perfil" onSubmit={(event) => void save(event)}>
      <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required disabled={busy} /></label>
      <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={300} disabled={busy} /></label>
      <button className="vfilter" type="submit" disabled={busy || name.trim().length < 2}>{busy ? 'Salvando…' : 'Salvar perfil'}</button>
      <button className="vfilter" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button>
    </form>}
    {error && <p role="alert" className="alert">{error}</p>}
  </div>
}
