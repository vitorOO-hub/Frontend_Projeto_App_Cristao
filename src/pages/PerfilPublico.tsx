import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { publicUser, userVideos, type UserPublic } from '../api/profile.ts'
import { errorMessage } from '../lib/errorMessage.ts'
import { usePagedList } from '../hooks/usePagedList.ts'
import { useVisibilityRevision } from '../lib/visibility.ts'
import FeedCard from '../components/feed/FeedCard.tsx'
import BlockButton from '../components/profile/BlockButton.tsx'
import ListStatus from '../components/ui/ListStatus.tsx'
import { Brand } from '../components/ui/Layout.tsx'

export default function PerfilPublico({ selfId }: { selfId?: string }) {
  const { id = '' } = useParams()
  const revision = useVisibilityRevision()
  return <PublicContent key={`${id}:${selfId ?? 'visitante'}:${revision}`} id={id} selfId={selfId} />
}
function PublicContent({ id, selfId }: { id: string; selfId?: string }) {
  const [user, setUser] = useState<UserPublic | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    publicUser(id).then((result) => { if (active) setUser(result) }, (e) => { if (active) setError(errorMessage(e)) })
    return () => { active = false }
  }, [id, attempt])
  return <div className="vpage">
    <header className="topbar vtopbar"><Brand /><Link className="glass vback" to="/feed">← Feed</Link></header>
    <main className="glass vpanel feed">
      {error && <div role="alert" className="alert">{error}<button className="vfilter" type="button" onClick={() => { setError(''); setAttempt((n) => n + 1) }}>Tentar de novo</button></div>}
      {!user && !error && <p role="status">Carregando perfil…</p>}
      {user && <>
        <h1>{user.name}</h1>
        {user.username && <p>@{user.username}</p>}
        <p>{user.bio || 'Sem bio ainda.'}</p>
        {selfId && selfId !== id && <BlockButton userId={id} name={user.name} />}
        {selfId === id && <Link to="/perfil">Editar meu perfil e gerenciar meus vídeos</Link>}
        <PublicVideos id={id} selfId={selfId} />
      </>}
    </main>
  </div>
}
function PublicVideos({ id, selfId }: { id: string; selfId?: string }) {
  const fetchPage = useCallback((cursor?: string) => userVideos(id, cursor), [id])
  const list = usePagedList(fetchPage)
  return <section aria-label="Vídeos aprovados do perfil">
    <ul className="feed-list">{list.items.map((video) => <li key={video.id}><FeedCard video={video} selfId={selfId} /></li>)}</ul>
    <ListStatus loading={list.loading} error={list.error} hasItems={list.items.length > 0} empty="Nenhum vídeo aprovado disponível." hasMore={list.hasMore} onRetry={() => void list.retry()} onLoadMore={() => void list.loadMore()} />
  </section>
}
