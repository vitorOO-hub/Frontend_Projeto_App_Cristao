import { useRef, useState, type FormEvent } from 'react'
import { deleteVideo, editVideo, type VideoOwn } from '../api/videos.ts'
import { CATEGORIES } from '../categories.ts'
import { errorMessage } from '../errorMessage.ts'

export default function OwnVideoActions({ video, onChanged }: { video: VideoOwn; onChanged: () => void }) {
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null)
  const [caption, setCaption] = useState(video.caption)
  const [category, setCategory] = useState(video.category)
  const [reference, setReference] = useState(video.bible_reference ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)

  async function save(event?: FormEvent) {
    event?.preventDefault()
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (mode === 'delete') await deleteVideo(video.id)
      else await editVideo(video.id, { caption: caption.trim(), category, bible_reference: reference.trim() || null })
      setMode(null)
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  function open(next: 'edit' | 'delete') {
    setCaption(video.caption)
    setCategory(video.category)
    setReference(video.bible_reference ?? '')
    setError('')
    setMode(next)
  }

  return <div className="video-management">
    {!mode && <div className="feed-actions">
      <button type="button" className="vfilter" onClick={() => open('edit')}>Editar vídeo</button>
      <button type="button" className="vfilter" onClick={() => open('delete')}>Excluir vídeo</button>
    </div>}
    {mode === 'edit' && <form aria-label="Editar vídeo" onSubmit={(event) => void save(event)}>
      <label>Legenda<textarea value={caption} onChange={(event) => setCaption(event.target.value)} required minLength={1} maxLength={500} disabled={busy} /></label>
      <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)} disabled={busy}>
        {Object.entries(CATEGORIES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select></label>
      <label>Referência bíblica<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} disabled={busy} /></label>
      {video.status === 'approved' && <p>Ao salvar, o vídeo volta para análise e sai do feed público.</p>}
      <button className="vfilter" type="submit" disabled={busy || !caption.trim()}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
      <button className="vfilter" type="button" disabled={busy} onClick={() => setMode(null)}>Cancelar</button>
    </form>}
    {mode === 'delete' && <div role="alertdialog" aria-label="Confirmar exclusão">
      <p>Excluir “{video.caption}”? Esta ação não pode ser desfeita.</p>
      <button className="vfilter" type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Excluindo…' : 'Confirmar exclusão'}</button>
      <button className="vfilter" type="button" disabled={busy} onClick={() => setMode(null)}>Cancelar</button>
    </div>}
    {error && <p role="alert" className="alert">{error}</p>}
  </div>
}
