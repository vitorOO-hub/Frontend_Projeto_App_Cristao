import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { feedVideos } from '../api/feed.ts'
import { CATEGORIES } from '../lib/categories.ts'
import FeedCard from '../components/feed/FeedCard.tsx'
import { Brand } from '../components/ui/Layout.tsx'
import ListStatus from '../components/ui/ListStatus.tsx'
import { usePagedList } from '../hooks/usePagedList.ts'
import { useVisibilityRevision } from '../lib/visibility.ts'

/** Lista de uma categoria; trocar a categoria remonta o componente e recomeça da primeira página. */
function FeedList({ category, selfId }: { category?: string; selfId?: string }) {
  const fetchPage = useCallback((cursor?: string) => feedVideos(category, cursor), [category])
  const { items, loading, error, hasMore, loadMore, retry } = usePagedList(fetchPage)

  return (
    <>
      {items.length > 0 && (
        <ul className="feed-list">
          {items.map((video) => (
            <li key={video.id}>
              <FeedCard video={video} selfId={selfId} />
            </li>
          ))}
        </ul>
      )}
      <ListStatus
        loading={loading}
        error={error}
        hasItems={items.length > 0}
        empty={category ? 'Nenhum vídeo nesta categoria ainda.' : 'Ainda não há vídeos aprovados.'}
        hasMore={hasMore}
        onRetry={() => void retry()}
        onLoadMore={() => void loadMore()}
      />
      {!loading && !error && !hasMore && items.length > 0 && (
        <p className="vstate">Você chegou ao fim. Volte mais tarde para ver novidades.</p>
      )}
    </>
  )
}

/** Feed vertical dos vídeos aprovados, com filtro de categoria. */
export default function Feed({ selfId }: { selfId?: string }) {
  const revision = useVisibilityRevision()
  const [category, setCategory] = useState<string | undefined>()

  return (
    <div className="vpage">
      <header className="topbar vtopbar">
        <Brand />
        <nav className="feed-actions" aria-label="Navegação do feed">
          <Link to="/" className="glass vback">
            ← Início
          </Link>
          {!selfId && (
            <>
              <Link to="/login" state={{ from: { pathname: '/feed', search: '', hash: '' } }} className="glass vback">Entrar</Link>
              <Link to="/cadastro" state={{ from: { pathname: '/feed', search: '', hash: '' } }} className="glass vback">Criar conta</Link>
            </>
          )}
        </nav>
      </header>
      <main className="glass vpanel feed">
        <h1 className="vtitle">Feed</h1>
        <div className="vfilters" role="group" aria-label="Filtrar por categoria">
          <button type="button" className="vfilter" aria-pressed={category === undefined} onClick={() => setCategory(undefined)}>
            Todas
          </button>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <button key={key} type="button" className="vfilter" aria-pressed={category === key} onClick={() => setCategory(key)}>
              {label}
            </button>
          ))}
        </div>
        <FeedList key={`${selfId ?? 'visitante'}:${category ?? 'todas'}:${revision}`} category={category} selfId={selfId} />
      </main>
    </div>
  )
}
