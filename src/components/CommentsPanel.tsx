import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { comments, createComment, deleteComment } from '../api/comments.ts'
import { errorMessage } from '../errorMessage.ts'
import { usePagedList } from '../usePagedList.ts'
import ListStatus from './ListStatus.tsx'
import BlockButton from './BlockButton.tsx'
import { useVisibilityRevision } from '../visibility.ts'

type Props = { videoId: string; selfId?: string; onCountChange: (delta: number) => void }
export default function CommentsPanel(props: Props) {
  const revision = useVisibilityRevision()
  return <CommentsContent key={`${props.videoId}:${props.selfId ?? 'visitante'}:${revision}`} {...props} />
}
function CommentsContent({ videoId, selfId, onCountChange }: Props) {
  const fetchPage = useCallback((cursor?: string) => comments(videoId, cursor), [videoId])
  const list = usePagedList(fetchPage)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)

  async function mutate(action: () => Promise<void>) {
    if (lock.current || list.loading) return
    lock.current = true
    setBusy(true)
    setError('')
    try { await action() } catch (e) { setError(errorMessage(e)) }
    finally { lock.current = false; setBusy(false) }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!selfId || !text.trim()) return
    void mutate(async () => {
      const result = await createComment(videoId, text.trim())
      list.setItems((items) => items.some((item) => item.id === result.id) ? items : [...items, result])
      setText('')
      onCountChange(1)
    })
  }

  const ordered = [...list.items].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  return <section aria-label="Comentários" className="comments-panel">
    <h2>Comentários</h2>
    <ul className="ulist">
      {ordered.map((comment) => <li key={comment.id} className="uitem">
        <div><Link to={`/usuarios/${comment.author.id}`}><strong>{comment.author.name}</strong></Link><p>{comment.text}</p>
          {selfId === comment.author.id && <button className="vfilter" type="button" disabled={busy || list.loading} onClick={() => void mutate(async () => {
            await deleteComment(comment.id)
            list.setItems((items) => items.filter((item) => item.id !== comment.id))
            onCountChange(-1)
          })}>Remover comentário</button>}
          {selfId && selfId !== comment.author.id && <BlockButton userId={comment.author.id} name={comment.author.name} />}
        </div>
      </li>)}
    </ul>
    <ListStatus loading={list.loading || busy} error={list.error} hasItems={list.items.length > 0} empty="Nenhum comentário ainda." hasMore={list.hasMore} onRetry={() => void list.retry()} onLoadMore={() => void list.loadMore()} />
    {selfId ? <form onSubmit={submit} aria-label="Comentar">
      <label>Seu comentário<textarea value={text} onChange={(event) => setText(event.target.value)} minLength={1} maxLength={1000} required disabled={busy || list.loading} /></label>
      <button className="vfilter" type="submit" disabled={busy || list.loading || !text.trim()}>{busy ? 'Enviando…' : 'Publicar comentário'}</button>
    </form> : <Link to="/login" state={{ from: { pathname: '/feed', search: '', hash: '' } }}>Entre para comentar</Link>}
    {error && <p role="alert" className="alert">{error}</p>}
  </section>
}
